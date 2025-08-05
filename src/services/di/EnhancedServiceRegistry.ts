import { ServiceRegistry } from './ServiceRegistry';
import { ProviderRegistry } from '../transcription/core/ProviderRegistry';
import { OpenAIProvider } from '../transcription/providers/openai/OpenAIProvider';
import { AmiVoiceProvider } from '../transcription/providers/amivoice/AmiVoiceProvider';
import type { ServiceConfig } from '../../types/transcription';
import { env } from '../../config';

export class EnhancedServiceRegistry extends ServiceRegistry {
  private providerRegistry: ProviderRegistry;

  constructor() {
    super();
    this.providerRegistry = new ProviderRegistry();
    this.registerDefaultProviders();
  }

  getProviderRegistry(): ProviderRegistry {
    return this.providerRegistry;
  }

  private registerDefaultProviders(): void {
    // OpenAIプロバイダーの設定
    const whisperConfig: ServiceConfig = {
      name: 'whisper',
      displayName: 'OpenAI Whisper',
      apiKey: env.openaiApiKey,
      endpoint: 'https://api.openai.com/v1/audio/transcriptions',
      supportsSpeakerDiarization: false,
      maxFileSizeBytes: Math.min(env.maxFileSizeMB * 1024 * 1024, 25 * 1024 * 1024),
      maxDurationSeconds: env.maxDurationMinutes * 60,
      supportedFormats: ['mp3', 'wav', 'flac', 'm4a', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'webm'],
    };

    // AmiVoiceプロバイダーの設定
    const amivoiceConfig: ServiceConfig = {
      name: 'amivoice',
      displayName: 'AmiVoice',
      apiKey: env.amivoiceApiKey,
      endpoint: 'https://acp-api-async.amivoice.com/v2/recognitions',
      supportsSpeakerDiarization: true,
      maxFileSizeBytes: env.maxFileSizeMB * 1024 * 1024,
      maxDurationSeconds: Math.min(env.maxDurationMinutes * 60, 90 * 60),
      supportedFormats: ['wav', 'mp3', 'flac', 'm4a', 'mp4', 'ogg', 'webm'],
    };

    // プロバイダーのインスタンス作成と登録
    try {
      if (whisperConfig.apiKey) {
        const openAIProvider = new OpenAIProvider(whisperConfig);
        this.providerRegistry.registerProvider(openAIProvider);
        console.log('[EnhancedServiceRegistry] OpenAI provider registered');
      } else {
        console.warn('[EnhancedServiceRegistry] OpenAI API key not found, skipping OpenAI provider');
      }

      if (amivoiceConfig.apiKey) {
        const amiVoiceProvider = new AmiVoiceProvider(amivoiceConfig);
        this.providerRegistry.registerProvider(amiVoiceProvider);
        console.log('[EnhancedServiceRegistry] AmiVoice provider registered');
      } else {
        console.warn('[EnhancedServiceRegistry] AmiVoice API key not found, skipping AmiVoice provider');
      }
    } catch (error) {
      console.error('[EnhancedServiceRegistry] Error registering providers:', error);
    }
  }

  // 既存のサービスとプロバイダーの同期
  syncProvidersWithServices(): void {
    const availableServices = this.getContainer().getAvailableServices();
    const availableProviders = this.providerRegistry.getAllProviderInfos();

    console.log('[EnhancedServiceRegistry] Service-Provider sync status:', {
      services: availableServices.length,
      providers: availableProviders.length,
      serviceNames: availableServices.map(s => s.name),
      providerIds: availableProviders.map(p => p.id)
    });
  }

  // プロバイダーの動的追加
  addProvider(providerId: string, providerInstance: any): void {
    this.providerRegistry.registerProvider(providerInstance);
    console.log(`[EnhancedServiceRegistry] Provider added: ${providerId}`);
  }

  // プロバイダーの削除
  removeProvider(providerId: string): boolean {
    const result = this.providerRegistry.unregisterProvider(providerId);
    console.log(`[EnhancedServiceRegistry] Provider removed: ${providerId}, success: ${result}`);
    return result;
  }

  // 統合ヘルスチェック
  async performHealthCheck(): Promise<{
    services: { name: string; available: boolean }[];
    providers: { id: string; available: boolean }[];
    overall: boolean;
  }> {
    const services = this.getContainer().getAvailableServices();
    const providers = this.providerRegistry.getAllProviderInfos();

    const serviceStatus = services.map(service => ({
      name: service.name,
      available: !!service.config.apiKey && !!service.config.endpoint
    }));

    const providerStatus = providers.map(provider => ({
      id: provider.id,
      available: provider.services.some(service => !!service.apiKey)
    }));

    const overall = serviceStatus.some(s => s.available) && providerStatus.some(p => p.available);

    return {
      services: serviceStatus,
      providers: providerStatus,
      overall
    };
  }
}