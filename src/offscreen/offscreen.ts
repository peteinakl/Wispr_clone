import { MessageType } from '@/lib/types/messages';
import { AudioRecorder } from '@/lib/audio/recorder';
import { AUDIO_CONSTRAINTS } from '@/shared/constants';
import { blobToBase64 } from '@/shared/utils';

/**
 * Offscreen document for audio recording
 * Service workers cannot access MediaRecorder API, so we use an offscreen document
 */

let recorder: AudioRecorder | null = null;
let stream: MediaStream | null = null;

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
async function handleStartRecording() {
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
    // Log detailed error information
    console.error('[Offscreen] Failed to start recording:', error);
    console.error('[Offscreen] Error name:', error instanceof DOMException ? error.name : 'Unknown');
    console.error('[Offscreen] Error message:', error instanceof Error ? error.message : String(error));

    // Build detailed error message
    let errorMessage = 'Failed to start recording';
    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotAllowedError':
          errorMessage = 'Microphone permission denied. Please allow microphone access in your browser settings.';
          break;
        case 'NotFoundError':
          errorMessage = 'No microphone found. Please connect a microphone and try again.';
          break;
        case 'NotReadableError':
          errorMessage = 'Microphone is already in use by another application.';
          break;
        case 'OverconstrainedError':
          errorMessage = 'Microphone does not support the required settings.';
          break;
        case 'SecurityError':
          errorMessage = 'Microphone access is blocked by browser security settings.';
          break;
        default:
          errorMessage = error.message || errorMessage;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Stop recording and return audio data
 */
async function handleStopRecording() {
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
    console.error('[Offscreen] Failed to stop recording:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to stop recording',
    };
  }
}

console.log('[Offscreen] Offscreen document loaded');
