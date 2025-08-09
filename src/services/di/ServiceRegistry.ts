import { DIContainer } from './Container';
import { WhisperService } from '../transcription/whisper/WhisperService';
import { AmiVoiceService } from '../transcription/amivoice/AmiVoiceService';
import { AmiVoiceSyncService } from '../transcription/amivoice/AmiVoiceSyncService';

console.log('[ServiceRegistry] Importing Google Speech services...');
import { GoogleSpeechService } from '../transcription/google-speech/GoogleSpeechService';
import { GoogleSpeechDirectService } from '../transcription/google-speech-direct/GoogleSpeechDirectService';
import { GoogleSpeechStorageService } from '../transcription/google-speech-storage/GoogleSpeechStorageService';
console.log('[ServiceRegistry] Google Speech services imported successfully');
import type { ServiceConfig } from '../../types/transcription';
import { env } from '../../config';
import { APIKeyManager } from '../apiKey';

export class ServiceRegistry {
  private container: DIContainer;
  private apiKeyManager: APIKeyManager;
  private initializationPromise: Promise<void>;

  constructor() {
    console.log('[ServiceRegistry] Constructor called');
    this.container = new DIContainer();
    this.apiKeyManager = APIKeyManager.getInstance();
    // 初期化は非同期で行い、失敗してもエラーにしない
    console.log('[ServiceRegistry] Starting initialization...');
    this.initializationPromise = this.initializeServices();
    console.log('[ServiceRegistry] Constructor completed');
  }

  getContainer(): DIContainer {
    return this.container;
  }

  /**
   * サービス初期化の完了を待つ
   */
  async waitForInitialization(): Promise<void> {
    return this.initializationPromise;
  }

  /**
   * APIキーを動的に取得してサービス設定を更新
   */
  async updateServiceConfigs(): Promise<void> {
    try {
      console.log('[ServiceRegistry] Starting updateServiceConfigs...');
      const apiKeys = await this.apiKeyManager.getAPIKeys();
      console.log('[ServiceRegistry] Got API keys, calling registerServicesWithAPIKeys...');
      await this.registerServicesWithAPIKeys(apiKeys.openai, apiKeys.amivoice, apiKeys['google-speech']);
      console.log('[ServiceRegistry] updateServiceConfigs completed');
    } catch (error) {
      console.error('[ServiceRegistry] Failed to update service configs:', error);
      // フォールバック: 環境変数のAPIキーを使用
      console.log('[ServiceRegistry] Using fallback with environment variables...');
      await this.registerServicesWithAPIKeys(env.openaiApiKey, env.amivoiceApiKey, env.googleSpeechApiKey);
    }
  }

  /**
   * 指定されたAPIキーでサービスを再登録
   */
  private async registerServicesWithAPIKeys(openaiApiKey?: string, amivoiceApiKey?: string, googleSpeechApiKey?: string): Promise<void> {
    console.log('[ServiceRegistry] registerServicesWithAPIKeys called with:', {
      hasOpenAI: !!openaiApiKey,
      hasAmiVoice: !!amivoiceApiKey,
      hasGoogleSpeech: !!googleSpeechApiKey
    });
    
    // 既存のサービスをクリア
    this.container.clearServices();
    console.log('[ServiceRegistry] Services cleared, starting registration...');

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

    // Google Speech サービス群の登録
    console.log('[ServiceRegistry] Google Speech API Key check:', {
      hasKey: !!googleSpeechApiKey,
      keyLength: googleSpeechApiKey?.length || 0,
      startsWithAIza: googleSpeechApiKey?.startsWith('AIza') || false,
      keyPreview: googleSpeechApiKey ? `${googleSpeechApiKey.substring(0, 8)}...` : 'null'
    });
    
    if (googleSpeechApiKey && googleSpeechApiKey.startsWith('AIza')) {
      // 1. Google Speech (直接API) - 60秒以下専用
      const googleSpeechDirectConfig: ServiceConfig = {
        name: 'google-speech-direct',
        displayName: 'Google Speech (直接API)',
        apiKey: googleSpeechApiKey,
        endpoint: 'https://speech.googleapis.com/v1p1beta1/speech:recognize',
        supportsSpeakerDiarization: true,
        maxFileSizeBytes: 10 * 1024 * 1024, // 10MB
        maxDurationSeconds: 60, // 60秒
        supportedFormats: ['wav', 'flac', 'mp3', 'ogg', 'webm', 'm4a'],
      };

      try {
        this.container.registerService('google-speech-direct', GoogleSpeechDirectService, googleSpeechDirectConfig);
        console.log('[ServiceRegistry] GoogleSpeechDirectService registered successfully');
      } catch (error) {
        console.error('[ServiceRegistry] Failed to register GoogleSpeechDirectService:', error);
      }

      // 2. Google Speech (Cloud Storage) - 長時間音声対応
      const googleSpeechStorageConfig: ServiceConfig = {
        name: 'google-speech-storage',
        displayName: 'Google Speech (Cloud Storage)',
        apiKey: googleSpeechApiKey,
        endpoint: 'https://speech.googleapis.com/v1p1beta1/speech:longrunningrecognize',
        supportsSpeakerDiarization: true,
        maxFileSizeBytes: 1024 * 1024 * 1024, // 1GB
        maxDurationSeconds: 480 * 60, // 8時間
        supportedFormats: ['wav', 'flac', 'mp3', 'ogg', 'webm', 'm4a'],
      };

      try {
        this.container.registerService('google-speech-storage', GoogleSpeechStorageService, googleSpeechStorageConfig);
        console.log('[ServiceRegistry] GoogleSpeechStorageService registered successfully');
      } catch (error) {
        console.error('[ServiceRegistry] Failed to register GoogleSpeechStorageService:', error);
      }

      // 3. 従来のGoogle Speech (後方互換性のため残す)
      const googleSpeechConfig: ServiceConfig = {
        name: 'google-speech',
        displayName: 'Google Speech (自動選択)',
        apiKey: googleSpeechApiKey,
        endpoint: 'https://speech.googleapis.com/v1p1beta1/speech:recognize',
        supportsSpeakerDiarization: true,
        maxFileSizeBytes: 1024 * 1024 * 1024, // 1GB (最大値)
        maxDurationSeconds: 480 * 60, // 8時間
        supportedFormats: ['wav', 'flac', 'mp3', 'ogg', 'webm', 'm4a'],
      };

      try {
        this.container.registerService('google-speech', GoogleSpeechService, googleSpeechConfig);
        console.log('[ServiceRegistry] GoogleSpeechService registered successfully (legacy)');
      } catch (error) {
        console.error('[ServiceRegistry] Failed to register GoogleSpeechService:', error);
      }
    } else {
      console.warn('[ServiceRegistry] Google Speech API key not available or invalid');
    }

    // 最終的に登録されたサービスを確認
    const registeredServices = this.container.getAvailableServices();
    console.log('[ServiceRegistry] Registration completed. Registered services:', 
      registeredServices.map(s => ({ name: s.name, displayName: s.config.displayName }))
    );
  }

  /**
   * 非同期でサービスを初期化
   */
  private async initializeServices(): Promise<void> {
    try {
      console.log('[ServiceRegistry] Starting service initialization...');
      // 初期は環境変数のAPIキーで登録
      await this.registerServicesWithAPIKeys(env.openaiApiKey, env.amivoiceApiKey, env.googleSpeechApiKey);
      console.log('[ServiceRegistry] Service initialization completed');
    } catch (error) {
      console.error('[ServiceRegistry] Failed to initialize services:', error);
    }
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
    'google-speech': { available: boolean; source: 'env' | 'user' | 'none' };
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

      const googleSpeechStatus = {
        available: !!(apiKeys['google-speech'] && apiKeys['google-speech'].startsWith('AIza')),
        source: apiKeys['google-speech'] === env.googleSpeechApiKey ? 'env' as const :
                apiKeys['google-speech'] ? 'user' as const : 'none' as const,
      };

      return { openai: openaiStatus, amivoice: amivoiceStatus, 'google-speech': googleSpeechStatus };
    } catch (error) {
      console.error('Failed to get API key status:', error);
      return {
        openai: { available: false, source: 'none' },
        amivoice: { available: false, source: 'none' },
        'google-speech': { available: false, source: 'none' },
      };
    }
  }
}