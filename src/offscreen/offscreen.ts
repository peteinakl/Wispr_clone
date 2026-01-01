import { MessageType } from '@/lib/types/messages';
import { AudioRecorder } from '@/lib/audio/recorder';
import { AUDIO_CONSTRAINTS } from '@/shared/constants';
import { blobToBase64 } from '@/shared/utils';
import { logError } from '@/lib/error-handling/error-handler';

/**
 * Response interface for recording operations
 */
interface RecordingResponse {
  success: boolean;
  audioData?: string;
  mimeType?: string;
  error?: string;
}

/**
 * Offscreen document for audio recording
 * Service workers cannot access MediaRecorder API, so we use an offscreen document
 */

let recorder: AudioRecorder | null = null;
let stream: MediaStream | null = null;

/**
 * Map media device errors to user-friendly messages
 */
function mapMediaErrorToMessage(error: unknown): string {
  if (!(error instanceof DOMException)) {
    return error instanceof Error ? error.message : 'Failed to start recording';
  }

  switch (error.name) {
    case 'NotAllowedError':
      return 'Microphone permission denied. Please allow microphone access in your browser settings.';
    case 'NotFoundError':
      return 'No microphone found. Please connect a microphone and try again.';
    case 'NotReadableError':
      return 'Microphone is already in use by another application.';
    case 'OverconstrainedError':
      return 'Microphone does not support the required settings.';
    case 'SecurityError':
      return 'Microphone access is blocked by browser security settings.';
    default:
      return error.message || 'Failed to start recording';
  }
}

// Listen for messages from service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Only handle messages targeted to offscreen
  if (message.target !== 'offscreen') {
    return;
  }

  switch (message.type) {
    case MessageType.START_RECORDING:
      handleStartRecording().then(sendResponse);
      break;
    case MessageType.STOP_RECORDING:
      handleStopRecording().then(sendResponse);
      break;
  }

  // Return true to indicate async response
  return true;
});

/**
 * Start recording audio from microphone
 */
async function handleStartRecording(): Promise<RecordingResponse> {
  try {
    console.log('[Offscreen] Requesting microphone access...');
    console.log('[Offscreen] Audio constraints:', AUDIO_CONSTRAINTS);

    // Request microphone permission
    stream = await navigator.mediaDevices.getUserMedia(AUDIO_CONSTRAINTS);

    console.log('[Offscreen] Microphone access granted, stream:', stream);

    // Create recorder
    recorder = new AudioRecorder(stream);
    await recorder.start();

    console.log('[Offscreen] Recording started successfully');
    return { success: true };
  } catch (error) {
    logError(
      'Offscreen - Start Recording',
      error,
      'Error name:', error instanceof DOMException ? error.name : 'Unknown'
    );

    return {
      success: false,
      error: mapMediaErrorToMessage(error),
    };
  }
}

/**
 * Stop recording and return audio data
 */
async function handleStopRecording(): Promise<RecordingResponse> {
  if (!recorder) {
    return {
      success: false,
      error: 'No active recording',
    };
  }

  try {
    // Stop recording and get audio blob
    const audioBlob = await recorder.stop();

    // Convert Blob to base64 for message passing
    const base64Audio = await blobToBase64(audioBlob);

    console.log('[Offscreen] Recording stopped, audio size:', audioBlob.size, 'bytes');

    // Clean up
    recorder = null;
    stream = null;

    return {
      success: true,
      audioData: base64Audio,
      mimeType: audioBlob.type,
    };
  } catch (error) {
    logError('Offscreen - Stop Recording', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to stop recording',
    };
  }
}

console.log('[Offscreen] Offscreen document loaded');
