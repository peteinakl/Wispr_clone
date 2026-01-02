import { AUDIO_RECORDING_OPTIONS, TIMING, AUDIO_VALIDATION } from '@/shared/constants';

/**
 * Audio recorder using MediaRecorder API
 * Used in offscreen document to capture microphone audio
 */
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream;
  /** Timestamp when recording started, used for duration tracking and validation */
  private recordingStartTime: number = 0;

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
        console.log('[AudioRecorder] Data chunk received, size:', event.data.size, 'bytes');
        this.audioChunks.push(event.data);
      }
    };

    // Start recording with timeslice to ensure data is regularly flushed from internal buffers
    // This prevents buffer overflow issues with longer recordings (20+ seconds)
    // Without timeslice, Chrome may drop or corrupt data for long recordings when DevTools is closed
    this.recordingStartTime = Date.now();
    console.log('[AudioRecorder] Starting recording with', TIMING.RECORDER_TIMESLICE_MS, 'ms timeslice at', this.recordingStartTime);
    this.mediaRecorder.start(TIMING.RECORDER_TIMESLICE_MS);
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

      const recordingDuration = (Date.now() - this.recordingStartTime) / 1000;
      console.log('[AudioRecorder] Stopping recorder after', recordingDuration.toFixed(1), 'seconds');
      console.log('[AudioRecorder] Current state:', this.mediaRecorder.state);
      console.log('[AudioRecorder] Chunks collected so far:', this.audioChunks.length);

      // Check if recorder is actually recording
      if (this.mediaRecorder.state === 'inactive') {
        console.warn('[AudioRecorder] Recorder already inactive, returning collected chunks');
        const audioBlob = new Blob(this.audioChunks, {
          type: AUDIO_RECORDING_OPTIONS.mimeType,
        });
        this.stream.getTracks().forEach((track) => track.stop());
        this.audioChunks = [];
        this.mediaRecorder = null;
        resolve(audioBlob);
        return;
      }

      // Handle stop event
      this.mediaRecorder.onstop = () => {
        const finalDuration = (Date.now() - this.recordingStartTime) / 1000;
        console.log('[AudioRecorder] Recording stopped after', finalDuration.toFixed(1), 'seconds');
        console.log('[AudioRecorder] Total chunks collected:', this.audioChunks.length);

        // Create audio blob from collected chunks
        const audioBlob = new Blob(this.audioChunks, {
          type: AUDIO_RECORDING_OPTIONS.mimeType,
        });

        console.log('[AudioRecorder] Audio blob created, size:', audioBlob.size, 'bytes');

        // Calculate expected size vs actual (at 128kbps)
        const expectedSize = finalDuration * AUDIO_VALIDATION.BYTES_PER_SECOND;
        const actualSize = audioBlob.size;
        const sizeRatio = (actualSize / expectedSize * 100).toFixed(0);
        console.log('[AudioRecorder] Expected size:', expectedSize.toFixed(0), 'bytes, actual:', actualSize, 'bytes (' + sizeRatio + '%)');

        // Validate audio size
        if (audioBlob.size < AUDIO_VALIDATION.MIN_SIZE_BYTES) {
          console.error('[AudioRecorder] WARNING: Audio blob is suspiciously small!');
          console.error('[AudioRecorder] This may indicate a recording failure or very short audio');
        }

        // Warning if we're missing more than expected percentage of audio
        if (actualSize < expectedSize * AUDIO_VALIDATION.MIN_SIZE_RATIO) {
          console.error('[AudioRecorder] WARNING: Audio size is less than', (AUDIO_VALIDATION.MIN_SIZE_RATIO * 100) + '% of expected!');
          console.error('[AudioRecorder] Chunks may have been dropped during recording');
        }

        // Clean up media stream
        this.stream.getTracks().forEach((track) => track.stop());

        // Reset state
        this.audioChunks = [];
        this.mediaRecorder = null;

        resolve(audioBlob);
      };

      // Handle errors
      this.mediaRecorder.onerror = (event) => {
        console.error('[AudioRecorder] MediaRecorder error:', event);
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
