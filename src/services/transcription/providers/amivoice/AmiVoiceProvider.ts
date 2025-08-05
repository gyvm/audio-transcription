import { TranscriptionProvider } from '../../core/TranscriptionProvider';
import { AmiVoiceService } from '../../amivoice/AmiVoiceService';
import type { TranscriptionResult, ServiceConfig } from '../../../../types/transcription';
import type { AudioFile } from '../../../../types/audio';
import type { 
  ProviderInfo, 
  ServiceCapabilities, 
  EnhancedTranscriptionResult 
} from '../../../../types/provider';

export class AmiVoiceProvider extends TranscriptionProvider {
  protected providerId = 'amivoice';
  protected providerName = 'AmiVoice';
  protected providerDescription = 'AmiVoice音声認識サービス（非同期処理対応）';
  
  private amiVoiceService: AmiVoiceService;
  private lastRequest: any = null;
  private lastResponse: any = null;

  constructor(config: ServiceConfig) {
    super(config);
    this.amiVoiceService = new AmiVoiceService(config);
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
        name: 'amivoice-async',
        displayName: 'AmiVoice 非同期',
        apiKey: this.config.apiKey,
        endpoint: 'https://acp-api-async.amivoice.com/v2/recognitions',
        supportsSpeakerDiarization: true,
        maxFileSizeBytes: 100 * 1024 * 1024, // 100MB
        maxDurationSeconds: 7200, // 2時間
        supportedFormats: ['wav', 'mp3', 'flac', 'm4a', 'aac', 'ogg']
      },
      {
        name: 'amivoice-sync',
        displayName: 'AmiVoice 同期（60秒制限）',
        apiKey: this.config.apiKey,
        endpoint: 'https://acp-api.amivoice.com/v1/recognize',
        supportsSpeakerDiarization: false,
        maxFileSizeBytes: 50 * 1024 * 1024, // 50MB
        maxDurationSeconds: 60, // 60秒
        supportedFormats: ['wav', 'mp3', 'flac', 'm4a']
      }
    ];
  }

  getCapabilities(): ServiceCapabilities {
    return {
      supportsBatch: false,
      supportsRealtime: false,
      supportsCustomModels: true, // 一般/医療/コールセンター等のドメイン対応
      maxConcurrentRequests: 5,
      supportedLanguages: ['ja'] // 主に日本語対応
    };
  }

  async transcribe(audioFile: AudioFile): Promise<TranscriptionResult> {
    // AmiVoiceServiceに委譲
    return await this.amiVoiceService.transcribe(audioFile);
  }

  protected formatRequest(audioFile: AudioFile): any {
    this.lastRequest = {
      provider: this.providerName,
      service: 'amivoice-async',
      file: {
        name: audioFile.file.name,
        size: audioFile.file.size,
        type: audioFile.file.type
      },
      options: {
        grammarFileNames: '-a-general',
        loggingOptOut: true,
        speakerDiarization: this.config.supportsSpeakerDiarization
      },
      endpoint: this.config.endpoint,
      timestamp: new Date().toISOString(),
      processingType: 'async-polling'
    };
    return this.lastRequest;
  }

  protected async getLastResponse(): Promise<any> {
    return this.lastResponse;
  }

  // AmiVoiceServiceの内部メソッドをフック
  async transcribeWithDetails(audioFile: AudioFile): Promise<EnhancedTranscriptionResult> {
    this.formatRequest(audioFile); // リクエスト情報を記録
    
    try {
      const result = await super.transcribeWithDetails(audioFile);
      
      // レスポンス情報を記録
      this.lastResponse = {
        success: true,
        text: result.text,
        metadata: result.metadata,
        speakers: result.speakers,
        segments: result.speakers?.flatMap(speaker => speaker.segments) || [],
        processingTime: result.processingTime,
        timestamp: result.timestamp.toISOString(),
        processingType: 'async-completed'
      };
      
      return result;
    } catch (error) {
      this.lastResponse = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
        processingType: 'async-failed'
      };
      throw error;
    }
  }

  // AmiVoice固有のメソッド
  updateGrammar(grammarType: 'general' | 'medical' | 'callcenter'): void {
    // 将来の拡張用
    console.log(`Grammar updated to: ${grammarType}`);
  }

  enableSpeakerDiarization(enable: boolean): void {
    this.config.supportsSpeakerDiarization = enable;
    this.amiVoiceService = new AmiVoiceService(this.config);
  }

  // 処理状況の監視（将来の拡張用）
  async getProcessingStatus(_sessionId: string): Promise<{
    status: 'PROCESSING' | 'COMPLETED' | 'ERROR';
    progress?: number;
  }> {
    // 現在のAmiVoiceServiceはポーリングで完了まで待つが、
    // 将来的には中間状態を取得できるように拡張可能
    return {
      status: 'PROCESSING'
    };
  }
}