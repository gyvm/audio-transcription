import { useState, useCallback } from 'react';
import { MultiAPISelector } from './MultiAPISelector';
import { DebugInfoPanel } from './DebugInfoPanel';
import { TranscriptionResult } from './TranscriptionResult';
import { useMultiAPITranscription } from '../../hooks/useMultiAPITranscription';
import { useAudioUpload } from '../../hooks/useAudioUpload';
import type { MultiAPIResult } from '../../types/provider';

export function MultiAPITranscriptionPanel() {
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [currentResult, setCurrentResult] = useState<MultiAPIResult | null>(null);
  
  const {
    results,
    isProcessing,
    error,
    selectedProviderIds,
    getAvailableProviders,
    setSelectedProviderIds,
    transcribeWithMultipleProviders,
    clearResults
  } = useMultiAPITranscription();

  const { audioFile } = useAudioUpload();

  const availableProviders = getAvailableProviders();

  const handleProviderSelectionChange = useCallback((selectedIds: string[]) => {
    setSelectedProviderIds(selectedIds);
  }, [setSelectedProviderIds]);

  const handleTranscribe = useCallback(async () => {
    if (!audioFile || selectedProviderIds.length === 0) {
      return;
    }

    try {
      const result = await transcribeWithMultipleProviders(audioFile, selectedProviderIds);
      setCurrentResult(result);
    } catch (error) {
      console.error('Multi-API transcription failed:', error);
    }
  }, [audioFile, selectedProviderIds, transcribeWithMultipleProviders]);

  const handleClearResults = useCallback(() => {
    clearResults();
    setCurrentResult(null);
  }, [clearResults]);

  const isReadyToTranscribe = audioFile?.isValid && selectedProviderIds.length > 0 && !isProcessing;

  return (
    <div className="space-y-6">
      {/* API選択セクション */}
      <div className="bg-white rounded-lg border p-6">
        <MultiAPISelector
          providers={availableProviders}
          selectedProviderIds={selectedProviderIds}
          onSelectionChange={handleProviderSelectionChange}
          isProcessing={isProcessing}
        />
      </div>

      {/* 実行ボタンセクション */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              複数API文字起こし実行
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              選択したサービスで並列処理を実行します
            </p>
          </div>
          <div className="flex space-x-3">
            {results.length > 0 && (
              <button
                onClick={handleClearResults}
                disabled={isProcessing}
                className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                結果をクリア
              </button>
            )}
            <button
              onClick={handleTranscribe}
              disabled={!isReadyToTranscribe}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>処理中...</span>
                </>
              ) : (
                <span>文字起こし開始</span>
              )}
            </button>
          </div>
        </div>

        {/* 状態表示 */}
        {!audioFile?.isValid && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              音声ファイルをアップロードしてください
            </p>
          </div>
        )}

        {audioFile?.isValid && selectedProviderIds.length === 0 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              少なくとも1つのサービスを選択してください
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">
              エラーが発生しました: {error.message || String(error)}
            </p>
          </div>
        )}
      </div>

      {/* 進行状況表示 */}
      {isProcessing && currentResult && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">処理進行状況</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>完了したAPI</span>
              <span>{currentResult.completedCount} / {currentResult.totalCount}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${(currentResult.completedCount / currentResult.totalCount) * 100}%` 
                }}
              />
            </div>
            
            {/* 成功したAPI */}
            {currentResult.results.length > 0 && (
              <div className="text-sm text-green-600">
                成功: {currentResult.results.map(r => r.apiId).join(', ')}
              </div>
            )}
            
            {/* エラーが発生したAPI */}
            {currentResult.errors.length > 0 && (
              <div className="text-sm text-red-600">
                エラー: {currentResult.errors.map(e => e.apiId).join(', ')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 結果表示セクション */}
      {currentResult && currentResult.results.length > 0 && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                文字起こし結果
              </h3>
              <button
                onClick={() => setShowDebugInfo(!showDebugInfo)}
                className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                {showDebugInfo ? 'デバッグ情報を隠す' : 'デバッグ情報を表示'}
              </button>
            </div>

            {/* API別結果表示 */}
            <div className="space-y-4">
              {currentResult.results.map((result) => (
                <div key={result.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">
                      {result.apiId} - {result.serviceName}
                    </h4>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">
                        {result.processingTime}ms
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        result.apiCallDetails.success
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {result.apiCallDetails.success ? '成功' : 'エラー'}
                      </span>
                    </div>
                  </div>
                  
                  <TranscriptionResult result={result} />
                </div>
              ))}
            </div>
          </div>

          {/* デバッグ情報パネル */}
          {showDebugInfo && (
            <DebugInfoPanel 
              multiAPIResult={currentResult}
              isCollapsed={false}
            />
          )}
        </div>
      )}
    </div>
  );
}