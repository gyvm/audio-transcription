import type { ServiceConfig } from '../../../types/transcription';

export const createWhisperConfig = (apiKey: string): ServiceConfig => ({
  name: 'whisper',
  displayName: 'OpenAI Whisper',
  apiKey,
  endpoint: 'https://api.openai.com/v1/audio/transcriptions',
  supportsSpeakerDiarization: false,
  maxFileSizeBytes: 25 * 1024 * 1024, // 25MB (Whisper API limit)
  maxDurationSeconds: 600, // 10 minutes
  supportedFormats: ['mp3', 'wav', 'flac', 'm4a', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'webm'],
});

export const WHISPER_MODELS = {
  WHISPER_1: 'whisper-1',
} as const;

export const WHISPER_RESPONSE_FORMATS = {
  JSON: 'json',
  TEXT: 'text',
  SRT: 'srt',
  VERBOSE_JSON: 'verbose_json',
  VTT: 'vtt',
} as const;