export const API_ENDPOINTS = {
  WHISPER: 'https://api.openai.com/v1/audio/transcriptions',
  GOOGLE_SPEECH: 'https://speech.googleapis.com/v1/speech:recognize',
  AMAZON_TRANSCRIBE: 'https://transcribe.amazonaws.com/',
} as const;

export const API_TIMEOUTS = {
  DEFAULT: 30000, // 30 seconds
  TRANSCRIPTION: 120000, // 2 minutes
  UPLOAD: 60000, // 1 minute
} as const;

export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_DELAY: 1000, // 1 second
  BACKOFF_MULTIPLIER: 2,
} as const;