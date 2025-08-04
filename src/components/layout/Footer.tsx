import React from 'react';

interface FooterProps {
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({
  className = '',
}) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`bg-gray-50 border-t border-gray-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span>© {currentYear} 音声文字起こしサービス</span>
          </div>

          <div className="flex items-center space-x-6 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <span>対応フォーマット:</span>
              <span className="font-medium">MP3, WAV, FLAC, M4A</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>最大:</span>
              <span className="font-medium">10分, 10MB</span>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="text-center text-xs text-gray-500">
            <p>
              このサービスは複数の音声文字起こしAPIを統合し、結果を比較できるWebアプリケーションです。
              <br />
              現在は OpenAI Whisper に対応しており、今後他のサービスも追加予定です。
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};