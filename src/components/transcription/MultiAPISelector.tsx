import { useState, useEffect } from 'react';
import type { ProviderInfo } from '../../types/provider';

interface MultiAPISelectorProps {
  providers: ProviderInfo[];
  selectedProviderIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  isProcessing?: boolean;
}

export function MultiAPISelector({ 
  providers, 
  selectedProviderIds, 
  onSelectionChange, 
  isProcessing = false 
}: MultiAPISelectorProps) {
  const [localSelection, setLocalSelection] = useState<string[]>(selectedProviderIds);

  useEffect(() => {
    setLocalSelection(selectedProviderIds);
  }, [selectedProviderIds]);

  const handleProviderToggle = (providerId: string) => {
    if (isProcessing) return;
    
    const newSelection = localSelection.includes(providerId)
      ? localSelection.filter(id => id !== providerId)
      : [...localSelection, providerId];
    
    setLocalSelection(newSelection);
    onSelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    if (isProcessing) return;
    
    const allIds = providers.map(p => p.id);
    setLocalSelection(allIds);
    onSelectionChange(allIds);
  };

  const handleClearAll = () => {
    if (isProcessing) return;
    
    setLocalSelection([]);
    onSelectionChange([]);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(0)}MB`;
    }
    return `${(bytes / 1024).toFixed(0)}KB`;
  };

  const formatDuration = (seconds: number): string => {
    if (seconds >= 3600) {
      return `${(seconds / 3600).toFixed(1)}時間`;
    }
    if (seconds >= 60) {
      return `${(seconds / 60).toFixed(0)}分`;
    }
    return `${seconds}秒`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          音声認識サービス選択
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={handleSelectAll}
            disabled={isProcessing || localSelection.length === providers.length}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            すべて選択
          </button>
          <button
            onClick={handleClearAll}
            disabled={isProcessing || localSelection.length === 0}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            すべて解除
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-600">
        選択されたサービス: {localSelection.length} / {providers.length}
      </p>

      <div className="space-y-3">
        {providers.map((provider) => {
          const isSelected = localSelection.includes(provider.id);
          const primaryService = provider.services[0]; // 最初のサービスを代表として表示

          return (
            <div
              key={provider.id}
              className={`border rounded-lg p-4 transition-colors ${
                isSelected 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-start space-x-4">
                <input
                  type="checkbox"
                  id={`provider-${provider.id}`}
                  checked={isSelected}
                  onChange={() => handleProviderToggle(provider.id)}
                  disabled={isProcessing}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <label 
                      htmlFor={`provider-${provider.id}`}
                      className={`text-base font-medium cursor-pointer ${
                        isProcessing ? 'cursor-not-allowed' : ''
                      }`}
                    >
                      {provider.name}
                    </label>
                    <div className="flex items-center space-x-2">
                      {primaryService?.supportsSpeakerDiarization && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          話者分離
                        </span>
                      )}
                      {provider.capabilities.supportsRealtime && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          リアルタイム
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mt-1">
                    {provider.description}
                  </p>

                  {primaryService && (
                    <div className="mt-2 text-xs text-gray-500 grid grid-cols-2 gap-2">
                      <div>
                        最大ファイルサイズ: {formatFileSize(primaryService.maxFileSizeBytes)}
                      </div>
                      <div>
                        最大時間: {formatDuration(primaryService.maxDurationSeconds)}
                      </div>
                      <div className="col-span-2">
                        対応形式: {primaryService.supportedFormats.join(', ')}
                      </div>
                    </div>
                  )}

                  {provider.services.length > 1 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500">
                        利用可能なサービス: {provider.services.length}個
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {provider.services.map((service) => (
                          <span
                            key={service.name}
                            className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700"
                          >
                            {service.displayName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {localSelection.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>少なくとも1つのサービスを選択してください</p>
        </div>
      )}

      {localSelection.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            <strong>{localSelection.length}個のサービス</strong>で並列処理を実行します。
            処理時間はサービスごとに異なります。
          </p>
        </div>
      )}
    </div>
  );
}