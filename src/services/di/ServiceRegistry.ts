import { DIContainer } from './Container';
import { WhisperService } from '../transcription/whisper/WhisperService';
import type { ServiceConfig } from '../../types/transcription';
import { env } from '../../config';

export class ServiceRegistry {
  private container: DIContainer;

  constructor() {
    this.container = new DIContainer();
    this.registerDefaultServices();
  }

  getContainer(): DIContainer {
    return this.container;
  }

  private registerDefaultServices(): void {
    const whisperConfig: ServiceConfig = {
      name: 'whisper',
      displayName: 'OpenAI Whisper',
      apiKey: env.openaiApiKey,
      endpoint: 'https://api.openai.com/v1/audio/transcriptions',
      supportsSpeakerDiarization: false,
      maxFileSizeBytes: Math.min(env.maxFileSizeMB * 1024 * 1024, 25 * 1024 * 1024), // Whisper limit
      maxDurationSeconds: env.maxDurationMinutes * 60,
      supportedFormats: ['mp3', 'wav', 'flac', 'm4a', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'webm'],
    };

    this.container.registerService('whisper', WhisperService, whisperConfig);
  }

  registerService(name: string, constructor: any, config: ServiceConfig): void {
    this.container.registerService(name, constructor, config);
  }
}