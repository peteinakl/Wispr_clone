import { MessageType, type RecordingState, type RecordingDataMessage } from '@/lib/types/messages';
import { ReplicateClient } from '@/lib/api/replicate-client';
import { StorageManager } from '@/lib/storage/storage-manager';
import { OFFSCREEN_DOCUMENT_PATH, ERROR_MESSAGES } from '@/shared/constants';
import { base64ToBlob } from '@/shared/utils';

/**
 * Service Worker (Background Script)
 * Orchestrates all extension functionality
 */

// State management
let recordingState: RecordingState = 'idle';
let offscreenDocumentCreated = false;
let currentTabId: number | null = null;

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
  console.log('[ServiceWorker] Toggle recording, current state:', recordingState);

  if (recordingState === 'idle') {
    await startRecording();
  } else if (recordingState === 'recording') {
    await stopRecording();
  }
  // Ignore if processing
}

/**
 * Start recording
 */
async function startRecording() {
  try {
    // Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      throw new Error('No active tab');
    }
    currentTabId = tab.id;

    // Create offscreen document if not exists
    if (!offscreenDocumentCreated) {
      await createOffscreenDocument();
    }

    // Send message to offscreen to start recording
    const response = await chrome.runtime.sendMessage({
      type: MessageType.START_RECORDING,
      target: 'offscreen',
    });

    if (!response?.success) {
      throw new Error(response?.error || 'Failed to start recording');
    }

    // Update state
    recordingState = 'recording';

    // Notify content script to show indicator
    await chrome.tabs.sendMessage(currentTabId, {
      type: MessageType.RECORDING_STARTED,
    });

    console.log('[ServiceWorker] Recording started');
  } catch (error) {
    console.error('[ServiceWorker] Failed to start recording:', error);
    recordingState = 'idle';

    if (currentTabId) {
      await notifyError(error instanceof Error ? error.message : 'Failed to start recording');
    }
  }
}

/**
 * Stop recording
 */
async function stopRecording() {
  try {
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

    console.log('[ServiceWorker] Audio received, starting transcription');

    // Convert base64 to Blob
    const audioBlob = base64ToBlob(response.audioData, response.mimeType || 'audio/webm;codecs=opus');

    // Transcribe audio
    await transcribeAudio(audioBlob);
  } catch (error) {
    console.error('[ServiceWorker] Failed to stop recording:', error);
    recordingState = 'idle';

    if (currentTabId) {
      await notifyError(error instanceof Error ? error.message : 'Failed to stop recording');
    }
  }
}

/**
 * Transcribe audio using Whisper API
 */
async function transcribeAudio(audioBlob: Blob) {
  try {
    // Get API key
    const apiKey = await StorageManager.getApiKey();
    if (!apiKey) {
      throw new Error(ERROR_MESSAGES.NO_API_KEY);
    }

    // Call Replicate API
    const client = new ReplicateClient(apiKey);
    const transcription = await client.transcribe(audioBlob);

    console.log('[ServiceWorker] Transcription complete:', transcription);

    // Send transcription to content script
    if (currentTabId) {
      await chrome.tabs.sendMessage(currentTabId, {
        type: MessageType.TRANSCRIPTION_COMPLETE,
        data: { text: transcription },
      });
    }

    // Reset state
    recordingState = 'idle';
    currentTabId = null;
  } catch (error) {
    console.error('[ServiceWorker] Transcription failed:', error);
    recordingState = 'idle';

    if (currentTabId) {
      const errorMessage = error instanceof Error ? error.message : 'Transcription failed';
      await notifyError(errorMessage);
    }

    currentTabId = null;
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
    console.error('[ServiceWorker] Failed to create offscreen document:', error);
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
    console.error('[ServiceWorker] Failed to notify error:', err);
  }
}

/**
 * Handle messages from other components
 */
function handleMessage(message: any, sender: any, sendResponse: any) {
  // Handle messages directed to service worker if needed
  if (message.target === 'service-worker') {
    // Future: Handle messages from popup, etc.
  }
  // Don't return true - we're not sending a response
  // Only return true if you'll actually call sendResponse() asynchronously
}

console.log('[ServiceWorker] Service worker loaded');
