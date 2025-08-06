import React, { useState } from 'react';
import { Button } from './Button';

interface JSONDataViewerProps {
  data: unknown;
  title: string;
  className?: string;
}

export const JSONDataViewer: React.FC<JSONDataViewerProps> = ({
  data,
  title,
  className = '',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
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
      // TODO: トースト通知を追加
    } catch (err) {
      console.error('クリップボードへのコピーに失敗しました:', err);
    }
  };

  const openInNewTab = () => {
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head>
            <title>${title} - JSON Data</title>
            <style>
              body { 
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; 
                margin: 20px; 
                background: #1a1a1a; 
                color: #e5e5e5; 
              }
              pre { 
                white-space: pre-wrap; 
                word-wrap: break-word; 
                line-height: 1.4;
              }
              .header {
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 1px solid #333;
              }
              .title {
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 10px;
              }
              .copy-btn {
                background: #3b82f6;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
              }
              .copy-btn:hover {
                background: #2563eb;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">${title}</div>
              <button class="copy-btn" onclick="navigator.clipboard.writeText(document.querySelector('pre').textContent)">
                Copy JSON
              </button>
            </div>
            <pre>${jsonString}</pre>
          </body>
        </html>
      `);
      newWindow.document.close();
    }
  };

  return (
    <div className={className}>
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
            onClick={openInNewTab}
            className="text-green-600 hover:text-green-700"
          >
            別タブで表示
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="text-purple-600 hover:text-purple-700"
          >
            拡大表示
          </Button>
        </div>
      </div>
      
      <div className="bg-gray-900 text-gray-100 rounded-md p-4 text-xs font-mono overflow-x-auto">
        <pre className="whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
          {jsonString}
        </pre>
      </div>

      {/* モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-medium text-gray-900">{title}</h3>
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
                  onClick={openInNewTab}
                  className="text-green-600 hover:text-green-700"
                >
                  別タブで表示
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-600 hover:text-gray-700"
                >
                  閉じる
                </Button>
              </div>
            </div>
            <div className="flex-1 p-6 overflow-hidden">
              <div className="bg-gray-900 text-gray-100 rounded-md p-4 text-sm font-mono h-full overflow-auto">
                <pre className="whitespace-pre-wrap break-words">
                  {jsonString}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};