import { AUDIO_RECORDING_OPTIONS } from '@/shared/constants';

/**
 * Audio recorder using MediaRecorder API
 * Used in offscreen document to capture microphone audio
 */
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream;

  constructor(stream: MediaStream) {
    this.stream = stream;
  }

  /**
   * Start recording audio
   */
  async start(): Promise<void> {
    this.audioChunks = [];

    // Check if the desired MIME type is supported
    if (!MediaRecorder.isTypeSupported(AUDIO_RECORDING_OPTIONS.mimeType)) {
      throw new Error(`MIME type ${AUDIO_RECORDING_OPTIONS.mimeType} not supported`);
    }

    // Create MediaRecorder with webm/opus codec
    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType: AUDIO_RECORDING_OPTIONS.mimeType,
      audioBitsPerSecond: AUDIO_RECORDING_OPTIONS.audioBitsPerSecond,
    });

    // Collect audio data as it becomes available
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    // Start recording (collect data every 100ms)
    this.mediaRecorder.start(100);
  }

  /**
   * Stop recording and return the audio blob
   */
  async stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No active recording'));
        return;
      }

      // Handle stop event
      this.mediaRecorder.onstop = () => {
        // Create audio blob from collected chunks
        const audioBlob = new Blob(this.audioChunks, {
          type: AUDIO_RECORDING_OPTIONS.mimeType,
        });

        // Clean up media stream
        this.stream.getTracks().forEach((track) => track.stop());

        // Reset state
        this.audioChunks = [];
        this.mediaRecorder = null;

        resolve(audioBlob);
      };

      // Handle errors
      this.mediaRecorder.onerror = (event) => {
        reject(new Error(`Recording error: ${event}`));
      };

      // Stop the recording
      this.mediaRecorder.stop();
    });
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.mediaRecorder !== null && this.mediaRecorder.state === 'recording';
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    this.stream.getTracks().forEach((track) => track.stop());
    this.audioChunks = [];
    this.mediaRecorder = null;
  }
}
