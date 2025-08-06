import { StorageManager } from '../encryption/StorageManager';
import { env } from '../../config/env';
import { API_KEY_SERVICES, API_KEY_SERVICE_INFO } from './types';
import type {
  APIKeyConfig,
  APIKeyMetadata,
  APIKeyValidationResult,
  APIKeyManagerState,
  APIKeyService,
  APIKeyTestRequest,
} from './types';

export class APIKeyManager {
  private static instance: APIKeyManager | null = null;
  private storageManager: StorageManager;
  private systemPassword: string;
  
  private readonly STORAGE_KEYS = {
    API_KEYS: 'encrypted_api_keys',
    SYSTEM_PASSWORD: 'system_password',
  };

  private constructor() {
    this.storageManager = new StorageManager({
      storageType: 'local',
      keyPrefix: 'audio_transcription_',
      version: '1.0',
    });
    this.systemPassword = this.getOrGenerateSystemPassword();
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): APIKeyManager {
    if (!this.instance) {
      this.instance = new APIKeyManager();
    }
    return this.instance;
  }

  /**
   * システムパスワードを取得または生成
   */
  private getOrGenerateSystemPassword(): string {
    try {
      // 既存のシステムパスワードがあるかチェック
      const stored = localStorage.getItem('audio_transcription_system_password');
      if (stored) {
        return stored;
      }
      
      // システムパスワードを生成
      const password = this.generateSecurePassword();
      localStorage.setItem('audio_transcription_system_password', password);
      return password;
    } catch (error) {
      // フォールバック：固定文字列とタイムスタンプ
      return `system_${Date.now()}_${Math.random().toString(36)}`;
    }
  }

  /**
   * 安全なランダムパスワードを生成
   */
  private generateSecurePassword(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }


  /**
   * APIキーを保存
   */
  async saveAPIKeys(apiKeys: APIKeyConfig): Promise<void> {
    try {
      const config: APIKeyConfig & { timestamp: number } = {
        ...apiKeys,
        timestamp: Date.now(),
      };

      await this.storageManager.encryptAndStore(
        this.STORAGE_KEYS.API_KEYS,
        JSON.stringify(config),
        this.systemPassword
      );

      console.log('API keys saved successfully');
    } catch (error) {
      console.error('Failed to save API keys:', error);
      throw error;
    }
  }

  /**
   * APIキーを取得
   */
  async getAPIKeys(): Promise<APIKeyConfig> {
    const config: APIKeyConfig = {};

    // 環境変数からのAPIキーを取得
    if (env.openaiApiKey && env.openaiApiKey.startsWith('sk-')) {
      config.openai = env.openaiApiKey;
    }
    if (env.amivoiceApiKey && env.amivoiceApiKey.length > 10) {
      config.amivoice = env.amivoiceApiKey;
    }

    // ユーザー設定のAPIキーを取得
    try {
      const storedConfig = await this.storageManager.decryptAndRetrieve(
        this.STORAGE_KEYS.API_KEYS,
        this.systemPassword
      );

      if (storedConfig) {
        const userConfig = JSON.parse(storedConfig);
        // ユーザー設定を優先
        if (userConfig.openai) config.openai = userConfig.openai;
        if (userConfig.amivoice) config.amivoice = userConfig.amivoice;
      }
    } catch (error) {
      console.warn('Failed to retrieve user API keys:', error);
    }

    return config;
  }

  /**
   * 特定のサービスのAPIキーを取得
   */
  async getAPIKey(service: APIKeyService): Promise<string | null> {
    const config = await this.getAPIKeys();
    return config[service] || null;
  }

  /**
   * APIキーのメタデータを取得
   */
  async getAPIKeyMetadata(): Promise<APIKeyMetadata[]> {
    const config = await this.getAPIKeys();
    const metadata: APIKeyMetadata[] = [];

    for (const service of Object.values(API_KEY_SERVICES)) {
      const serviceInfo = API_KEY_SERVICE_INFO[service];
      const apiKey = config[service];
      const envKey = service === 'openai' ? env.openaiApiKey : env.amivoiceApiKey;
      const hasUserKey = await this.hasUserAPIKey(service);

      metadata.push({
        service,
        displayName: serviceInfo.displayName,
        isConfigured: !!apiKey,
        isFromEnvironment: !!envKey && apiKey === envKey,
        isFromUserConfig: hasUserKey,
      });
    }

    return metadata;
  }

  /**
   * ユーザー設定のAPIキーが存在するかチェック
   */
  private async hasUserAPIKey(service: APIKeyService): Promise<boolean> {
    try {
      const storedConfig = await this.storageManager.decryptAndRetrieve(
        this.STORAGE_KEYS.API_KEYS,
        this.systemPassword
      );

      if (storedConfig) {
        const userConfig = JSON.parse(storedConfig);
        return !!userConfig[service];
      }
    } catch (error) {
      // 復号化に失敗した場合は存在しないとみなす
    }

    return false;
  }

  /**
   * APIキーを検証
   */
  async validateAPIKey(request: APIKeyTestRequest): Promise<APIKeyValidationResult> {
    const { service, apiKey, timeout = 10000 } = request;
    const serviceInfo = API_KEY_SERVICE_INFO[service];

    // フォーマットチェック
    if (!serviceInfo.keyFormat.test(apiKey)) {
      return {
        service,
        isValid: false,
        error: 'Invalid API key format',
      };
    }

    // 実際のAPI呼び出しテスト
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(serviceInfo.testEndpoint, {
        method: serviceInfo.testMethod,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      return {
        service,
        isValid: response.ok,
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        service,
        isValid: false,
        error: error instanceof Error ? error.message : 'Network error',
        responseTime,
      };
    }
  }

  /**
   * 保存されているAPIキーを削除
   */
  async deleteUserAPIKeys(): Promise<void> {
    try {
      this.storageManager.removeEncryptedData(this.STORAGE_KEYS.API_KEYS);
      console.log('User API keys deleted successfully');
    } catch (error) {
      console.error('Failed to delete user API keys:', error);
      throw error;
    }
  }

  /**
   * すべてのデータを削除
   */
  async resetAll(): Promise<void> {
    try {
      this.storageManager.clearAllEncryptedData();
      // システムパスワードも再生成
      localStorage.removeItem('audio_transcription_system_password');
      this.systemPassword = this.getOrGenerateSystemPassword();
      console.log('All data reset successfully');
    } catch (error) {
      console.error('Failed to reset all data:', error);
      throw error;
    }
  }

  /**
   * 現在の状態を取得
   */
  getState(): APIKeyManagerState {
    return {
      hasUserPassword: true, // 常にシステムパスワードが存在
      isUnlocked: true, // 常にロック解除済み
      availableKeys: [], // getAPIKeyMetadata()を呼ぶ必要があるため空配列
    };
  }


  /**
   * デストラクタ - クリーンアップ
   */
  destroy(): void {
    // 特にクリーンアップすることはない（システムパスワードは保持）
  }
}