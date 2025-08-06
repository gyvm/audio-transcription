import { CryptoService } from './CryptoService';
import type { EncryptedData } from './types';

export type StorageType = 'local' | 'session';

export interface StorageConfig {
  storageType: StorageType;
  keyPrefix: string;
  version: string;
}

export interface EncryptedStorageData {
  version: string;
  timestamp: number;
  data: EncryptedData;
}

export class StorageManager {
  private static readonly DEFAULT_CONFIG: StorageConfig = {
    storageType: 'local',
    keyPrefix: 'audio_transcription_',
    version: '1.0',
  };

  private config: StorageConfig;

  constructor(config?: Partial<StorageConfig>) {
    this.config = { ...StorageManager.DEFAULT_CONFIG, ...config };
  }

  /**
   * ストレージの可用性をチェック
   */
  private isStorageAvailable(): boolean {
    try {
      const storage = this.getStorage();
      const testKey = '__storage_test__';
      storage.setItem(testKey, 'test');
      storage.removeItem(testKey);
      return true;
    } catch (error) {
      console.warn('Storage is not available:', error);
      return false;
    }
  }

  /**
   * 使用するストレージオブジェクトを取得
   */
  private getStorage(): Storage {
    if (this.config.storageType === 'session') {
      return sessionStorage;
    }
    return localStorage;
  }

  /**
   * ストレージキーを生成
   */
  private generateStorageKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  /**
   * 暗号化してデータを保存
   * @param key 保存キー
   * @param value 保存する値
   * @param password 暗号化パスワード
   */
  async encryptAndStore(key: string, value: string, password: string): Promise<void> {
    if (!this.isStorageAvailable()) {
      throw new Error('Storage is not available');
    }

    try {
      // データを暗号化
      const encryptedData = await CryptoService.encrypt(value, password);

      // メタデータを含むストレージデータを作成
      const storageData: EncryptedStorageData = {
        version: this.config.version,
        timestamp: Date.now(),
        data: encryptedData,
      };

      // ストレージに保存
      const storageKey = this.generateStorageKey(key);
      const serializedData = JSON.stringify(storageData);
      
      this.getStorage().setItem(storageKey, serializedData);
      
      console.log(`Data encrypted and stored with key: ${key}`);
    } catch (error) {
      console.error('Failed to encrypt and store data:', error);
      throw new Error(`Failed to save encrypted data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * データを復号化して取得
   * @param key 取得キー
   * @param password 復号化パスワード
   * @returns 復号化された値、存在しない場合はnull
   */
  async decryptAndRetrieve(key: string, password: string): Promise<string | null> {
    if (!this.isStorageAvailable()) {
      throw new Error('Storage is not available');
    }

    try {
      const storageKey = this.generateStorageKey(key);
      const serializedData = this.getStorage().getItem(storageKey);

      if (!serializedData) {
        return null;
      }

      // ストレージデータをパース
      const storageData: EncryptedStorageData = JSON.parse(serializedData);

      // バージョンチェック
      if (storageData.version !== this.config.version) {
        console.warn(`Version mismatch for key ${key}. Expected: ${this.config.version}, Found: ${storageData.version}`);
        // 必要に応じてマイグレーション処理を追加
      }

      // データを復号化
      const decryptedValue = await CryptoService.decrypt(storageData.data, password);
      
      console.log(`Data decrypted and retrieved with key: ${key}`);
      return decryptedValue;
    } catch (error) {
      console.error('Failed to decrypt and retrieve data:', error);
      if (error instanceof Error && error.message.includes('incorrect password')) {
        throw new Error('Incorrect password');
      }
      throw new Error(`Failed to retrieve encrypted data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 暗号化されたデータが存在するかチェック
   * @param key チェックするキー
   */
  hasEncryptedData(key: string): boolean {
    if (!this.isStorageAvailable()) {
      return false;
    }

    try {
      const storageKey = this.generateStorageKey(key);
      const data = this.getStorage().getItem(storageKey);
      return data !== null;
    } catch (error) {
      console.error('Failed to check encrypted data existence:', error);
      return false;
    }
  }

  /**
   * 暗号化されたデータのメタデータを取得
   * @param key 取得キー
   */
  getEncryptedDataMetadata(key: string): { version: string; timestamp: number } | null {
    if (!this.isStorageAvailable()) {
      return null;
    }

    try {
      const storageKey = this.generateStorageKey(key);
      const serializedData = this.getStorage().getItem(storageKey);

      if (!serializedData) {
        return null;
      }

      const storageData: EncryptedStorageData = JSON.parse(serializedData);
      return {
        version: storageData.version,
        timestamp: storageData.timestamp,
      };
    } catch (error) {
      console.error('Failed to get encrypted data metadata:', error);
      return null;
    }
  }

  /**
   * 暗号化されたデータを削除
   * @param key 削除するキー
   */
  removeEncryptedData(key: string): void {
    if (!this.isStorageAvailable()) {
      throw new Error('Storage is not available');
    }

    try {
      const storageKey = this.generateStorageKey(key);
      this.getStorage().removeItem(storageKey);
      console.log(`Encrypted data removed with key: ${key}`);
    } catch (error) {
      console.error('Failed to remove encrypted data:', error);
      throw new Error(`Failed to remove encrypted data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 全ての暗号化されたデータのキー一覧を取得
   */
  getAllEncryptedKeys(): string[] {
    if (!this.isStorageAvailable()) {
      return [];
    }

    try {
      const storage = this.getStorage();
      const keys: string[] = [];
      
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith(this.config.keyPrefix)) {
          // プレフィックスを除去して元のキーを取得
          keys.push(key.substring(this.config.keyPrefix.length));
        }
      }
      
      return keys;
    } catch (error) {
      console.error('Failed to get all encrypted keys:', error);
      return [];
    }
  }

  /**
   * 全ての暗号化されたデータを削除
   */
  clearAllEncryptedData(): void {
    if (!this.isStorageAvailable()) {
      throw new Error('Storage is not available');
    }

    try {
      const keys = this.getAllEncryptedKeys();
      keys.forEach(key => {
        this.removeEncryptedData(key);
      });
      console.log(`All encrypted data cleared (${keys.length} items)`);
    } catch (error) {
      console.error('Failed to clear all encrypted data:', error);
      throw new Error(`Failed to clear all encrypted data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * ストレージの使用状況を取得
   */
  getStorageUsage(): { used: number; total: number; percentage: number } | null {
    if (!this.isStorageAvailable()) {
      return null;
    }

    try {
      const storage = this.getStorage();
      let used = 0;
      
      // 各アイテムのサイズを計算
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key) {
          const value = storage.getItem(key);
          if (value) {
            used += key.length + value.length;
          }
        }
      }

      // ブラウザの制限は通常5MB程度
      const total = 5 * 1024 * 1024; // 5MB in bytes
      const percentage = (used / total) * 100;

      return { used, total, percentage };
    } catch (error) {
      console.error('Failed to get storage usage:', error);
      return null;
    }
  }
}