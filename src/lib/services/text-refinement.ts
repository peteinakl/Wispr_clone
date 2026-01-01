import { ClaudeClient } from '@/lib/api/claude-client';
import { WritingStyle, WRITING_STYLE_PROMPTS } from '@/lib/types/settings';

/**
 * Service for refining transcribed text using Claude API
 */
export class TextRefinementService {
  /**
   * Refine transcribed text with the specified writing style
   * @param text - Raw transcribed text from Whisper
   * @param style - Writing style to apply
   * @param apiKey - Claude API key
   * @returns Refined text
   */
  async refineTranscription(
    text: string,
    style: WritingStyle,
    apiKey: string
  ): Promise<string> {
    // Validate input
    if (!text || text.trim().length === 0) {
      throw new Error('Cannot refine empty text');
    }

    if (!apiKey || apiKey.trim().length === 0) {
      throw new Error('Claude API key is required');
    }

    // Get system prompt for the specified style
    const systemPrompt = WRITING_STYLE_PROMPTS[style];

    // Create Claude client and refine text
    const client = new ClaudeClient(apiKey);
    const refinedText = await client.refineText(text, systemPrompt);

    return refinedText;
  }
}
