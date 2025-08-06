import { useState, useEffect, useCallback } from 'react';
import { APIKeyManager } from '../services/apiKey';
import type { 
  APIKeyConfig, 
  APIKeyMetadata, 
  APIKeyValidationResult, 
  APIKeyManagerState,
  APIKeyService 
} from '../services/apiKey';

interface UseAPIKeyManagerReturn {
  // 状態
  state: APIKeyManagerState;
  metadata: APIKeyMetadata[];
  isLoading: boolean;
  error: string | null;
  
  // APIキー管理
  saveAPIKeys: (apiKeys: APIKeyConfig) => Promise<void>;
  getAPIKeys: () => Promise<APIKeyConfig>;
  deleteUserAPIKeys: () => Promise<void>;
  
  // 検証
  validateAPIKey: (service: APIKeyService, apiKey: string) => Promise<APIKeyValidationResult>;
  
  // リセット
  resetAll: () => Promise<void>;
  
  // 状態更新
  refreshState: () => Promise<void>;
}

export const useAPIKeyManager = (): UseAPIKeyManagerReturn => {
  const [apiKeyManager] = useState(() => APIKeyManager.getInstance());
  const [state, setState] = useState<APIKeyManagerState>({
    hasUserPassword: false,
    isUnlocked: false,
    availableKeys: [],
  });
  const [metadata, setMetadata] = useState<APIKeyMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 状態を更新
  const refreshState = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const currentState = apiKeyManager.getState();
      const currentMetadata = await apiKeyManager.getAPIKeyMetadata();

      setState(currentState);
      setMetadata(currentMetadata);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Failed to refresh API key manager state:', err);
    } finally {
      setIsLoading(false);
    }
  }, [apiKeyManager]);

  // 初期化時に状態を取得
  useEffect(() => {
    refreshState();
  }, [refreshState]);


  // APIキー保存
  const saveAPIKeys = useCallback(async (apiKeys: APIKeyConfig) => {
    try {
      setIsLoading(true);
      setError(null);

      await apiKeyManager.saveAPIKeys(apiKeys);
      await refreshState();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save API keys';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [apiKeyManager, refreshState]);

  // APIキー取得
  const getAPIKeys = useCallback(async (): Promise<APIKeyConfig> => {
    try {
      setError(null);
      return await apiKeyManager.getAPIKeys();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get API keys';
      setError(errorMessage);
      throw err;
    }
  }, [apiKeyManager]);

  // ユーザーAPIキー削除
  const deleteUserAPIKeys = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      await apiKeyManager.deleteUserAPIKeys();
      await refreshState();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete API keys';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [apiKeyManager, refreshState]);

  // APIキー検証
  const validateAPIKey = useCallback(async (service: APIKeyService, apiKey: string): Promise<APIKeyValidationResult> => {
    try {
      setError(null);
      return await apiKeyManager.validateAPIKey({ service, apiKey });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate API key';
      setError(errorMessage);
      throw err;
    }
  }, [apiKeyManager]);

  // 全データリセット
  const resetAll = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      await apiKeyManager.resetAll();
      await refreshState();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset all data';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [apiKeyManager, refreshState]);

  return {
    state,
    metadata,
    isLoading,
    error,
    saveAPIKeys,
    getAPIKeys,
    deleteUserAPIKeys,
    validateAPIKey,
    resetAll,
    refreshState,
  };
};