import { TranscriptionProvider } from '../../core/TranscriptionProvider';
import { WhisperService } from '../../whisper/WhisperService';
import type { TranscriptionResult, ServiceConfig } from '../../../../types/transcription';
import type { AudioFile } from '../../../../types/audio';
import type { 
  ProviderInfo, 
  ServiceCapabilities, 
  EnhancedTranscriptionResult 
} from '../../../../types/provider';

export class OpenAIProvider extends TranscriptionProvider {
  protected providerId = 'openai';
  protected providerName = 'OpenAI';
  protected providerDescription = 'OpenAI音声認識サービス（Whisper API）';
  
  private whisperService: WhisperService;
  private lastRequest: any = null;
  private lastResponse: any = null;

  constructor(config: ServiceConfig) {
    super(config);
    this.whisperService = new WhisperService(config);
  }

  getProviderInfo(): ProviderInfo {
    return {
      id: this.providerId,
      name: this.providerName,
      description: this.providerDescription,
      capabilities: this.getCapabilities(),
      services: this.getAvailableServices()
    };
  }

  getAvailableServices(): ServiceConfig[] {
    return [
      {
        name: 'whisper-1',
        displayName: 'Whisper v1',
        apiKey: this.config.apiKey,
        endpoint: this.config.endpoint,
        supportsSpeakerDiarization: true,
        maxFileSizeBytes: 25 * 1024 * 1024, // 25MB
        maxDurationSeconds: 3600, // 1時間
        supportedFormats: ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm']
      }
    ];
  }

  getCapabilities(): ServiceCapabilities {
    return {
      supportsBatch: false,
      supportsRealtime: false,
      supportsCustomModels: false,
      maxConcurrentRequests: 3,
      supportedLanguages: [
        'ja', 'en', 'zh', 'de', 'es', 'ru', 'ko', 'fr', 'pt', 'tr', 'pl', 'ca', 'nl', 
        'ar', 'sv', 'it', 'id', 'hi', 'fi', 'vi', 'he', 'uk', 'el', 'ms', 'cs', 'ro', 
        'da', 'hu', 'ta', 'no', 'th', 'ur', 'hr', 'bg', 'lt', 'la', 'mi', 'ml', 'cy', 
        'sk', 'te', 'fa', 'lv', 'bn', 'sr', 'az', 'sl', 'kn', 'et', 'mk', 'br', 'eu', 
        'is', 'hy', 'ne', 'mn', 'bs', 'kk', 'sq', 'sw', 'gl', 'mr', 'pa', 'si', 'km', 
        'sn', 'yo', 'so', 'af', 'oc', 'ka', 'be', 'tg', 'sd', 'gu', 'am', 'yi', 'lo', 
        'uz', 'fo', 'ht', 'ps', 'tk', 'nn', 'mt', 'sa', 'lb', 'my', 'bo', 'tl', 'mg', 
        'as', 'tt', 'haw', 'ln', 'ha', 'ba', 'jw', 'su'
      ]
    };
  }

  async transcribe(audioFile: AudioFile): Promise<TranscriptionResult> {
    // WhisperServiceに委譲
    return await this.whisperService.transcribe(audioFile);
  }

  protected formatRequest(audioFile: AudioFile): any {
    this.lastRequest = {
      provider: this.providerName,
      service: 'whisper-1',
      file: {
        name: audioFile.file.name,
        size: audioFile.file.size,
        type: audioFile.file.type
      },
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
      speaker_diarization: this.config.supportsSpeakerDiarization,
      endpoint: this.config.endpoint,
      timestamp: new Date().toISOString()
    };
    return this.lastRequest;
  }

  protected async getLastResponse(): Promise<any> {
    return this.lastResponse;
  }

  // WhisperServiceの内部メソッドをフック
  async transcribeWithDetails(audioFile: AudioFile): Promise<EnhancedTranscriptionResult> {
    this.formatRequest(audioFile); // リクエスト情報を記録
    
    try {
      const result = await super.transcribeWithDetails(audioFile);
      
      // レスポンス情報を記録（実際のAPIレスポンスをキャプチャ）
      this.lastResponse = {
        success: true,
        text: result.text,
        metadata: result.metadata,
        speakers: result.speakers,
        segments: result.speakers?.[0]?.segments || [],
        processingTime: result.processingTime,
        timestamp: result.timestamp.toISOString()
      };
      
      return result;
    } catch (error) {
      this.lastResponse = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
      throw error;
    }
  }

  // 設定の動的更新（OpenAI固有）
  updateApiKey(newApiKey: string): void {
    this.config.apiKey = newApiKey;
    this.whisperService = new WhisperService(this.config);
  }

  // モデル変更（将来の拡張用）
  switchModel(modelName: string): void {
    // 現在はwhisper-1のみサポート
    if (modelName !== 'whisper-1') {
      throw new Error(`Unsupported model: ${modelName}`);
    }
  }
}