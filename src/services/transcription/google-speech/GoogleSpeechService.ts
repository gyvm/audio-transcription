import { TranscriptionService } from '../base/TranscriptionService';
import { StorageService } from '../../firebase/StorageService';
import { PollingManager } from './utils/PollingManager';
import { AudioFileProcessor } from './utils/AudioFileProcessor';
import { ProgressTracker } from './utils/ProgressTracker';
import type { TranscriptionResult, Speaker, TextSegment, ServiceConfig } from '../../../types/transcription';
import type { AudioFile } from '../../../types/audio';
import type { 
  RecognizeRequest, 
  LongRunningRecognizeRequest,
  RecognizeResponse,
  LongRunningRecognizeResponse,
  GoogleSpeechError,
  ProcessingStatus,
  AudioFileInfo
} from './GoogleSpeechTypes';
import { 
  GOOGLE_SPEECH_ENDPOINTS, 
  DEFAULT_CONFIG,
  DEBUG_CONFIG 
} from './GoogleSpeechConfig';

export class GoogleSpeechService extends TranscriptionService {
  private storageService?: StorageService;
  private progressTracker?: ProgressTracker;
  private pollingManager?: PollingManager;
  private onProgress?: (status: ProcessingStatus) => void;

  constructor(config: ServiceConfig) {
    super(config);
    
    // Firebase Storage が利用可能な場合のみ初期化
    if (StorageService.isAvailable()) {
      this.storageService = new StorageService();
    }
  }

  /**
   * 進行状況コールバックを設定
   */
  setProgressCallback(callback: (status: ProcessingStatus) => void): void {
    this.onProgress = callback;
  }

  /**
   * メインの文字起こし処理
   */
  async transcribe(audioFile: AudioFile): Promise<TranscriptionResult> {
    this.validateFile(audioFile);
    
    let audioInfo: AudioFileInfo;

    await this.measureProcessingTime(async () => {
      try {
        // 音声ファイル情報を取得
        audioInfo = await AudioFileProcessor.getAudioInfo(audioFile);
        
        // ファイルを検証
        AudioFileProcessor.validateAudioFile(audioFile, audioInfo);

        // 進行状況トラッカーを初期化
        const estimatedTime = PollingManager.estimateProcessingTime(audioInfo.duration);
        this.progressTracker = new ProgressTracker({
          onProgress: this.onProgress,
          estimatedTotalTime: estimatedTime,
        });

        // 処理方式を決定（同期 vs 非同期）
        if (AudioFileProcessor.canUseSyncProcessing(audioInfo)) {
          // 短い音声: 同期処理
          this.progressTracker.setPhase('processing');
          const result = await this.syncTranscribe(audioFile, audioInfo);
          return result.transcriptionResult;
        } else {
          // 長い音声: 非同期処理
          if (!this.storageService) {
            throw new Error('Firebase Storage is required for long audio processing but not configured');
          }
          const result = await this.asyncTranscribe(audioFile, audioInfo);
          return result.transcriptionResult;
        }
      } catch (error) {
        if (this.progressTracker) {
          this.progressTracker.setError(error instanceof Error ? error.message : 'Unknown error');
        }
        throw error;
      }
    });

    // 最終的な結果を返す前に完了状態を報告
    if (this.progressTracker) {
      this.progressTracker.setCompleted();
    }

    // Should never reach this point as the result is returned above
    throw new Error('Unexpected flow - no result returned');
  }

  /**
   * 同期文字起こし処理
   */
  private async syncTranscribe(
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
      console.log('[GoogleSpeech] Audio file info:', audioInfo);
      console.log('[GoogleSpeech] Speech config:', speechConfig);
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
      console.log('Google Speech response:', responseData);
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
   * 非同期文字起こし処理
   */
  private async asyncTranscribe(
    audioFile: AudioFile, 
    audioInfo: AudioFileInfo
  ): Promise<{
    transcriptionResult: TranscriptionResult;
    response: RecognizeResponse;
    requestData: Record<string, unknown>;
  }> {
    if (!this.storageService) {
      throw new Error('Storage service not available');
    }

    // Phase 1: ファイルアップロード
    this.progressTracker?.setPhase('uploading');
    this.storageService.setProgressCallback((uploadProgress) => {
      this.progressTracker?.setPhaseProgress(uploadProgress.progress);
    });

    const uploadResult = await this.storageService.uploadAudio(audioFile);

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
      storageUri: uploadResult.gcsUri, // GCS URI形式を記録
    };

    console.log('[GoogleSpeech] Using GCS URI:', uploadResult.gcsUri);

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

    // アップロードしたファイルをクリーンアップ（オプション）
    try {
      await this.storageService.deleteFile(uploadResult.fullPath);
    } catch (error) {
      console.warn('Failed to delete uploaded file:', error);
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
   */
  private convertToTranscriptionResult(
    response: RecognizeResponse,
    requestData: Record<string, unknown>,
    responseData: RecognizeResponse
  ): TranscriptionResult {
    const segments: TextSegment[] = [];
    const speakers: Speaker[] = [];
    let fullText = '';

    if (response.results && response.results.length > 0) {
      response.results.forEach((result) => {
        if (result.alternatives && result.alternatives.length > 0) {
          const alternative = result.alternatives[0]; // 最も信頼度の高い結果
          
          if (alternative.words && alternative.words.length > 0) {
            // 単語レベルの情報がある場合
            alternative.words.forEach((word) => {
              const startTime = word.startTime ? this.parseTimeToSeconds(word.startTime) : 0;
              const endTime = word.endTime ? this.parseTimeToSeconds(word.endTime) : 0;
              const speakerTag = word.speakerTag || 1;

              segments.push({
                text: word.word,
                startTime: startTime,
                endTime: endTime,
                speakerId: `speaker_${speakerTag}`,
                confidence: word.confidence || alternative.confidence || 0,
              });

              // スピーカー情報を収集
              const speakerId = `speaker_${speakerTag}`;
              if (!speakers.find(s => s.id === speakerId)) {
                speakers.push({
                  id: speakerId,
                  name: `話者 ${speakerTag}`,
                  segments: [],
                });
              }
            });
          } else {
            // 単語情報がない場合、文全体を1つのセグメントとして扱う
            segments.push({
              text: alternative.transcript,
              startTime: 0,
              endTime: 0,
              speakerId: 'speaker_1',
              confidence: alternative.confidence || 0,
            });
          }

          fullText += (fullText ? ' ' : '') + alternative.transcript;
        }
      });
    }

    // デフォルトスピーカーが存在しない場合は追加
    if (speakers.length === 0) {
      speakers.push({
        id: 'speaker_1',
        name: '話者 1',
        segments: [],
      });
    }

    // セグメントをスピーカーに割り当て
    segments.forEach(segment => {
      const speaker = speakers.find(s => s.id === segment.speakerId);
      if (speaker) {
        speaker.segments.push(segment);
      }
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

  /**
   * 時間文字列を秒数に変換
   */
  private parseTimeToSeconds(timeString: string): number {
    // Google Speech は "123.456s" 形式
    const match = timeString.match(/^(\d+(?:\.\d+)?)s?$/);
    return match ? parseFloat(match[1]) : 0;
  }

  /**
   * 平均信頼度を計算
   */
  private calculateAverageConfidence(segments: TextSegment[]): number {
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