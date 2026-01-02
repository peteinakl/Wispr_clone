import { REPLICATE_API_BASE_URL, POLLING_CONFIG, WHISPER_MODEL_VERSION_HASH, TIMING } from '@/shared/constants';
import { blobToBase64, sleep, handleApiError } from '@/shared/utils';

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
   * Fetch with timeout using AbortController
   */
  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMING.API_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      }
      throw error;
    }
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
    const response = await this.fetchWithTimeout(`${REPLICATE_API_BASE_URL}/predictions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: WHISPER_MODEL_VERSION_HASH,
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
      await handleApiError(response, 'Replicate API');
    }

    return response.json();
  }

  /**
   * Poll for prediction completion
   */
  private async pollPrediction(predictionId: string): Promise<Prediction> {
    for (let attempt = 0; attempt < POLLING_CONFIG.MAX_ATTEMPTS; attempt++) {
      const response = await this.fetchWithTimeout(
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
