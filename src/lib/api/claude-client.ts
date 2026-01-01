import {
  CLAUDE_API_BASE_URL,
  CLAUDE_API_VERSION,
  CLAUDE_MODEL,
  CLAUDE_MAX_TOKENS,
  CLAUDE_TEMPERATURE,
} from '@/shared/constants';
import { handleApiError } from '@/shared/utils';
import { WritingStyle } from '@/lib/types/settings';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{
    type: 'text';
    text: string;
  }>;
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Client for Claude API (Anthropic)
 */
export class ClaudeClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Refine transcribed text using Claude API
   * @param text - Raw transcribed text from Whisper
   * @param systemPrompt - System prompt for the style
   * @returns Refined text
   */
  async refineText(text: string, systemPrompt: string): Promise<string> {
    const response = await fetch(`${CLAUDE_API_BASE_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': CLAUDE_API_VERSION,
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: CLAUDE_MAX_TOKENS,
        temperature: CLAUDE_TEMPERATURE,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Refine this voice-transcribed text:\n\n${text}`,
          },
        ] as ClaudeMessage[],
      }),
    });

    if (!response.ok) {
      await handleApiError(response, 'Claude API');
    }

    const result: ClaudeResponse = await response.json();

    // Extract refined text from response
    const refinedText = result.content[0]?.text;
    if (!refinedText) {
      throw new Error('Empty response from Claude');
    }

    return refinedText.trim();
  }
}
