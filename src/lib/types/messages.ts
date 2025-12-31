/**
 * Message types for communication between extension components
 */
export enum MessageType {
  // Service Worker -> Offscreen
  START_RECORDING = 'START_RECORDING',
  STOP_RECORDING = 'STOP_RECORDING',

  // Service Worker -> Content Script
  RECORDING_STARTED = 'RECORDING_STARTED',
  RECORDING_STOPPED = 'RECORDING_STOPPED',
  TRANSCRIPTION_COMPLETE = 'TRANSCRIPTION_COMPLETE',
  TRANSCRIPTION_ERROR = 'TRANSCRIPTION_ERROR',

  // Offscreen -> Service Worker
  RECORDING_DATA = 'RECORDING_DATA',
}

export type RecordingState = 'idle' | 'recording' | 'processing';

export interface Message {
  type: MessageType;
  target?: 'service-worker' | 'offscreen' | 'content';
  data?: any;
}

export interface StartRecordingMessage extends Message {
  type: MessageType.START_RECORDING;
  target: 'offscreen';
}

export interface StopRecordingMessage extends Message {
  type: MessageType.STOP_RECORDING;
  target: 'offscreen';
}

export interface RecordingDataMessage extends Message {
  type: MessageType.RECORDING_DATA;
  target: 'service-worker';
  data: {
    success: boolean;
    audioData?: string; // base64
    mimeType?: string;
    error?: string;
  };
}

export interface RecordingStartedMessage extends Message {
  type: MessageType.RECORDING_STARTED;
}

export interface RecordingStoppedMessage extends Message {
  type: MessageType.RECORDING_STOPPED;
}

export interface TranscriptionCompleteMessage extends Message {
  type: MessageType.TRANSCRIPTION_COMPLETE;
  data: {
    text: string;
  };
}

export interface TranscriptionErrorMessage extends Message {
  type: MessageType.TRANSCRIPTION_ERROR;
  data: {
    error: string;
  };
}
