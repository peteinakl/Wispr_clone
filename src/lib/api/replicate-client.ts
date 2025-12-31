import { REPLICATE_API_BASE_URL, POLLING_CONFIG } from '@/shared/constants';
import { blobToBase64, sleep } from '@/shared/utils';

interface Prediction {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: {
    transcription?: string;
  };
  error?: string;
}

/**
 * Client for Replicate Whisper API
 */
export class ReplicateClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Transcribe audio using Whisper API
   * @param audioBlob - Audio blob to transcribe (webm/opus format)
   * @returns Transcribed text
   */
  async transcribe(audioBlob: Blob): Promise<string> {
    // Convert blob to base64 data URI
    const base64Audio = await blobToBase64(audioBlob);
    const dataUri = `data:${audioBlob.type};base64,${base64Audio}`;

    // Create prediction
    const prediction = await this.createPrediction(dataUri);

    // Poll for completion
    const result = await this.pollPrediction(prediction.id);

    // Extract transcription from output
    const transcription = result.output?.transcription;
    if (!transcription) {
      throw new Error('Empty transcription');
    }

    return transcription.trim();
  }

  /**
   * Create a new prediction
   */
  private async createPrediction(audioDataUri: string): Promise<Prediction> {
    const response = await fetch(`${REPLICATE_API_BASE_URL}/predictions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: '4d50797290df275329f202e48c76360b3f22b08d28c196cbc54600319435f8d2',
        input: {
          audio: audioDataUri,
          model: 'large-v3',
          language: 'en',
          translate: false,
          temperature: 0,
          transcription: 'plain text',
          suppress_tokens: '-1',
          logprob_threshold: -1.0,
          no_speech_threshold: 0.6,
          condition_on_previous_text: true,
          compression_ratio_threshold: 2.4,
          temperature_increment_on_fallback: 0.2,
        },
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid API key');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded');
      } else {
        const error = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(`API error: ${error.detail || response.statusText}`);
      }
    }

    return response.json();
  }

  /**
   * Poll for prediction completion
   */
  private async pollPrediction(predictionId: string): Promise<Prediction> {
    for (let attempt = 0; attempt < POLLING_CONFIG.MAX_ATTEMPTS; attempt++) {
      const response = await fetch(
        `${REPLICATE_API_BASE_URL}/predictions/${predictionId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Polling error: ${response.statusText}`);
      }

      const prediction: Prediction = await response.json();

      if (prediction.status === 'succeeded') {
        return prediction;
      }

      if (prediction.status === 'failed') {
        throw new Error(`Transcription failed: ${prediction.error || 'Unknown error'}`);
      }

      if (prediction.status === 'canceled') {
        throw new Error('Transcription was canceled');
      }

      // Status is 'starting' or 'processing', wait and retry
      await sleep(POLLING_CONFIG.INTERVAL_MS);
    }

    throw new Error('Transcription timeout');
  }
}
