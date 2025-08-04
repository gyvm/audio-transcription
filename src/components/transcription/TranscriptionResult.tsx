import React, { useState } from 'react';
import type { TranscriptionResult as TranscriptionResultType } from '../../types/transcription';
import { Button } from '../common';
import { SpeakerSegment } from './SpeakerSegment';

interface TranscriptionResultProps {
  result: TranscriptionResultType;
  onRemove?: () => void;
  showComparison?: boolean;
  className?: string;
}

export const TranscriptionResult: React.FC<TranscriptionResultProps> = ({
  result,
  onRemove,
  showComparison: _showComparison = false,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatProcessingTime = (timeMs: number): string => {
    if (timeMs < 1000) return `${timeMs}ms`;
    return `${(timeMs / 1000).toFixed(1)}秒`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('クリップボードへのコピーに失敗しました:', err);
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      <div className="p-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <h3 className="text-lg font-medium text-gray-900">
                {result.serviceName}
              </h3>
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>処理時間: {formatProcessingTime(result.processingTime)}</span>
              {result.confidence && (
                <span>信頼度: {(result.confidence * 100).toFixed(1)}%</span>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? '折りたたむ' : '詳細表示'}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(result.text)}
              className="text-blue-600 hover:text-blue-700"
            >
              コピー
            </Button>
            
            {onRemove && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="text-red-600 hover:text-red-700"
              >
                削除
              </Button>
            )}
          </div>
        </div>

        {/* メインテキスト */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">文字起こし結果</h4>
          <div className="bg-gray-50 rounded-md p-4">
            <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">
              {result.text}
            </p>
          </div>
        </div>

        {/* 詳細情報 */}
        {isExpanded && (
          <div className="space-y-6">
            {/* 話者別セグメント */}
            {result.speakers && result.speakers.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  話者別セグメント
                </h4>
                <div className="space-y-4">
                  {result.speakers.map(speaker => (
                    <SpeakerSegment
                      key={speaker.id}
                      speaker={speaker}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* メタデータ */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">メタデータ</h4>
              <div className="bg-gray-50 rounded-md p-4">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <dt className="font-medium text-gray-500">音声長:</dt>
                    <dd className="text-gray-900">
                      {result.metadata?.audioLength ? 
                        `${Math.round(result.metadata.audioLength)}秒` : 
                        '不明'
                      }
                    </dd>
                  </div>
                  
                  <div>
                    <dt className="font-medium text-gray-500">処理日時:</dt>
                    <dd className="text-gray-900">
                      {result.timestamp.toLocaleString('ja-JP')}
                    </dd>
                  </div>
                  
                  <div>
                    <dt className="font-medium text-gray-500">言語:</dt>
                    <dd className="text-gray-900">
                      {result.metadata?.language || '不明'}
                    </dd>
                  </div>
                  
                  <div>
                    <dt className="font-medium text-gray-500">音声形式:</dt>
                    <dd className="text-gray-900">
                      {result.metadata?.audioFormat?.toUpperCase() || '不明'}
                    </dd>
                  </div>
                  
                  {result.metadata?.model && (
                    <div>
                      <dt className="font-medium text-gray-500">モデル:</dt>
                      <dd className="text-gray-900">{result.metadata.model}</dd>
                    </div>
                  )}
                  
                  {result.metadata?.apiVersion && (
                    <div>
                      <dt className="font-medium text-gray-500">APIバージョン:</dt>
                      <dd className="text-gray-900">{result.metadata.apiVersion}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};