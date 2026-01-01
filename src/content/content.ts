import { MessageType } from '@/lib/types/messages';
import { TextInjector } from './text-injector';
import { FloatingIndicator } from './floating-indicator';
import { TIMING } from '@/shared/constants';

/**
 * Content Script
 * Handles text injection and UI in the active tab
 */

let indicator: FloatingIndicator | null = null;
let textInjector: TextInjector | null = null;
let activeElement: HTMLElement | null = null;

// Listen for messages from service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Content] Message received:', message.type);

  // Handle PING for content script detection
  if (message.type === 'PING') {
    sendResponse({ success: true });
    return true;
  }

  switch (message.type) {
    case MessageType.RECORDING_STARTED:
      handleRecordingStarted();
      break;
    case MessageType.RECORDING_STOPPED:
      handleRecordingStopped();
      break;
    case MessageType.REFINEMENT_STARTED:
      handleRefinementStarted();
      break;
    case MessageType.TRANSCRIPTION_COMPLETE:
      handleTranscription(message.data.text);
      break;
    case MessageType.TRANSCRIPTION_ERROR:
      handleError(message.data.error);
      break;
  }

  // Don't return true - we're not sending a response
  // Returning true would indicate we'll call sendResponse() asynchronously
});

/**
 * Handle recording started
 */
function handleRecordingStarted() {
  console.log('[Content] Recording started');

  // Save reference to currently focused element
  activeElement = document.activeElement as HTMLElement;

  // Verify element is editable
  if (!activeElement || !isEditableElement(activeElement)) {
    console.warn('[Content] Active element is not editable');
    // Could notify service worker to cancel, but for MVP we'll continue
    // The user can still see the indicator and stop recording
  }

  // Show floating indicator
  if (!indicator) {
    indicator = new FloatingIndicator();
  }
  indicator.show();

  // Initialize text injector for current element
  if (activeElement && isEditableElement(activeElement)) {
    textInjector = new TextInjector(activeElement);
    textInjector.saveCursorPosition();
    console.log('[Content] Cursor position saved');
  }
}

/**
 * Handle recording stopped
 */
function handleRecordingStopped() {
  console.log('[Content] Recording stopped, processing...');

  if (indicator) {
    indicator.showProcessing();
  }
}

/**
 * Handle refinement started
 */
function handleRefinementStarted() {
  console.log('[Content] Text refinement started');

  if (indicator) {
    indicator.showRefining();
  }
}

/**
 * Handle transcription complete
 */
function handleTranscription(text: string) {
  console.log('[Content] Transcription complete:', text);

  // Hide indicator
  if (indicator) {
    indicator.hide();
    indicator = null;
  }

  // Insert text if we have a valid injector
  if (textInjector && activeElement && isEditableElement(activeElement)) {
    textInjector.insertText(text);
    console.log('[Content] Text inserted successfully');
  } else {
    console.warn('[Content] Cannot insert text - no valid text field');
  }

  // Cleanup
  textInjector = null;
  activeElement = null;
}

/**
 * Handle transcription error
 */
function handleError(error: string) {
  console.error('[Content] Transcription error:', error);

  // Show error in indicator
  if (!indicator) {
    indicator = new FloatingIndicator();
  }
  indicator.showError(error);

  // Auto-hide error after duration
  setTimeout(() => {
    if (indicator) {
      indicator.hide();
      indicator = null;
    }
  }, TIMING.ERROR_DISPLAY_DURATION_MS);

  // Cleanup
  textInjector = null;
  activeElement = null;
}

/**
 * Check if an element is editable
 */
function isEditableElement(element: HTMLElement): boolean {
  // Check for input elements
  if (element instanceof HTMLInputElement) {
    // Only certain input types are editable
    const editableTypes = [
      'text',
      'email',
      'password',
      'search',
      'tel',
      'url',
      'number',
    ];
    return (
      editableTypes.includes(element.type) &&
      !element.disabled &&
      !element.readOnly
    );
  }

  // Check for textarea
  if (element instanceof HTMLTextAreaElement) {
    return !element.disabled && !element.readOnly;
  }

  // Check for contenteditable
  if (element.isContentEditable) {
    return true;
  }

  return false;
}

console.log('[Content] Content script loaded');
