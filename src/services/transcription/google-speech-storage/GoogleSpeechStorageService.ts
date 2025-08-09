import { TranscriptionService } from '../base/TranscriptionService';
import { StorageService } from '../../firebase/StorageService';
import { PollingManager } from '../google-speech/utils/PollingManager';
import { AudioFileProcessor } from '../google-speech/utils/AudioFileProcessor';
import { ProgressTracker } from '../google-speech/utils/ProgressTracker';
import type { TranscriptionResult, ServiceConfig } from '../../../types/transcription';
import type { AudioFile } from '../../../types/audio';
import type { 
  LongRunningRecognizeRequest,
  LongRunningRecognizeResponse,
  RecognizeResponse,
  GoogleSpeechError,
  ProcessingStatus,
  AudioFileInfo
} from '../google-speech/GoogleSpeechTypes';
import { 
  GOOGLE_SPEECH_ENDPOINTS, 
  DEFAULT_CONFIG,
  DEBUG_CONFIG,
  LIMITS 
} from '../google-speech/GoogleSpeechConfig';

/**
 * Google Cloud Speech-to-Text API Cloud Storage経由サービス
 * 長時間音声・大容量ファイル対応（非同期処理専用）
 */
export class GoogleSpeechStorageService extends TranscriptionService {
  private storageService?: StorageService;
  private progressTracker?: ProgressTracker;
  private pollingManager?: PollingManager;
  private onProgress?: (status: ProcessingStatus) => void;

  constructor(config: ServiceConfig) {
    super(config);
    
    // Firebase Storage が利用可能かチェック
    if (!StorageService.isAvailable()) {
      throw new Error('Firebase Storage configuration is required for Google Speech Storage service');
    }
    
    this.storageService = new StorageService();
  }

  /**
   * 進行状況コールバックを設定
   */
  setProgressCallback(callback: (status: ProcessingStatus) => void): void {
    this.onProgress = callback;
  }

  /**
   * Cloud Storage経由の文字起こし処理（非同期のみ）
   */
  async transcribe(audioFile: AudioFile): Promise<TranscriptionResult> {
    this.validateFile(audioFile);
    
    if (!this.storageService) {
      throw new Error('Storage service not available');
    }
    
    let audioInfo: AudioFileInfo;
    
    return await this.measureProcessingTime(async () => {
      try {
        // 音声ファイル情報を取得
        audioInfo = await AudioFileProcessor.getAudioInfo(audioFile);
        
        // Cloud Storage用の制限をチェック
        this.validateForStorageAPI(audioFile, audioInfo);
        
        // 進行状況トラッカーを初期化
        const estimatedTime = PollingManager.estimateProcessingTime(audioInfo.duration);
        this.progressTracker = new ProgressTracker({
          onProgress: this.onProgress,
          estimatedTotalTime: estimatedTime,
        });

        const result = await this.storageTranscribe(audioFile, audioInfo);
        
        if (this.progressTracker) {
          this.progressTracker.setCompleted();
        }
        
        return result.transcriptionResult;
      } catch (error) {
        if (this.progressTracker) {
          this.progressTracker.setError(error instanceof Error ? error.message : 'Unknown error');
        }
        throw error;
      }
    });
  }

  /**
   * Cloud Storage API用の制限チェック
   */
  private validateForStorageAPI(audioFile: AudioFile, audioInfo: AudioFileInfo): void {
    if (audioInfo.duration > LIMITS.ASYNC_MAX_DURATION_SECONDS) {
      const maxHours = LIMITS.ASYNC_MAX_DURATION_SECONDS / 3600;
      throw new Error(`音声が長すぎます: ${(audioInfo.duration / 3600).toFixed(1)}時間 (制限: ${maxHours}時間)`);
    }
    
    if (audioInfo.size > LIMITS.ASYNC_MAX_FILE_SIZE_BYTES) {
      throw new Error(`ファイルが大きすぎます: ${(audioInfo.size / (1024 * 1024 * 1024)).toFixed(2)}GB (制限: 1GB)`);
    }

    // MP3の警告
    if (audioFile.format.toLowerCase() === 'mp3') {
      console.warn('[GoogleSpeechStorage] MP3はベータ機能です。音声認識の精度が低下する可能性があります。WAV形式を推奨します。');
    }
  }

  /**
   * Cloud Storage経由の非同期認識処理
   */
  private async storageTranscribe(
    audioFile: AudioFile, 
    audioInfo: AudioFileInfo
  ): Promise<{
    transcriptionResult: TranscriptionResult;
    response: RecognizeResponse;
    requestData: Record<string, unknown>;
  }> {
    // Phase 1: ファイルアップロード
    this.progressTracker?.setPhase('uploading');
    this.storageService!.setProgressCallback((uploadProgress) => {
      this.progressTracker?.setPhaseProgress(uploadProgress.progress);
    });

    const uploadResult = await this.storageService!.uploadAudio(audioFile);

    // Phase 2: 非同期認識開始
    this.progressTracker?.setPhase('processing');
    
    const speechConfig = AudioFileProcessor.createSpeechConfig(audioInfo, DEFAULT_CONFIG);
    const request: LongRunningRecognizeRequest = {
      config: speechConfig,
      audio: {
        uri: uploadResult.gcsUri, // GCS URI形式を使用
      },
    };

    const requestData = {
      endpoint: GOOGLE_SPEECH_ENDPOINTS.ASYNC_RECOGNIZE,
      method: 'POST',
      config: speechConfig,
      audioSize: audioFile.file.size,
      audioDuration: audioInfo.duration,
      storageUri: uploadResult.gcsUri,
      processingMode: 'storage',
    };

    if (DEBUG_CONFIG.LOG_REQUESTS) {
      console.log('[GoogleSpeechStorage] Using GCS URI:', uploadResult.gcsUri);
      console.log('[GoogleSpeechStorage] Request config:', speechConfig);
    }

    // 非同期認識開始
    const url = `${GOOGLE_SPEECH_ENDPOINTS.ASYNC_RECOGNIZE}?key=${this.config.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json() as GoogleSpeechError;
      throw new Error(`Google Speech API error: ${errorData.error.message}`);
    }

    const operationResponse = await response.json() as LongRunningRecognizeResponse;

    // Phase 3: ポーリングで結果取得
    this.progressTracker?.setPhase('polling');
    this.pollingManager = new PollingManager({
      apiKey: this.config.apiKey,
      onProgress: (status) => {
        if (this.onProgress) {
          this.onProgress(status);
        }
      },
    });

    const recognitionResult = await this.pollingManager.waitForCompletion(operationResponse.name);

    // アップロードしたファイルをクリーンアップ
    try {
      await this.storageService!.deleteFile(uploadResult.fullPath);
      console.log('[GoogleSpeechStorage] Cleaned up uploaded file');
    } catch (error) {
      console.warn('[GoogleSpeechStorage] Failed to delete uploaded file:', error);
    }

    // 結果を変換
    const transcriptionResult = this.convertToTranscriptionResult(
      recognitionResult,
      requestData,
      recognitionResult
    );

    return {
      transcriptionResult,
      response: recognitionResult,
      requestData,
    };
  }

  /**
   * Google Speech結果をTranscriptionResultに変換
   * （GoogleSpeechServiceと同じロジック）
   */
  private convertToTranscriptionResult(
    response: RecognizeResponse,
    requestData: Record<string, unknown>,
    responseData: RecognizeResponse
  ): TranscriptionResult {
    // GoogleSpeechServiceと同じ変換ロジックを使用
    // ここでは簡略化して基本的な実装のみ提供
    const segments = [];
    const speakers = [];
    let fullText = '';

    if (response.results && response.results.length > 0) {
      response.results.forEach((result) => {
        if (result.alternatives && result.alternatives.length > 0) {
          const alternative = result.alternatives[0];
          fullText += (fullText ? ' ' : '') + alternative.transcript;
          
          // 基本的なセグメント作成
          segments.push({
            text: alternative.transcript,
            startTime: 0,
            endTime: 0,
            speakerId: 'speaker_1',
            confidence: alternative.confidence || 0,
          });
        }
      });
    }

    // デフォルトスピーカー
    speakers.push({
      id: 'speaker_1',
      name: '話者 1',
      segments: segments,
    });

    return {
      id: this.generateId(),
      serviceName: this.config.name,
      text: fullText,
      speakers,
      confidence: this.calculateAverageConfidence(segments),
      processingTime: 0, // measureProcessingTimeで設定される
      timestamp: new Date(),
      requestData,
      responseData,
    };
  }

  private calculateAverageConfidence(segments: any[]): number {
    if (segments.length === 0) return 0;
    const totalConfidence = segments.reduce((sum, segment) => sum + (segment.confidence || 0), 0);
    return totalConfidence / segments.length;
  }

  /**
   * 処理をキャンセル
   */
  cancel(): void {
    if (this.pollingManager) {
      this.pollingManager.abort();
    }
    if (this.progressTracker) {
      this.progressTracker.setError('処理がキャンセルされました');
    }
  }
}