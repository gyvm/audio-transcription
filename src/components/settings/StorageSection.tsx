import React, { useState, useEffect } from 'react';
import { Button } from '../common';
import { ResultStorageManager } from '../../services/storage';

export const StorageSection: React.FC = () => {
  const [storageManager] = useState(() => new ResultStorageManager());
  const [storageInfo, setStorageInfo] = useState({
    size: '0 B',
    resultCount: 0,
  });

  useEffect(() => {
    const updateStorageInfo = () => {
      try {
        const results = storageManager.loadResults();
        setStorageInfo({
          size: storageManager.getStorageSizeFormatted(),
          resultCount: results.length,
        });
      } catch (error) {
        console.error('Failed to get storage info:', error);
      }
    };

    updateStorageInfo();
    // 定期的に更新（他のタブでの変更を反映）
    const interval = setInterval(updateStorageInfo, 5000);
    return () => clearInterval(interval);
  }, [storageManager]);

  const handleClearStorage = () => {
    if (window.confirm('保存されている全ての解析結果を削除しますか？この操作は元に戻せません。')) {
      try {
        storageManager.clearResults();
        setStorageInfo({
          size: '0 B',
          resultCount: 0,
        });
        // ページリロードを促す（状態の同期のため）
        if (window.confirm('解析結果が削除されました。変更を反映するためにページを再読み込みしますか？')) {
          window.location.reload();
        }
      } catch (error) {
        console.error('Failed to clear storage:', error);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* ストレージ情報 */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">ストレージ使用状況</h4>
        <div className="space-y-2 text-sm text-blue-700">
          <div className="flex items-center justify-between">
            <span>保存されている解析結果:</span>
            <span className="font-medium">{storageInfo.resultCount}件</span>
          </div>
          <div className="flex items-center justify-between">
            <span>使用容量:</span>
            <span className="font-medium">{storageInfo.size}</span>
          </div>
        </div>
      </div>

      {/* 管理機能 */}
      <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">ストレージ管理</h4>
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            解析結果は自動的にブラウザのローカルストレージに保存され、ページを再読み込みしても保持されます。
            最大50件まで保存され、それを超えると古い結果から自動的に削除されます。
          </p>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearStorage}
            disabled={storageInfo.resultCount === 0}
            className="text-red-600 hover:text-red-700 border border-red-300 hover:bg-red-100"
          >
            全ての解析結果を削除
          </Button>
        </div>
      </div>

      {/* 注意事項 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <div className="flex items-start">
          <span className="text-yellow-600 mr-2">⚠️</span>
          <div className="text-sm text-yellow-800">
            <p className="font-medium mb-1">注意事項</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>解析結果はこのブラウザのみに保存されます</li>
              <li>ブラウザデータを削除すると解析結果も失われます</li>
              <li>プライベートブラウジングでは保存されません</li>
              <li>大量のデータ保存はブラウザの動作に影響する場合があります</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};