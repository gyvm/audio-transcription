import React, { useState } from 'react';
import { Button } from '../common';
import { useAPIKeyManager } from '../../hooks';
import { APIKeySection } from './APIKeySection';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsUpdated?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsUpdated,
}) => {
  const {
    isLoading,
    error,
    resetAll,
  } = useAPIKeyManager();
  
  const [showDangerZone, setShowDangerZone] = useState(false);

  const handleClose = () => {
    onClose();
    if (onSettingsUpdated) {
      onSettingsUpdated();
    }
  };

  const handleResetAll = async () => {
    if (window.confirm('本当に全てのデータをリセットしますか？この操作は元に戻せません。')) {
      try {
        await resetAll();
        onClose();
        if (onSettingsUpdated) {
          onSettingsUpdated();
        }
      } catch (error) {
        console.error('Failed to reset all data:', error);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">設定</h2>
            <p className="text-sm text-gray-600 mt-1">
              APIキーを暗号化してブラウザに保存します
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-gray-600 hover:text-gray-700"
          >
            閉じる
          </Button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* APIキー管理セクション */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              APIキー管理
            </h3>
            <APIKeySection />
          </div>

          {/* 危険操作セクション */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-red-900">危険な操作</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDangerZone(!showDangerZone)}
                className="text-red-600 hover:text-red-700"
              >
                {showDangerZone ? '隠す' : '表示'}
              </Button>
            </div>
            
            {showDangerZone && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-red-900 mb-2">
                      全データのリセット
                    </h4>
                    <p className="text-sm text-red-700 mb-3">
                      保存されたAPIキーを含む全てのデータを削除します。
                      この操作は元に戻すことができません。
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResetAll}
                      disabled={isLoading}
                      className="text-red-600 hover:text-red-700 border border-red-300 hover:bg-red-100"
                    >
                      {isLoading ? '処理中...' : '全データをリセット'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* フッター */}
        <div className="border-t p-6 bg-gray-50">
          <div className="text-xs text-gray-600">
            <p className="mb-2">
              🔒 <strong>セキュリティについて:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>APIキーはAES-256-GCMで暗号化されブラウザのローカルストレージに保存されます</li>
              <li>暗号化キーはシステムが自動生成し、安全に管理されます</li>
              <li>フロントエンドでの暗号化には限界があるため、信頼できる環境でのみ利用してください</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};