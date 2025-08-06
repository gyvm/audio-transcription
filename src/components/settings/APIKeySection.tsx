import React, { useState, useEffect } from 'react';
import { Button } from '../common';
import { useAPIKeyManager } from '../../hooks';
import { APIKeyInput } from './APIKeyInput';
import { API_KEY_SERVICES } from '../../services/apiKey';
import type { APIKeyConfig, APIKeyService } from '../../services/apiKey';

export const APIKeySection: React.FC = () => {
  const {
    metadata,
    isLoading,
    error,
    saveAPIKeys,
    getAPIKeys,
    deleteUserAPIKeys,
    refreshState,
  } = useAPIKeyManager();

  const [apiKeys, setApiKeys] = useState<APIKeyConfig>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 初期化時にAPIキーを読み込み
  useEffect(() => {
    loadAPIKeys();
  }, []);

  const loadAPIKeys = async () => {
    try {
      const currentKeys = await getAPIKeys();
      setApiKeys(currentKeys);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to load API keys:', error);
    }
  };

  const handleAPIKeyChange = (service: APIKeyService, value: string) => {
    setApiKeys(prev => ({
      ...prev,
      [service]: value,
    }));
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await saveAPIKeys(apiKeys);
      setHasUnsavedChanges(false);
      await refreshState();
    } catch (error) {
      console.error('Failed to save API keys:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    loadAPIKeys();
  };

  const handleDeleteAll = async () => {
    if (window.confirm('保存されているAPIキーを全て削除しますか？')) {
      try {
        await deleteUserAPIKeys();
        setApiKeys({});
        setHasUnsavedChanges(false);
        await refreshState();
      } catch (error) {
        console.error('Failed to delete API keys:', error);
      }
    }
  };


  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* 現在の状態表示 */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">現在の設定状況</h4>
        <div className="space-y-2">
          {metadata.map((meta) => (
            <div key={meta.service} className="flex items-center justify-between text-sm">
              <span className="text-blue-700">{meta.displayName}:</span>
              <span className={`font-medium ${meta.isConfigured ? 'text-green-600' : 'text-gray-500'}`}>
                {meta.isConfigured ? (
                  <>
                    {meta.isFromEnvironment ? '環境変数' : 'ユーザー設定'}
                    {meta.isFromEnvironment && meta.isFromUserConfig && ' + ユーザー設定'}
                  </>
                ) : (
                  '未設定'
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* APIキー入力フォーム */}
      <div className="space-y-4">
        {Object.values(API_KEY_SERVICES).map((service) => (
          <APIKeyInput
            key={service}
            service={service}
            value={apiKeys[service] || ''}
            onChange={(value) => handleAPIKeyChange(service, value)}
            disabled={isLoading || isSaving}
          />
        ))}
      </div>

      {/* アクションボタン */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-3">
          <Button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || isLoading || isSaving}
          >
            {isSaving ? '保存中...' : '保存'}
          </Button>
          <Button
            variant="ghost"
            onClick={handleReset}
            disabled={!hasUnsavedChanges || isLoading || isSaving}
          >
            リセット
          </Button>
        </div>

        <Button
          variant="ghost"
          onClick={handleDeleteAll}
          disabled={isLoading || isSaving}
          className="text-red-600 hover:text-red-700"
        >
          全て削除
        </Button>
      </div>

      {hasUnsavedChanges && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex items-center">
            <span className="text-yellow-600 mr-2">⚠️</span>
            <p className="text-sm text-yellow-800">
              未保存の変更があります。保存を忘れずに！
            </p>
          </div>
        </div>
      )}

      {/* 使用方法の説明 */}
      <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">使用方法</h4>
        <div className="text-xs text-gray-600 space-y-2">
          <p>• 環境変数とユーザー設定の両方がある場合、ユーザー設定が優先されます</p>
          <p>• APIキーは暗号化されてブラウザのローカルストレージに保存されます</p>
          <p>• 無効なAPIキーを入力した場合、検証時にエラーが表示されます</p>
          <p>• セキュリティのため、定期的にAPIキーをローテーションすることをお勧めします</p>
        </div>
      </div>
    </div>
  );
};