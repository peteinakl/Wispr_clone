/**
 * Utility functions
 */

/**
 * Convert a Blob to base64 string
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // Remove data URL prefix (e.g., "data:audio/webm;base64,")
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert base64 string to Blob
 */
export function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyError(error: Error | string): string {
  const errorMessage = typeof error === 'string' ? error : error.message;

  // Map common errors to user-friendly messages
  const errorMap: Record<string, string> = {
    'Invalid API key': 'Please check your API key in settings',
    'Rate limit exceeded': 'Too many requests, please wait',
    'NotAllowedError': 'Microphone permission denied',
    'NotFoundError': 'Microphone not found',
    'NotReadableError': 'Microphone is being used by another application',
  };

  return errorMap[errorMessage] || 'Something went wrong';
}

/**
 * Handle API error responses consistently
 * @param response - Fetch response object
 * @param context - Context string for error messages (e.g., 'Replicate API', 'Claude API')
 * @throws Error with user-friendly message
 */
export async function handleApiError(response: Response, context: string): Promise<never> {
  if (response.status === 401) {
    throw new Error('Invalid API key');
  } else if (response.status === 429) {
    throw new Error('Rate limit exceeded');
  } else {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(`${context} error: ${error.detail || response.statusText}`);
  }
}

/**
 * Check if an element is editable (input, textarea, or contenteditable)
 * @param element - DOM element to check
 * @returns true if element accepts text input
 */
export function isEditableElement(element: Element | null): element is HTMLInputElement | HTMLTextAreaElement | HTMLElement {
  if (!element) return false;

  // Check for input elements
  if (element instanceof HTMLInputElement) {
    const editableInputTypes = ['text', 'email', 'search', 'url', 'tel', 'password'];
    return editableInputTypes.includes(element.type);
  }

  // Check for textarea
  if (element instanceof HTMLTextAreaElement) {
    return true;
  }

  // Check for contenteditable
  if (element instanceof HTMLElement && element.isContentEditable) {
    return true;
  }

  return false;
}

/**
 * Escape HTML special characters to prevent XSS
 * @param text - Text to escape
 * @returns Escaped text safe for HTML insertion
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
