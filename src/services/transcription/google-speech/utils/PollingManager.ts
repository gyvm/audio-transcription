import type { Operation, RecognizeResponse, ProcessingStatus } from '../GoogleSpeechTypes';
import { GOOGLE_SPEECH_ENDPOINTS, LIMITS } from '../GoogleSpeechConfig';

export interface PollingOptions {
  apiKey: string;
  intervalMs?: number;
  maxAttempts?: number;
  onProgress?: (status: ProcessingStatus) => void;
}

export class PollingManager {
  private apiKey: string;
  private intervalMs: number;
  private maxAttempts: number;
  private onProgress?: (status: ProcessingStatus) => void;
  private abortController?: AbortController;

  constructor(options: PollingOptions) {
    this.apiKey = options.apiKey;
    this.intervalMs = options.intervalMs ?? LIMITS.POLLING_INTERVAL_MS;
    this.maxAttempts = options.maxAttempts ?? LIMITS.MAX_POLLING_ATTEMPTS;
    this.onProgress = options.onProgress;
  }

  /**
   * 非同期認識の完了を待機
   */
  async waitForCompletion(operationName: string): Promise<RecognizeResponse> {
    this.abortController = new AbortController();
    let attempt = 0;

    return new Promise<RecognizeResponse>((resolve, reject) => {
      const poll = async () => {
        try {
          attempt++;

          // 最大試行回数チェック
          if (attempt > this.maxAttempts) {
            reject(new Error('Polling timeout: Maximum attempts exceeded'));
            return;
          }

          // 進行状況を報告
          this.reportProgress(attempt);

          // Operation状態を取得
          const operation = await this.getOperation(operationName);

          if (operation.done) {
            if (operation.error) {
              reject(new Error(`Speech recognition failed: ${operation.error.message}`));
            } else if (operation.response) {
              // 完了を報告
              this.reportCompletionProgress();
              resolve(operation.response as RecognizeResponse);
            } else {
              reject(new Error('Operation completed but no response received'));
            }
          } else {
            // まだ処理中、次のポーリングをスケジュール
            setTimeout(poll, this.intervalMs);
          }
        } catch (error) {
          reject(error);
        }
      };

      // 最初のポーリングを開始
      poll();
    });
  }

  /**
   * Operation状態を取得
   */
  private async getOperation(operationName: string): Promise<Operation> {
    const url = `${GOOGLE_SPEECH_ENDPOINTS.OPERATIONS}/${operationName}?key=${this.apiKey}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: this.abortController?.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get operation status: ${response.status} ${errorText}`);
    }

    return response.json() as Promise<Operation>;
  }

  /**
   * 進行状況を報告
   */
  private reportProgress(attempt: number): void {
    if (!this.onProgress) return;

    const progress = Math.min((attempt / this.maxAttempts) * 90, 90); // 最大90%まで
    const estimatedTimeRemaining = Math.max(0, (this.maxAttempts - attempt) * (this.intervalMs / 1000));

    const status: ProcessingStatus = {
      phase: 'polling',
      progress: Math.round(progress),
      message: `音声認識を処理中... (${attempt}/${this.maxAttempts})`,
      estimatedTimeRemaining,
    };

    this.onProgress(status);
  }

  /**
   * 完了時の進行状況を報告
   */
  private reportCompletionProgress(): void {
    if (!this.onProgress) return;

    const status: ProcessingStatus = {
      phase: 'completed',
      progress: 100,
      message: '音声認識が完了しました',
    };

    this.onProgress(status);
  }

  /**
   * ポーリングを中止
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * 推定処理時間を計算（音声長に基づく）
   */
  static estimateProcessingTime(audioDurationSeconds: number): number {
    // Google Speech-to-Text は通常、音声長の約半分の時間で処理完了
    // 安全のため、音声長と同じ時間を見積もる
    return Math.max(60, audioDurationSeconds); // 最低1分
  }

  /**
   * ポーリング設定の検証
   */
  static validatePollingOptions(options: PollingOptions): void {
    if (!options.apiKey) {
      throw new Error('API key is required for polling');
    }

    if (options.intervalMs && options.intervalMs < 1000) {
      console.warn('Polling interval less than 1 second may cause rate limiting');
    }

    if (options.maxAttempts && options.maxAttempts > 2000) {
      console.warn('Very high max attempts may cause excessive polling');
    }
  }
}