import { MessageType, type RecordingState, type RecordingDataMessage } from '@/lib/types/messages';
import { ReplicateClient } from '@/lib/api/replicate-client';
import { StorageManager } from '@/lib/storage/storage-manager';
import { TextRefinementService } from '@/lib/services/text-refinement';
import { OFFSCREEN_DOCUMENT_PATH, ERROR_MESSAGES, TIMING, AUDIO_VALIDATION } from '@/shared/constants';
import { base64ToBlob } from '@/shared/utils';
import { handleError } from '@/lib/error-handling/error-handler';

/**
 * Service Worker (Background Script)
 * Orchestrates all extension functionality
 */

// State management
let recordingState: RecordingState = 'idle';
let offscreenDocumentCreated = false;
let currentTabId: number | null = null;
let keepaliveInterval: ReturnType<typeof setInterval> | null = null;

// Event listeners MUST be registered at top level (not async)
chrome.commands.onCommand.addListener(handleCommand);
chrome.runtime.onMessage.addListener(handleMessage);

/**
 * Handle keyboard command
 */
function handleCommand(command: string) {
  console.log('[ServiceWorker] Command received:', command);
  if (command === 'toggle-recording') {
    toggleRecording().catch(console.error);
  }
}

/**
 * Toggle recording on/off
 */
async function toggleRecording() {
  console.log('[ServiceWorker] Toggle recording called, current state:', recordingState);

  if (recordingState === 'idle') {
    console.log('[ServiceWorker] Starting recording...');
    await startRecording();
  } else if (recordingState === 'recording') {
    console.log('[ServiceWorker] Stopping recording...');
    await stopRecording();
  } else {
    console.log('[ServiceWorker] Ignoring toggle - state is:', recordingState);
  }
}

/**
 * Ensure content script is injected in the tab
 */
async function ensureContentScriptInjected(tabId: number): Promise<void> {
  try {
    // Try to ping the content script
    await chrome.tabs.sendMessage(tabId, { type: 'PING' });
    console.log('[ServiceWorker] Content script already injected');
  } catch (error) {
    // Content script not present, inject it
    console.log('[ServiceWorker] Injecting content script...');
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js'],
      });
      // Wait for the content script to initialize
      await new Promise(resolve => setTimeout(resolve, TIMING.INITIALIZATION_DELAY_MS));
      console.log('[ServiceWorker] Content script injected');
    } catch (injectError) {
      console.warn('[ServiceWorker] Cannot inject content script on this page:', injectError);
      // This is expected on chrome://, extension pages, etc.
    }
  }
}

/**
 * Validate active tab is suitable for recording
 */
async function validateActiveTab(): Promise<chrome.tabs.Tab> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  console.log('[ServiceWorker] Active tab:', tab?.url, 'ID:', tab?.id);

  if (!tab?.id) {
    throw new Error('No active tab');
  }

  // Skip chrome:// URLs
  if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://')) {
    throw new Error('Cannot record on Chrome internal pages. Please switch to a regular webpage (like google.com)');
  }

  return tab;
}

/**
 * Initialize recording services (content script and offscreen document)
 */
async function initializeRecordingServices(tabId: number): Promise<void> {
  await ensureContentScriptInjected(tabId);

  if (!offscreenDocumentCreated) {
    await createOffscreenDocument();
    // Wait for offscreen document to be ready
    await new Promise(resolve => setTimeout(resolve, TIMING.INITIALIZATION_DELAY_MS));
  }
}

/**
 * Send keepalive ping to offscreen document to prevent Chrome from suspending it
 */
function sendKeepalivePing(): void {
  try {
    chrome.runtime.sendMessage({
      type: 'KEEPALIVE_PING',
      target: 'offscreen',
    }).catch(() => {
      // Ignore errors - offscreen document might be recreating
      console.log('[ServiceWorker] Keepalive ping failed (expected if offscreen document is restarting)');
    });
  } catch (error) {
    // Ignore errors during keepalive
  }
}

/**
 * Start keepalive mechanism to prevent offscreen document suspension
 */
function startKeepalive(): void {
  // Clear any existing interval
  if (keepaliveInterval) {
    clearInterval(keepaliveInterval);
  }

  // Send a keepalive ping at regular intervals during recording
  // This prevents Chrome from suspending the offscreen document after 20-30 seconds
  console.log('[ServiceWorker] Starting keepalive pings (every', TIMING.KEEPALIVE_INTERVAL_MS, 'ms)');
  keepaliveInterval = setInterval(sendKeepalivePing, TIMING.KEEPALIVE_INTERVAL_MS);

  // Send immediate ping
  sendKeepalivePing();
}

/**
 * Stop keepalive mechanism
 */
function stopKeepalive(): void {
  if (keepaliveInterval) {
    console.log('[ServiceWorker] Stopping keepalive pings');
    clearInterval(keepaliveInterval);
    keepaliveInterval = null;
  }
}

/**
 * Start recording in offscreen document
 */
async function startOffscreenRecording(): Promise<void> {
  const response = await chrome.runtime.sendMessage({
    type: MessageType.START_RECORDING,
    target: 'offscreen',
  });

  if (!response?.success) {
    throw new Error(response?.error || 'Failed to start recording');
  }

  // Start keepalive to prevent Chrome from suspending the offscreen document
  startKeepalive();
}

/**
 * Notify content script that recording has started
 */
async function notifyRecordingStart(tabId: number): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: MessageType.RECORDING_STARTED,
    });
  } catch (error) {
    console.warn('[ServiceWorker] Content script not ready:', error);
    // Continue anyway - user will see indicator when content script loads
  }
}

/**
 * Start recording audio
 */
async function startRecording() {
  try {
    const tab = await validateActiveTab();
    currentTabId = tab.id!;

    await initializeRecordingServices(currentTabId);
    await startOffscreenRecording();

    recordingState = 'recording';
    await notifyRecordingStart(currentTabId);

    console.log('[ServiceWorker] Recording started');
  } catch (error) {
    const errorMessage = handleError('ServiceWorker - Start Recording', error);
    recordingState = 'idle';
    stopKeepalive(); // Stop keepalive on error

    if (currentTabId) {
      await notifyError(errorMessage);
    }
  }
}

/**
 * Stop recording
 */
async function stopRecording() {
  try {
    // Stop keepalive immediately to prevent unnecessary pings
    stopKeepalive();

    if (!currentTabId) {
      throw new Error('No active tab');
    }

    // Update state
    recordingState = 'processing';

    // Notify content script
    await chrome.tabs.sendMessage(currentTabId, {
      type: MessageType.RECORDING_STOPPED,
    });

    // Send message to offscreen to stop and get audio data
    const response: RecordingDataMessage['data'] = await chrome.runtime.sendMessage({
      type: MessageType.STOP_RECORDING,
      target: 'offscreen',
    });

    if (!response?.success || !response.audioData) {
      throw new Error(response?.error || 'Failed to get audio data');
    }

    console.log('[ServiceWorker] Audio received, base64 length:', response.audioData.length);

    // Convert base64 to Blob
    const audioBlob = base64ToBlob(response.audioData, response.mimeType || 'audio/webm;codecs=opus');
    console.log('[ServiceWorker] Audio blob created, size:', audioBlob.size, 'bytes, type:', audioBlob.type);

    // Validate audio size before sending to Whisper
    // At 128kbps, we expect ~16KB per second of audio (128000 bits/sec ÷ 8 bits/byte)
    if (audioBlob.size < AUDIO_VALIDATION.MIN_SIZE_BYTES) {
      console.error('[ServiceWorker] Audio blob is too small:', audioBlob.size, 'bytes');
      throw new Error('Recording failed: audio data is too small. Please try again.');
    }

    console.log('[ServiceWorker] Audio size OK, estimated duration:', (audioBlob.size / AUDIO_VALIDATION.BYTES_PER_SECOND).toFixed(1), 'seconds');

    // Transcribe audio
    await transcribeAudio(audioBlob);
  } catch (error) {
    const errorMessage = handleError('ServiceWorker - Stop Recording', error);
    recordingState = 'idle';
    stopKeepalive(); // Ensure keepalive is stopped on error

    if (currentTabId) {
      await notifyError(errorMessage);
    }
  }
}

/**
 * Get transcription from Whisper API
 */
async function getTranscription(audioBlob: Blob): Promise<string> {
  const apiKey = await StorageManager.getApiKey();
  if (!apiKey) {
    throw new Error(ERROR_MESSAGES.NO_API_KEY);
  }

  const client = new ReplicateClient(apiKey);
  const transcription = await client.transcribe(audioBlob);

  console.log('[ServiceWorker] Transcription complete:', transcription);
  return transcription;
}

/**
 * Apply Claude refinement if available, fallback to raw transcription
 */
async function applyRefinementIfAvailable(transcription: string): Promise<string> {
  const claudeApiKey = await StorageManager.getClaudeApiKey();

  if (!claudeApiKey) {
    console.log('[ServiceWorker] No Claude API key, using raw transcription');
    return transcription;
  }

  try {
    // Notify content script that refinement started
    if (currentTabId) {
      await chrome.tabs.sendMessage(currentTabId, {
        type: MessageType.REFINEMENT_STARTED,
      });
    }

    const writingStyle = await StorageManager.getWritingStyle();
    const refinementService = new TextRefinementService();
    const refinedText = await refinementService.refineTranscription(
      transcription,
      writingStyle,
      claudeApiKey
    );

    console.log('[ServiceWorker] Text refinement complete');
    return refinedText;
  } catch (error) {
    handleError('ServiceWorker - Refinement', error);
    return transcription; // Graceful degradation
  }
}

/**
 * Notify content script with final transcribed text
 */
async function notifyTranscriptionComplete(text: string): Promise<void> {
  if (currentTabId) {
    await chrome.tabs.sendMessage(currentTabId, {
      type: MessageType.TRANSCRIPTION_COMPLETE,
      data: { text },
    });
  }
}

/**
 * Reset recording state and cleanup
 */
function resetRecordingState(): void {
  recordingState = 'idle';
  currentTabId = null;
}

/**
 * Transcribe audio using Whisper API and optionally refine with Claude
 */
async function transcribeAudio(audioBlob: Blob) {
  try {
    const transcription = await getTranscription(audioBlob);
    const finalText = await applyRefinementIfAvailable(transcription);
    await notifyTranscriptionComplete(finalText);
    resetRecordingState();
  } catch (error) {
    const errorMessage = handleError('ServiceWorker - Transcription', error);

    if (currentTabId) {
      await notifyError(errorMessage);
    }

    resetRecordingState();
  }
}

/**
 * Create offscreen document for audio recording
 */
async function createOffscreenDocument() {
  try {
    // Check if offscreen document already exists
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT' as any],
    });

    if (existingContexts.length > 0) {
      console.log('[ServiceWorker] Offscreen document already exists');
      offscreenDocumentCreated = true;
      return;
    }

    // Create offscreen document
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_DOCUMENT_PATH,
      reasons: ['USER_MEDIA' as any],
      justification: 'Recording audio for voice-to-text transcription',
    });

    offscreenDocumentCreated = true;
    console.log('[ServiceWorker] Offscreen document created');
  } catch (error) {
    handleError('ServiceWorker - Create Offscreen Document', error);
    throw error;
  }
}

/**
 * Notify content script of error
 */
async function notifyError(error: string) {
  if (!currentTabId) return;

  try {
    await chrome.tabs.sendMessage(currentTabId, {
      type: MessageType.TRANSCRIPTION_ERROR,
      data: { error },
    });
  } catch (err) {
    console.warn('[ServiceWorker] Failed to notify error (content script may not be ready):', err);
  }
}

/**
 * Handle messages from other components
 */
function handleMessage(
  message: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
): void | boolean {
  // Handle messages directed to service worker if needed
  if (message.target === 'service-worker') {
    // Future: Handle messages from popup, etc.
  }
  // Don't return true - we're not sending a response
  // Only return true if you'll actually call sendResponse() asynchronously
}

console.log('[ServiceWorker] Service worker loaded');
