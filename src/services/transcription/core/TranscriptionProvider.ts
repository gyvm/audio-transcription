import { TranscriptionService } from '../base/TranscriptionService';
import type { ServiceConfig } from '../../../types/transcription';
import type { AudioFile } from '../../../types/audio';
import type { ProviderInfo, ServiceCapabilities, EnhancedTranscriptionResult, APICallDetails } from '../../../types/provider';

export abstract class TranscriptionProvider extends TranscriptionService {
  protected abstract providerId: string;
  protected abstract providerName: string;
  protected abstract providerDescription: string;

  constructor(config: ServiceConfig) {
    super(config);
  }

  // プロバイダー情報の取得
  abstract getProviderInfo(): ProviderInfo;

  // 利用可能なサービス一覧
  abstract getAvailableServices(): ServiceConfig[];

  // プロバイダーの機能
  abstract getCapabilities(): ServiceCapabilities;

  // 拡張された文字起こし実行（デバッグ情報付き）
  async transcribeWithDetails(audioFile: AudioFile): Promise<EnhancedTranscriptionResult> {
    this.validateFile(audioFile);
    
    const startTime = Date.now();
    const request = this.formatRequest(audioFile);
    
    try {
      const { result, time } = await this.measureProcessingTime(
        () => this.transcribe(audioFile)
      );
      
      const response = await this.getLastResponse(); // サブクラスで実装される
      
      const apiCallDetails: APICallDetails = {
        request,
        response,
        processingTime: time,
        timestamp: new Date(),
        success: true
      };

      return {
        ...result,
        apiId: this.providerId,
        apiCallDetails
      };
    } catch (error) {
      const apiCallDetails: APICallDetails = {
        request,
        response: error,
        processingTime: Date.now() - startTime,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };

      // エラーでも構造化された結果を返す
      return {
        id: this.generateId(),
        serviceName: this.config.name,
        text: '',
        processingTime: apiCallDetails.processingTime,
        timestamp: apiCallDetails.timestamp,
        apiId: this.providerId,
        apiCallDetails
      };
    }
  }

  // リクエスト形式のフォーマット（デバッグ用）
  protected abstract formatRequest(audioFile: AudioFile): any;

  // 最後のレスポンスを取得（デバッグ用）
  protected abstract getLastResponse(): Promise<any>;

  // バッチ処理サポート（オプション）
  async transcribeBatch?(audioFiles: AudioFile[]): Promise<EnhancedTranscriptionResult[]>;

  // 設定の動的更新
  updateConfig(newConfig: Partial<ServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}