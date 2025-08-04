import React, { useState } from 'react';
import type { TranscriptionResult } from '../../types/transcription';

interface ComparisonViewProps {
  results: TranscriptionResult[];
  className?: string;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({
  results,
  className = '',
}) => {
  const [selectedResults, setSelectedResults] = useState<string[]>(
    results.slice(0, 2).map(r => r.id)
  );

  if (results.length < 2) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        比較するには2つ以上の文字起こし結果が必要です
      </div>
    );
  }

  const handleResultToggle = (resultId: string) => {
    setSelectedResults(prev => {
      if (prev.includes(resultId)) {
        return prev.filter(id => id !== resultId);
      } else if (prev.length < 3) {
        return [...prev, resultId];
      }
      return prev;
    });
  };

  const selectedResultsData = results.filter(r => selectedResults.includes(r.id));

  const getWordsFromText = (text: string): string[] => {
    return text.split(/\s+/).filter(word => word.length > 0);
  };

  const calculateSimilarity = (text1: string, text2: string): number => {
    const words1 = getWordsFromText(text1);
    const words2 = getWordsFromText(text2);
    
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    
    const intersection = new Set([...set1].filter(word => set2.has(word)));
    const union = new Set([...set1, ...set2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  };

  return (
    <div className={className}>
      {/* 結果選択 */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">
          比較する結果を選択 (最大3つ)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {results.map((result) => (
            <div
              key={result.id}
              className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                selectedResults.includes(result.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleResultToggle(result.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm text-gray-900">
                    {result.serviceName}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {result.timestamp.toLocaleString('ja-JP')}
                  </div>
                </div>
                <div className="flex items-center">
                  {selectedResults.includes(result.id) && (
                    <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 比較結果 */}
      {selectedResultsData.length >= 2 && (
        <div className="space-y-6">
          {/* 統計情報 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">比較統計</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-500">平均処理時間</div>
                <div className="font-medium">
                  {Math.round(
                    selectedResultsData.reduce((sum, r) => sum + r.processingTime, 0) /
                    selectedResultsData.length
                  )}ms
                </div>
              </div>
              
              <div>
                <div className="text-gray-500">平均信頼度</div>
                <div className="font-medium">
                  {selectedResultsData.filter(r => r.confidence).length > 0 ? (
                    <>
                      {(
                        selectedResultsData
                          .filter(r => r.confidence)
                          .reduce((sum, r) => sum + (r.confidence || 0), 0) /
                        selectedResultsData.filter(r => r.confidence).length * 100
                      ).toFixed(1)}%
                    </>
                  ) : (
                    'N/A'
                  )}
                </div>
              </div>
              
              <div>
                <div className="text-gray-500">文字数範囲</div>
                <div className="font-medium">
                  {Math.min(...selectedResultsData.map(r => r.text.length))} - {Math.max(...selectedResultsData.map(r => r.text.length))}
                </div>
              </div>
            </div>
          </div>

          {/* テキスト比較 */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">テキスト比較</h4>
            <div className="grid gap-4">
              {selectedResultsData.map((result, index) => (
                <div key={result.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        index === 0 ? 'bg-blue-500' : 
                        index === 1 ? 'bg-green-500' : 'bg-purple-500'
                      }`}></div>
                      <span className="font-medium text-gray-900">
                        {result.serviceName}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>{result.text.length}文字</span>
                      <span>{Math.round(result.processingTime)}ms</span>
                      {result.confidence && (
                        <span>{(result.confidence * 100).toFixed(1)}%</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-md p-3">
                    <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">
                      {result.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 類似度行列 */}
          {selectedResultsData.length >= 2 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">テキスト類似度</h4>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left p-2"></th>
                        {selectedResultsData.map((result) => (
                          <th key={result.id} className="text-center p-2 font-medium">
                            {result.serviceName}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedResultsData.map((result1, i) => (
                        <tr key={result1.id}>
                          <td className="p-2 font-medium">{result1.serviceName}</td>
                          {selectedResultsData.map((result2, j) => (
                            <td key={result2.id} className="text-center p-2">
                              {i === j ? (
                                <span className="text-gray-400">-</span>
                              ) : (
                                <span className={`font-medium ${
                                  calculateSimilarity(result1.text, result2.text) > 0.8
                                    ? 'text-green-600'
                                    : calculateSimilarity(result1.text, result2.text) > 0.6
                                    ? 'text-yellow-600'
                                    : 'text-red-600'
                                }`}>
                                  {(calculateSimilarity(result1.text, result2.text) * 100).toFixed(1)}%
                                </span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};