import React, { useRef, useCallback } from 'react';
import { ErrorMessage } from '../common';

interface AudioUploaderProps {
  onFileSelect: (file: File) => void;
  isDragOver: boolean;
  onDragOver: (isDragOver: boolean) => void;
  error?: string | null;
  disabled?: boolean;
}

const UploadIcon: React.FC = () => (
  <svg
    className="mx-auto h-12 w-12 text-gray-400"
    stroke="currentColor"
    fill="none"
    viewBox="0 0 48 48"
    aria-hidden="true"
  >
    <path
      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const AudioUploader: React.FC<AudioUploaderProps> = ({
  onFileSelect,
  isDragOver,
  onDragOver,
  error,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      onDragOver(true);
    }
  }, [onDragOver, disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    onDragOver(false);
  }, [onDragOver]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    onDragOver(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    const audioFile = files[0];

    if (audioFile) {
      onFileSelect(audioFile);
    }
  }, [onFileSelect, onDragOver, disabled]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  const baseClasses = 'mt-2 flex justify-center rounded-lg border border-dashed px-6 py-10 transition-colors';
  const dragOverClasses = isDragOver 
    ? 'border-blue-500 bg-blue-50' 
    : 'border-gray-300 hover:border-gray-400';
  const disabledClasses = disabled 
    ? 'opacity-50 cursor-not-allowed bg-gray-50' 
    : 'cursor-pointer';

  return (
    <div className="audio-uploader">
      <div
        className={`${baseClasses} ${dragOverClasses} ${disabledClasses}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,.wav,.flac,.m4a,.mp4,.mpeg,.mpga,.oga,.ogg,.webm,audio/*"
          onChange={handleFileInputChange}
          disabled={disabled}
          className="hidden"
        />
        
        <div className="text-center">
          <UploadIcon />
          <div className="mt-4 flex text-sm leading-6 text-gray-600">
            <span className="font-semibold text-blue-600">
              ファイルを選択
            </span>
            <span className="pl-1">するか、ここにドラッグ&ドロップ</span>
          </div>
          <p className="text-xs leading-5 text-gray-600 mt-2">
            MP3, WAV, FLAC, M4A, MP4ファイル（最大10分、10MBまで）
          </p>
        </div>
      </div>
      
      {error && (
        <div className="mt-4">
          <ErrorMessage error={error} />
        </div>
      )}
    </div>
  );
};