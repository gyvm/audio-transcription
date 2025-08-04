import { DIContainer } from './Container';
import { WhisperService } from '../transcription/whisper/WhisperService';
import { AmiVoiceService } from '../transcription/amivoice/AmiVoiceService';
import { AmiVoiceSyncService } from '../transcription/amivoice/AmiVoiceSyncService';
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

    const amivoiceConfig: ServiceConfig = {
      name: 'amivoice',
      displayName: 'AmiVoice',
      apiKey: env.amivoiceApiKey,
      endpoint: 'https://acp-api-async.amivoice.com/v2/recognitions',
      supportsSpeakerDiarization: true,
      maxFileSizeBytes: env.maxFileSizeMB * 1024 * 1024, // 90分程度まで対応可能
      maxDurationSeconds: Math.min(env.maxDurationMinutes * 60, 90 * 60), // 90分制限
      supportedFormats: ['wav', 'mp3', 'flac', 'm4a', 'mp4', 'ogg', 'webm'],
    };

    this.container.registerService('whisper', WhisperService, whisperConfig);
    this.container.registerService('amivoice', AmiVoiceService, amivoiceConfig);

    const amivoiceSyncConfig: ServiceConfig = {
      name: 'amivoice-sync',
      displayName: 'AmiVoice (同期)',
      apiKey: env.amivoiceApiKey,
      endpoint: 'https://acp-api.amivoice.com/v1/recognitions',
      supportsSpeakerDiarization: true,
      maxFileSizeBytes: 4 * 1024 * 1024, // 4MB
      maxDurationSeconds: 60, // 60 seconds
      supportedFormats: ['wav', 'mp3', 'flac', 'm4a', 'mp4', 'ogg', 'webm'],
    };
    this.container.registerService('amivoice-sync', AmiVoiceSyncService, amivoiceSyncConfig);
  }

  registerService(name: string, constructor: any, config: ServiceConfig): void {
    this.container.registerService(name, constructor, config);
  }
}