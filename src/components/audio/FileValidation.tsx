import React from 'react';
import type { AudioFile } from '../../types/audio';

interface FileValidationProps {
  audioFile: AudioFile;
  className?: string;
}

export const FileValidation: React.FC<FileValidationProps> = ({
  audioFile,
  className = '',
}) => {
  if (audioFile.isValid) {
    return (
      <div className={`bg-green-50 border border-green-200 rounded-md p-3 ${className}`}>
        <div className="flex items-center">
          <svg
            className="h-5 w-5 text-green-400 mr-2"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-sm text-green-800 font-medium">
            ファイルは有効です
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-red-50 border border-red-200 rounded-md p-3 ${className}`}>
      <div className="flex items-start">
        <svg
          className="h-5 w-5 text-red-400 mr-2 mt-0.5 flex-shrink-0"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800 mb-1">
            ファイルエラー
          </h3>
          {audioFile.validationErrors && (
            <ul className="text-sm text-red-700 space-y-1">
              {audioFile.validationErrors.map((error, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-1">•</span>
                  <span>{error}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};