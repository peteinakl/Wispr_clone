/**
 * Type guard functions for runtime type checking
 */

/**
 * Check if value is an Error instance
 */
export function isError(e: unknown): e is Error {
  return e instanceof Error;
}

/**
 * Check if value is a DOMException
 */
export function isDOMException(e: unknown): e is DOMException {
  return e instanceof DOMException;
}

/**
 * Check if element is an editable HTML element
 */
export function isEditableHTMLElement(
  element: Element
): element is HTMLInputElement | HTMLTextAreaElement {
  return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement;
}

/**
 * Check if element is contenteditable
 */
export function isContentEditableElement(element: Element): element is HTMLElement {
  return element instanceof HTMLElement && element.isContentEditable;
}
