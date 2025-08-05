import React, { useState } from 'react';
import type { EnhancedTranscriptionResult, MultiAPIResult } from '../../types/provider';

interface DebugInfoPanelProps {
  results?: EnhancedTranscriptionResult[];
  multiAPIResult?: MultiAPIResult;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export function DebugInfoPanel({ 
  results = [], 
  multiAPIResult, 
  isCollapsed = true, 
  onToggle 
}: DebugInfoPanelProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(isCollapsed);
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalCollapsed(!internalCollapsed);
    }
  };

  const collapsed = onToggle ? isCollapsed : internalCollapsed;
  const displayResults = multiAPIResult ? multiAPIResult.results : results;

  if (displayResults.length === 0) {
    return null;
  }

  const formatTimestamp = (timestamp: Date): string => {
    return timestamp.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  const formatJSON = (obj: any): string => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  };

  return (
    <div className="border rounded-lg bg-gray-50">
      <button
        onClick={handleToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">
            {collapsed ? '▶' : '▼'} デバッグ情報
          </span>
          <span className="text-xs text-gray-500">
            ({displayResults.length}件の結果)
          </span>
        </div>
        <div className="text-xs text-gray-500">
          クリックして{collapsed ? '展開' : '折りたたむ'}
        </div>
      </button>

      {!collapsed && (
        <div className="border-t bg-white">
          {/* 結果選択タブ */}
          {displayResults.length > 1 && (
            <div className="border-b bg-gray-50">
              <div className="flex overflow-x-auto">
                {displayResults.map((result, index) => (
                  <button
                    key={result.id}
                    onClick={() => setSelectedResultIndex(index)}
                    className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
                      selectedResultIndex === index
                        ? 'border-blue-500 text-blue-600 bg-white'
                        : 'border-transparent text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    {result.apiId} ({result.apiCallDetails.success ? '成功' : 'エラー'})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* マルチAPI実行のサマリー */}
          {multiAPIResult && (
            <div className="p-4 border-b bg-blue-50">
              <h4 className="text-sm font-medium text-gray-900 mb-2">実行サマリー</h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-600">完了したAPI:</span>
                  <span className="ml-2 font-medium">
                    {multiAPIResult.completedCount} / {multiAPIResult.totalCount}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">成功したAPI:</span>
                  <span className="ml-2 font-medium text-green-600">
                    {multiAPIResult.results.length}
                  </span>
                </div>
                {multiAPIResult.errors.length > 0 && (
                  <div className="col-span-2">
                    <span className="text-gray-600">エラーが発生したAPI:</span>
                    <div className="mt-1 space-y-1">
                      {multiAPIResult.errors.map((error, index) => (
                        <div key={index} className="text-red-600 font-medium">
                          {error.apiId}: {error.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 選択された結果の詳細 */}
          {displayResults[selectedResultIndex] && (
            <div className="p-4 space-y-4">
              <DetailSection
                title="基本情報"
                content={
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-gray-600">API ID:</span>
                      <span className="ml-2 font-mono">
                        {displayResults[selectedResultIndex].apiId}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">サービス名:</span>
                      <span className="ml-2">
                        {displayResults[selectedResultIndex].serviceName}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">処理時間:</span>
                      <span className="ml-2 font-medium">
                        {displayResults[selectedResultIndex].processingTime}ms
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">実行時刻:</span>
                      <span className="ml-2 font-mono text-xs">
                        {formatTimestamp(displayResults[selectedResultIndex].timestamp)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">ステータス:</span>
                      <span className={`ml-2 font-medium ${
                        displayResults[selectedResultIndex].apiCallDetails.success 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {displayResults[selectedResultIndex].apiCallDetails.success ? '成功' : 'エラー'}
                      </span>
                    </div>
                    {displayResults[selectedResultIndex].confidence && (
                      <div>
                        <span className="text-gray-600">平均信頼度:</span>
                        <span className="ml-2 font-medium">
                          {(displayResults[selectedResultIndex].confidence! * 100).toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                }
              />

              <DetailSection
                title="APIリクエスト"
                content={
                  <CodeBlock 
                    code={formatJSON(displayResults[selectedResultIndex].apiCallDetails.request)}
                  />
                }
              />

              <DetailSection
                title="APIレスポンス"
                content={
                  <CodeBlock 
                    code={formatJSON(displayResults[selectedResultIndex].apiCallDetails.response)}
                    isError={!displayResults[selectedResultIndex].apiCallDetails.success}
                  />
                }
              />

              {displayResults[selectedResultIndex].metadata && (
                <DetailSection
                  title="メタデータ"
                  content={
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-gray-600">音声長:</span>
                        <span className="ml-2">
                          {displayResults[selectedResultIndex].metadata!.audioLength}秒
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">音声形式:</span>
                        <span className="ml-2 font-mono">
                          {displayResults[selectedResultIndex].metadata!.audioFormat}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">言語:</span>
                        <span className="ml-2">
                          {displayResults[selectedResultIndex].metadata!.language}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">モデル:</span>
                        <span className="ml-2">
                          {displayResults[selectedResultIndex].metadata!.model}
                        </span>
                      </div>
                    </div>
                  }
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface DetailSectionProps {
  title: string;
  content: React.ReactNode;
}

function DetailSection({ title, content }: DetailSectionProps) {
  return (
    <div className="border rounded-lg">
      <div className="bg-gray-50 px-3 py-2 border-b">
        <h5 className="text-sm font-medium text-gray-900">{title}</h5>
      </div>
      <div className="p-3">
        {content}
      </div>
    </div>
  );
}

interface CodeBlockProps {
  code: string;
  isError?: boolean;
}

function CodeBlock({ code, isError = false }: CodeBlockProps) {
  return (
    <div className={`rounded border ${isError ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
      <pre className={`text-xs overflow-x-auto p-3 ${isError ? 'text-red-800' : 'text-gray-800'}`}>
        <code>{code}</code>
      </pre>
    </div>
  );
}