import { STORAGE_KEYS } from '@/shared/constants';

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
}
