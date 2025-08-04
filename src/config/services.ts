import type { ServiceConfig } from '../types/transcription';
import { env } from './env';
import { API_ENDPOINTS } from './api';

export const createDefaultServiceConfigs = (): Record<string, ServiceConfig> => {
  const maxFileSizeBytes = env.maxFileSizeMB * 1024 * 1024;
  const maxDurationSeconds = env.maxDurationMinutes * 60;

  return {
    whisper: {
      name: 'whisper',
      displayName: 'OpenAI Whisper',
      apiKey: env.openaiApiKey,
      endpoint: API_ENDPOINTS.WHISPER,
      supportsSpeakerDiarization: false,
      maxFileSizeBytes: Math.min(maxFileSizeBytes, 25 * 1024 * 1024), // Whisper has 25MB limit
      maxDurationSeconds,
      supportedFormats: ['mp3', 'wav', 'flac', 'm4a', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'webm'],
    },
    
    // Future services can be added here
    google: {
      name: 'google',
      displayName: 'Google Speech-to-Text',
      apiKey: '', // Will be configured later
      endpoint: API_ENDPOINTS.GOOGLE_SPEECH,
      supportsSpeakerDiarization: true,
      maxFileSizeBytes: maxFileSizeBytes,
      maxDurationSeconds,
      supportedFormats: ['wav', 'flac', 'mp3', 'ogg'],
    },
  };
};