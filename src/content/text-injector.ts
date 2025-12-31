/**
 * Text injector for inserting transcribed text into various element types
 * Handles: input, textarea, and contenteditable elements
 */

interface SavedSelection {
  start: number;
  end: number;
  range?: Range;
}

export class TextInjector {
  private element: HTMLElement;
  private savedSelection: SavedSelection | null = null;

  constructor(element: HTMLElement) {
    this.element = element;
  }

  /**
   * Save the current cursor position/selection
   */
  saveCursorPosition(): void {
    if (
      this.element instanceof HTMLInputElement ||
      this.element instanceof HTMLTextAreaElement
    ) {
      // Save selection for input/textarea
      this.savedSelection = {
        start: this.element.selectionStart || 0,
        end: this.element.selectionEnd || 0,
      };
    } else if (this.element.isContentEditable) {
      // Save selection for contenteditable
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        this.savedSelection = {
          start: 0,
          end: 0,
          range: selection.getRangeAt(0).cloneRange(),
        };
      }
    }
  }

  /**
   * Insert text at the saved cursor position
   */
  insertText(text: string): void {
    if (
      this.element instanceof HTMLInputElement ||
      this.element instanceof HTMLTextAreaElement
    ) {
      this.insertIntoInputElement(text);
    } else if (this.element.isContentEditable) {
      this.insertIntoContentEditable(text);
    }
  }

  /**
   * Insert text into input or textarea element
   */
  private insertIntoInputElement(text: string): void {
    if (!this.savedSelection) return;

    const element = this.element as HTMLInputElement | HTMLTextAreaElement;
    const { start, end } = this.savedSelection;

    // Get current value
    const currentValue = element.value;

    // Insert text at saved position (replace selection if any)
    const newValue =
      currentValue.slice(0, start) + text + currentValue.slice(end);

    // Update value
    element.value = newValue;

    // Set cursor after inserted text
    const newCursorPos = start + text.length;
    element.setSelectionRange(newCursorPos, newCursorPos);

    // Trigger input event for framework reactivity
    element.dispatchEvent(new Event('input', { bubbles: true }));

    // Focus element
    element.focus();

    console.log('[TextInjector] Text inserted into input/textarea');
  }

  /**
   * Insert text into contenteditable element
   */
  private insertIntoContentEditable(text: string): void {
    if (!this.savedSelection?.range) return;

    const selection = window.getSelection();
    if (!selection) return;

    try {
      // Restore saved range
      selection.removeAllRanges();
      selection.addRange(this.savedSelection.range);

      // Delete existing selection content
      this.savedSelection.range.deleteContents();

      // Create text node
      const textNode = document.createTextNode(text);

      // Insert text node
      this.savedSelection.range.insertNode(textNode);

      // Move cursor to end of inserted text
      this.savedSelection.range.setStartAfter(textNode);
      this.savedSelection.range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(this.savedSelection.range);

      // Trigger input event for framework reactivity
      this.element.dispatchEvent(new Event('input', { bubbles: true }));

      // Focus element
      this.element.focus();

      console.log('[TextInjector] Text inserted into contenteditable');
    } catch (error) {
      console.error('[TextInjector] Failed to insert into contenteditable:', error);
    }
  }
}
