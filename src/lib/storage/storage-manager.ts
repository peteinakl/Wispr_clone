import { STORAGE_KEYS } from '@/shared/constants';
import { WritingStyle, type IntelligenceSettings } from '@/lib/types/settings';

/**
 * Storage manager for Chrome extension storage
 * Uses chrome.storage.sync for API key (syncs across user's Chrome instances)
 */
export class StorageManager {
  /**
   * Get the Replicate API key from storage
   */
  static async getApiKey(): Promise<string | null> {
    const result = await chrome.storage.sync.get([STORAGE_KEYS.API_KEY]);
    return result[STORAGE_KEYS.API_KEY] || null;
  }

  /**
   * Save the Replicate API key to storage
   */
  static async setApiKey(apiKey: string): Promise<void> {
    await chrome.storage.sync.set({
      [STORAGE_KEYS.API_KEY]: apiKey,
    });
  }

  /**
   * Remove the API key from storage
   */
  static async clearApiKey(): Promise<void> {
    await chrome.storage.sync.remove([STORAGE_KEYS.API_KEY]);
  }

  /**
   * Check if API key is configured
   */
  static async hasApiKey(): Promise<boolean> {
    const apiKey = await this.getApiKey();
    return apiKey !== null && apiKey.length > 0;
  }

  /**
   * Get the Claude API key from storage
   */
  static async getClaudeApiKey(): Promise<string | null> {
    const result = await chrome.storage.sync.get([STORAGE_KEYS.CLAUDE_API_KEY]);
    return result[STORAGE_KEYS.CLAUDE_API_KEY] || null;
  }

  /**
   * Save the Claude API key to storage
   */
  static async setClaudeApiKey(apiKey: string): Promise<void> {
    await chrome.storage.sync.set({
      [STORAGE_KEYS.CLAUDE_API_KEY]: apiKey,
    });
  }

  /**
   * Get the writing style preference
   */
  static async getWritingStyle(): Promise<WritingStyle> {
    const result = await chrome.storage.sync.get([STORAGE_KEYS.WRITING_STYLE]);
    return result[STORAGE_KEYS.WRITING_STYLE] || WritingStyle.PROFESSIONAL;
  }

  /**
   * Set the writing style preference
   */
  static async setWritingStyle(style: WritingStyle): Promise<void> {
    await chrome.storage.sync.set({
      [STORAGE_KEYS.WRITING_STYLE]: style,
    });
  }

  /**
   * Check if Claude integration is configured
   */
  static async hasClaudeApiKey(): Promise<boolean> {
    const apiKey = await this.getClaudeApiKey();
    return apiKey !== null && apiKey.length > 0;
  }

  /**
   * Get all intelligence settings at once (optimization)
   */
  static async getIntelligenceSettings(): Promise<IntelligenceSettings> {
    const result = await chrome.storage.sync.get([
      STORAGE_KEYS.CLAUDE_API_KEY,
      STORAGE_KEYS.WRITING_STYLE,
    ]);

    return {
      claudeApiKey: result[STORAGE_KEYS.CLAUDE_API_KEY] || null,
      writingStyle: result[STORAGE_KEYS.WRITING_STYLE] || WritingStyle.PROFESSIONAL,
      intelligenceEnabled: !!result[STORAGE_KEYS.CLAUDE_API_KEY],
    };
  }
}
