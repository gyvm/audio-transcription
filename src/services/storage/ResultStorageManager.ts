import type { TranscriptionResult } from '../../types/transcription';

export class ResultStorageManager {
  private readonly STORAGE_KEY = 'audio_transcription_results';
  private readonly MAX_RESULTS = 50; // 最大保存件数

  /**
   * 解析結果をローカルストレージに保存
   */
  saveResults(results: TranscriptionResult[]): void {
    try {
      // 最大件数を超えた場合は古い結果を削除
      const trimmedResults = results.slice(0, this.MAX_RESULTS);
      
      const data = {
        version: '1.0',
        timestamp: Date.now(),
        results: trimmedResults.map(result => ({
          ...result,
          // 大きなデータは保存しない（必要に応じて調整）
          requestData: result.requestData ? {
            ...result.requestData,
            // ファイルデータは保存しない（容量削減）
            file: undefined,
          } : undefined,
        })),
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      console.log(`Saved ${trimmedResults.length} transcription results to storage`);
    } catch (error) {
      console.error('Failed to save results to storage:', error);
    }
  }

  /**
   * ローカルストレージから解析結果を読み込み
   */
  loadResults(): TranscriptionResult[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return [];
      }

      const data = JSON.parse(stored);
      
      // バージョンチェック（将来的な拡張用）
      if (data.version !== '1.0') {
        console.warn('Incompatible storage version, clearing stored results');
        this.clearResults();
        return [];
      }

      // データの整合性チェック
      if (!Array.isArray(data.results)) {
        console.warn('Invalid stored results format, clearing storage');
        this.clearResults();
        return [];
      }

      console.log(`Loaded ${data.results.length} transcription results from storage`);
      return data.results as TranscriptionResult[];
    } catch (error) {
      console.error('Failed to load results from storage:', error);
      return [];
    }
  }

  /**
   * 特定の結果を削除
   */
  removeResult(resultId: string): TranscriptionResult[] {
    try {
      const currentResults = this.loadResults();
      const filteredResults = currentResults.filter(result => result.id !== resultId);
      this.saveResults(filteredResults);
      return filteredResults;
    } catch (error) {
      console.error('Failed to remove result from storage:', error);
      return this.loadResults();
    }
  }

  /**
   * 全ての解析結果をクリア
   */
  clearResults(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('Cleared all transcription results from storage');
    } catch (error) {
      console.error('Failed to clear results from storage:', error);
    }
  }

  /**
   * ストレージ使用量を取得（概算）
   */
  getStorageSize(): number {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? new Blob([stored]).size : 0;
    } catch (error) {
      console.error('Failed to calculate storage size:', error);
      return 0;
    }
  }

  /**
   * ストレージ使用量を人間が読みやすい形式で取得
   */
  getStorageSizeFormatted(): string {
    const bytes = this.getStorageSize();
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}