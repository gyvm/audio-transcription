import type { ProcessingStatus } from '../GoogleSpeechTypes';

export interface ProgressOptions {
  onProgress?: (status: ProcessingStatus) => void;
  onPhaseChange?: (phase: ProcessingStatus['phase']) => void;
  estimatedTotalTime?: number; // 全体の推定時間（秒）
}

export class ProgressTracker {
  private onProgress?: (status: ProcessingStatus) => void;
  private onPhaseChange?: (phase: ProcessingStatus['phase']) => void;
  private currentPhase: ProcessingStatus['phase'] = 'uploading';
  private currentProgress: number = 0;
  private estimatedTotalTime: number;
  private startTime: number;
  private phaseStartTime: number;

  // 各フェーズの推定時間配分（パーセンテージ）
  private readonly PHASE_DURATIONS = {
    uploading: 20,    // アップロード: 20%
    processing: 75,   // 音声認識処理: 75%
    polling: 0,       // ポーリング: 処理に含まれる
    completed: 5,     // 完了処理: 5%
    error: 0,         // エラー: 即座
  };

  constructor(options: ProgressOptions = {}) {
    this.onProgress = options.onProgress;
    this.onPhaseChange = options.onPhaseChange;
    this.estimatedTotalTime = options.estimatedTotalTime || 120; // デフォルト2分
    this.startTime = Date.now();
    this.phaseStartTime = this.startTime;
  }

  /**
   * フェーズを変更
   */
  setPhase(phase: ProcessingStatus['phase']): void {
    if (this.currentPhase === phase) return;

    const previousPhase = this.currentPhase;
    this.currentPhase = phase;
    this.phaseStartTime = Date.now();

    // 前のフェーズの完了時にプログレスを更新
    this.updateProgressForPhaseCompletion(previousPhase);

    // フェーズ変更を通知
    if (this.onPhaseChange) {
      this.onPhaseChange(phase);
    }

    // 新しいフェーズの開始を報告
    this.reportProgress(this.getPhaseMessage(phase));
  }

  /**
   * 現在フェーズ内での進行状況を更新
   */
  setPhaseProgress(progress: number): void {
    // フェーズ内の進行状況（0-100）を全体の進行状況に変換
    const phaseBaseProgress = this.getBaseProgressForPhase(this.currentPhase);
    const phaseDuration = this.PHASE_DURATIONS[this.currentPhase];
    const adjustedProgress = phaseBaseProgress + (progress / 100) * phaseDuration;

    this.currentProgress = Math.min(Math.max(adjustedProgress, 0), 100);
    this.reportProgress(this.getPhaseMessage(this.currentPhase));
  }

  /**
   * カスタムメッセージで進行状況を更新
   */
  updateProgress(message: string, progress?: number): void {
    if (progress !== undefined) {
      this.currentProgress = Math.min(Math.max(progress, 0), 100);
    }
    this.reportProgress(message);
  }

  /**
   * エラー状態に設定
   */
  setError(message: string): void {
    this.setPhase('error');
    this.reportProgress(message);
  }

  /**
   * 完了状態に設定
   */
  setCompleted(): void {
    this.setPhase('completed');
    this.currentProgress = 100;
    this.reportProgress('処理が完了しました');
  }

  /**
   * フェーズの基準進行状況を取得
   */
  private getBaseProgressForPhase(phase: ProcessingStatus['phase']): number {
    switch (phase) {
      case 'uploading': return 0;
      case 'processing': return this.PHASE_DURATIONS.uploading;
      case 'polling': return this.PHASE_DURATIONS.uploading + this.PHASE_DURATIONS.processing;
      case 'completed': return 95;
      case 'error': return this.currentProgress; // エラー時は現在値を保持
      default: return 0;
    }
  }

  /**
   * フェーズ完了時の進行状況を更新
   */
  private updateProgressForPhaseCompletion(phase: ProcessingStatus['phase']): void {
    const completedProgress = this.getBaseProgressForPhase(phase) + this.PHASE_DURATIONS[phase];
    this.currentProgress = completedProgress;
  }

  /**
   * フェーズメッセージを取得
   */
  private getPhaseMessage(phase: ProcessingStatus['phase']): string {
    switch (phase) {
      case 'uploading': return 'ファイルをアップロード中...';
      case 'processing': return '音声認識を実行中...';
      case 'polling': return '処理結果を取得中...';
      case 'completed': return '処理が完了しました';
      case 'error': return 'エラーが発生しました';
      default: return '処理中...';
    }
  }

  /**
   * 残り時間を推定
   */
  private getEstimatedTimeRemaining(): number {
    const elapsedTime = (Date.now() - this.startTime) / 1000;
    const phaseElapsedTime = (Date.now() - this.phaseStartTime) / 1000;
    const progressRatio = this.currentProgress / 100;
    
    if (progressRatio <= 0) return this.estimatedTotalTime;
    
    // 全体の経過時間ベースで推定（フェーズ時間も考慮）
    const estimatedTotal = Math.max(elapsedTime / progressRatio, phaseElapsedTime + this.estimatedTotalTime * 0.1);
    const remaining = Math.max(0, estimatedTotal - elapsedTime);
    
    return Math.round(remaining);
  }

  /**
   * 進行状況を報告
   */
  private reportProgress(message: string): void {
    if (!this.onProgress) return;

    const status: ProcessingStatus = {
      phase: this.currentPhase,
      progress: Math.round(this.currentProgress),
      message,
      estimatedTimeRemaining: this.getEstimatedTimeRemaining(),
    };

    this.onProgress(status);
  }

  /**
   * デバッグ情報を取得
   */
  getDebugInfo(): {
    phase: string;
    progress: number;
    elapsedTime: number;
    estimatedRemaining: number;
  } {
    const elapsedTime = (Date.now() - this.startTime) / 1000;
    return {
      phase: this.currentPhase,
      progress: this.currentProgress,
      elapsedTime: Math.round(elapsedTime),
      estimatedRemaining: this.getEstimatedTimeRemaining(),
    };
  }
}