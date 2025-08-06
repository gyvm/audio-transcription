import { DIContainer } from './Container';
import { WhisperService } from '../transcription/whisper/WhisperService';
import { AmiVoiceService } from '../transcription/amivoice/AmiVoiceService';
import { AmiVoiceSyncService } from '../transcription/amivoice/AmiVoiceSyncService';
import type { ServiceConfig } from '../../types/transcription';
import { env } from '../../config';
import { APIKeyManager } from '../apiKey';

export class ServiceRegistry {
  private container: DIContainer;
  private apiKeyManager: APIKeyManager;

  constructor() {
    this.container = new DIContainer();
    this.apiKeyManager = APIKeyManager.getInstance();
    this.registerDefaultServices();
  }

  getContainer(): DIContainer {
    return this.container;
  }

  /**
   * APIキーを動的に取得してサービス設定を更新
   */
  async updateServiceConfigs(): Promise<void> {
    try {
      const apiKeys = await this.apiKeyManager.getAPIKeys();
      await this.registerServicesWithAPIKeys(apiKeys.openai, apiKeys.amivoice);
    } catch (error) {
      console.error('Failed to update service configs:', error);
      // フォールバック: 環境変数のAPIキーを使用
      await this.registerServicesWithAPIKeys(env.openaiApiKey, env.amivoiceApiKey);
    }
  }

  /**
   * 指定されたAPIキーでサービスを再登録
   */
  private async registerServicesWithAPIKeys(openaiApiKey?: string, amivoiceApiKey?: string): Promise<void> {
    // 既存のサービスをクリア
    this.container.clearServices();

    // WhisperServiceの登録
    if (openaiApiKey && openaiApiKey.startsWith('sk-')) {
      const whisperConfig: ServiceConfig = {
        name: 'whisper',
        displayName: 'OpenAI Whisper',
        apiKey: openaiApiKey,
        endpoint: 'https://api.openai.com/v1/audio/transcriptions',
        supportsSpeakerDiarization: false,
        maxFileSizeBytes: Math.min(env.maxFileSizeMB * 1024 * 1024, 25 * 1024 * 1024), // Whisper limit
        maxDurationSeconds: env.maxDurationMinutes * 60,
        supportedFormats: ['mp3', 'wav', 'flac', 'm4a', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'webm'],
      };

      this.container.registerService('whisper', WhisperService, whisperConfig);
      console.log('WhisperService registered with API key');
    } else {
      console.warn('OpenAI API key not available or invalid');
    }

    // AmiVoiceServiceの登録
    if (amivoiceApiKey && amivoiceApiKey.length > 10) {
      const amivoiceConfig: ServiceConfig = {
        name: 'amivoice',
        displayName: 'AmiVoice',
        apiKey: amivoiceApiKey,
        endpoint: 'https://acp-api-async.amivoice.com/v2/recognitions',
        supportsSpeakerDiarization: true,
        maxFileSizeBytes: env.maxFileSizeMB * 1024 * 1024,
        maxDurationSeconds: Math.min(env.maxDurationMinutes * 60, 90 * 60), // 90分制限
        supportedFormats: ['wav', 'mp3', 'flac', 'm4a', 'mp4', 'ogg', 'webm'],
      };

      this.container.registerService('amivoice', AmiVoiceService, amivoiceConfig);
      console.log('AmiVoiceService registered with API key');

      // AmiVoice同期版も登録
      const amivoiceSyncConfig: ServiceConfig = {
        name: 'amivoice-sync',
        displayName: 'AmiVoice (同期)',
        apiKey: amivoiceApiKey,
        endpoint: 'https://acp-api.amivoice.com/v1/recognitions',
        supportsSpeakerDiarization: true,
        maxFileSizeBytes: 4 * 1024 * 1024, // 4MB
        maxDurationSeconds: 60, // 60 seconds
        supportedFormats: ['wav', 'mp3', 'flac', 'm4a', 'mp4', 'ogg', 'webm'],
      };

      try {
        this.container.registerService('amivoice-sync', AmiVoiceSyncService, amivoiceSyncConfig);
        console.log('AmiVoiceSyncService registered with API key');
      } catch (error: unknown) {
        console.warn(`Failed to register AmiVoiceSyncService: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      console.warn('AmiVoice API key not available or invalid');
    }
  }

  /**
   * 初期サービス登録（環境変数から）
   */
  private registerDefaultServices(): void {
    // 初期は環境変数のAPIキーで登録
    this.registerServicesWithAPIKeys(env.openaiApiKey, env.amivoiceApiKey)
      .catch(error => {
        console.error('Failed to register default services:', error);
      });
  }

  /**
   * サービスを手動登録（後方互換性のため）
   */
  registerService(name: string, constructor: any, config: ServiceConfig): void {
    this.container.registerService(name, constructor, config);
  }

  /**
   * 利用可能なサービスの数を取得
   */
  getAvailableServiceCount(): number {
    return this.container.getAvailableServices().length;
  }

  /**
   * サービスが利用可能かチェック
   */
  isServiceAvailable(serviceName: string): boolean {
    try {
      return this.container.hasService(serviceName);
    } catch {
      return false;
    }
  }

  /**
   * APIキーの状態を取得
   */
  async getAPIKeyStatus(): Promise<{
    openai: { available: boolean; source: 'env' | 'user' | 'none' };
    amivoice: { available: boolean; source: 'env' | 'user' | 'none' };
  }> {
    try {
      const apiKeys = await this.apiKeyManager.getAPIKeys();
      
      const openaiStatus = {
        available: !!(apiKeys.openai && apiKeys.openai.startsWith('sk-')),
        source: apiKeys.openai === env.openaiApiKey ? 'env' as const : 
                apiKeys.openai ? 'user' as const : 'none' as const,
      };

      const amivoiceStatus = {
        available: !!(apiKeys.amivoice && apiKeys.amivoice.length > 10),
        source: apiKeys.amivoice === env.amivoiceApiKey ? 'env' as const :
                apiKeys.amivoice ? 'user' as const : 'none' as const,
      };

      return { openai: openaiStatus, amivoice: amivoiceStatus };
    } catch (error) {
      console.error('Failed to get API key status:', error);
      return {
        openai: { available: false, source: 'none' },
        amivoice: { available: false, source: 'none' },
      };
    }
  }
}