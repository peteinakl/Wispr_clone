/**
 * App-wide constants
 */

// Replicate API
export const REPLICATE_API_BASE_URL = 'https://api.replicate.com/v1';
export const WHISPER_MODEL_VERSION = 'openai/whisper:large-v3';
export const WHISPER_MODEL_VERSION_HASH = '4d50797290df275329f202e48c76360b3f22b08d28c196cbc54600319435f8d2';

// Claude API
export const CLAUDE_API_BASE_URL = 'https://api.anthropic.com/v1';
export const CLAUDE_API_VERSION = '2023-06-01';
export const CLAUDE_MODEL = 'claude-3-5-haiku-20241022';
export const CLAUDE_MAX_TOKENS = 1024;
export const CLAUDE_TEMPERATURE = 0.3;

// Storage keys
export const STORAGE_KEYS = {
  API_KEY: 'replicate_api_key',
  CLAUDE_API_KEY: 'claude_api_key',
  WRITING_STYLE: 'writing_style',
} as const;

// Audio recording settings
export const AUDIO_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    channelCount: 1,
    sampleRate: 16000, // Whisper optimal sample rate
    echoCancellation: true,
    noiseSuppression: true,
  },
};

export const AUDIO_RECORDING_OPTIONS = {
  mimeType: 'audio/webm;codecs=opus',
  audioBitsPerSecond: 128000, // 128 kbps
} as const;

// API polling settings
export const POLLING_CONFIG = {
  MAX_ATTEMPTS: 60, // 60 attempts
  INTERVAL_MS: 1000, // 1 second
} as const;

// Timing constants
export const TIMING = {
  INITIALIZATION_DELAY_MS: 100, // Wait for offscreen document/content script to initialize
  FADE_OUT_DURATION_MS: 300, // Floating indicator fade out animation
  ERROR_DISPLAY_DURATION_MS: 3000, // How long to show error messages
  WAVEFORM_UPDATE_INTERVAL_MS: 150, // Waveform animation refresh rate
  RECORDER_TIMESLICE_MS: 100, // MediaRecorder data chunk interval
} as const;

// User-friendly error messages
export const ERROR_MESSAGES = {
  NO_API_KEY: 'Set up your API key in settings',
  INVALID_API_KEY: 'Please check your API key in settings',
  MIC_PERMISSION_DENIED: 'Microphone access needed',
  NETWORK_ERROR: 'Connection lost. Check your internet',
  TRANSCRIPTION_TIMEOUT: 'Audio processing took too long',
  NO_ACTIVE_RECORDING: 'No active recording',
  EMPTY_TRANSCRIPTION: "Didn't catch that. Try speaking louder",
  FIELD_NOT_EDITABLE: "Can't type here. Try a different text field",
  REFINEMENT_FAILED: 'Could not refine text, using original',
  CLAUDE_API_ERROR: 'Text refinement unavailable',
} as const;

// Offscreen document
export const OFFSCREEN_DOCUMENT_PATH = 'src/offscreen/offscreen.html';
