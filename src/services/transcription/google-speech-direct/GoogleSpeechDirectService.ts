import { TranscriptionService } from '../base/TranscriptionService';
import { AudioFileProcessor } from '../google-speech/utils/AudioFileProcessor';
import { ProgressTracker } from '../google-speech/utils/ProgressTracker';
import type { TranscriptionResult, ServiceConfig } from '../../../types/transcription';
import type { AudioFile } from '../../../types/audio';
import type { 
  RecognizeRequest, 
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
 * Google Cloud Speech-to-Text API 直接認識サービス
 * 60秒以下・10MB以下のファイル専用（同期処理のみ）
 */
export class GoogleSpeechDirectService extends TranscriptionService {
  private progressTracker?: ProgressTracker;
  private onProgress?: (status: ProcessingStatus) => void;

  constructor(config: ServiceConfig) {
    super(config);
  }

  /**
   * 進行状況コールバックを設定
   */
  setProgressCallback(callback: (status: ProcessingStatus) => void): void {
    this.onProgress = callback;
  }

  /**
   * 直接文字起こし処理（同期のみ）
   */
  async transcribe(audioFile: AudioFile): Promise<TranscriptionResult> {
    this.validateFile(audioFile);
    
    let audioInfo: AudioFileInfo;
    
    return await this.measureProcessingTime(async () => {
      try {
        // 音声ファイル情報を取得
        audioInfo = await AudioFileProcessor.getAudioInfo(audioFile);
        
        // 直接APIの制限をチェック
        this.validateForDirectAPI(audioFile, audioInfo);
        
        // 進行状況トラッカーを初期化
        this.progressTracker = new ProgressTracker({
          onProgress: this.onProgress,
          estimatedTotalTime: Math.max(10, audioInfo.duration * 0.5), // 音声の半分程度の時間
        });

        this.progressTracker.setPhase('processing');
        const result = await this.directTranscribe(audioFile, audioInfo);
        
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
   * 直接API用の制限チェック
   */
  private validateForDirectAPI(audioFile: AudioFile, audioInfo: AudioFileInfo): void {
    if (audioInfo.duration > LIMITS.SYNC_MAX_DURATION_SECONDS) {
      throw new Error(`音声が長すぎます: ${audioInfo.duration.toFixed(1)}秒 (制限: ${LIMITS.SYNC_MAX_DURATION_SECONDS}秒)\nCloud Storage経由のGoogle Speechサービスをご利用ください。`);
    }
    
    if (audioInfo.size > LIMITS.SYNC_MAX_FILE_SIZE_BYTES) {
      throw new Error(`ファイルが大きすぎます: ${(audioInfo.size / (1024 * 1024)).toFixed(2)}MB (制限: ${LIMITS.SYNC_MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB)\nCloud Storage経由のGoogle Speechサービスをご利用ください。`);
    }

    // MP3の警告
    if (audioFile.format.toLowerCase() === 'mp3') {
      console.warn('[GoogleSpeechDirect] MP3はベータ機能です。音声認識の精度が低下する可能性があります。');
    }
  }

  /**
   * 直接認識処理
   */
  private async directTranscribe(
    audioFile: AudioFile, 
    audioInfo: AudioFileInfo
  ): Promise<{
    transcriptionResult: TranscriptionResult;
    response: RecognizeResponse;
    requestData: Record<string, unknown>;
  }> {
    // 音声ファイルをBase64エンコード
    this.progressTracker?.updateProgress('音声ファイルを準備中...', 10);
    const base64Audio = await AudioFileProcessor.encodeToBase64(audioFile.file);

    // Google Speech設定を生成
    const speechConfig = AudioFileProcessor.createSpeechConfig(audioInfo, DEFAULT_CONFIG);

    if (DEBUG_CONFIG.LOG_REQUESTS) {
      console.log('[GoogleSpeechDirect] Audio file info:', audioInfo);
      console.log('[GoogleSpeechDirect] Speech config:', speechConfig);
    }

    // リクエスト作成
    const request: RecognizeRequest = {
      config: speechConfig,
      audio: {
        content: base64Audio,
      },
    };

    const requestData = {
      endpoint: GOOGLE_SPEECH_ENDPOINTS.SYNC_RECOGNIZE,
      method: 'POST',
      config: speechConfig,
      audioSize: audioFile.file.size,
      audioDuration: audioInfo.duration,
      processingMode: 'direct',
    };

    this.progressTracker?.updateProgress('音声認識を実行中...', 30);

    // API呼び出し
    const url = `${GOOGLE_SPEECH_ENDPOINTS.SYNC_RECOGNIZE}?key=${this.config.apiKey}`;
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

    const responseData = await response.json() as RecognizeResponse;

    if (DEBUG_CONFIG.LOG_RESPONSES) {
      console.log('[GoogleSpeechDirect] Response:', responseData);
    }

    this.progressTracker?.updateProgress('結果を処理中...', 90);

    // 結果を変換
    const transcriptionResult = this.convertToTranscriptionResult(
      responseData, 
      requestData, 
      responseData
    );

    return {
      transcriptionResult,
      response: responseData,
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
    if (this.progressTracker) {
      this.progressTracker.setError('処理がキャンセルされました');
    }
  }
}