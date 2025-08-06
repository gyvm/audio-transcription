import React, { useState } from 'react';
import { Button } from './Button';

interface JSONViewerProps {
  data: unknown;
  title: string;
  className?: string;
}

export const JSONViewer: React.FC<JSONViewerProps> = ({
  data,
  title,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!data) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        {title}データがありません
      </div>
    );
  }

  const jsonString = JSON.stringify(data, null, 2);
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
    } catch (err) {
      console.error('クリップボードへのコピーに失敗しました:', err);
    }
  };

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h5 className="text-sm font-medium text-gray-700">{title}</h5>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={copyToClipboard}
            className="text-blue-600 hover:text-blue-700"
          >
            コピー
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? '折りたたむ' : '展開'}
          </Button>
        </div>
      </div>
      
      <div 
        className={`bg-gray-900 text-gray-100 rounded-md p-4 text-xs font-mono overflow-x-auto transition-all duration-200 ${
          isExpanded ? 'max-h-96' : 'max-h-32'
        }`}
      >
        <pre className="whitespace-pre-wrap break-words">
          {jsonString}
        </pre>
      </div>
      
      {!isExpanded && jsonString.length > 500 && (
        <div className="text-xs text-gray-500 mt-2">
          データが長いため一部のみ表示しています。「展開」をクリックして全体を確認してください。
        </div>
      )}
    </div>
  );
};