import { useState, useCallback } from 'react';
import type { AudioFile, AudioProcessingConfig } from '../types/audio';
import { FileValidator } from '../services/audio/FileValidator';
import { AudioProcessor } from '../services/audio/AudioProcessor';
import { AudioUtils } from '../services/audio/AudioUtils';

const defaultConfig: AudioProcessingConfig = {
  maxSizeBytes: 10 * 1024 * 1024, // 10MB
  maxDurationSeconds: 600, // 10 minutes
  supportedFormats: ['mp3', 'wav', 'flac', 'm4a', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'webm'],
  enableCompression: false,
};

export const useAudioUpload = (config: AudioProcessingConfig = defaultConfig) => {
  const [audioFile, setAudioFile] = useState<AudioFile | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const validator = new FileValidator(config);
  const processor = new AudioProcessor();

  const validateAndProcessFile = useCallback(async (file: File): Promise<AudioFile> => {
    if (!AudioUtils.isAudioFile(file)) {
      throw new Error('選択されたファイルは音声ファイルではありません');
    }

    const audioFileInfo = validator.validateAudioFile(file);
    
    if (!audioFileInfo.isValid) {
      throw new Error(audioFileInfo.validationErrors?.join(', ') || 'Invalid file');
    }

    try {
      const enhancedFile = await processor.enhanceAudioFile(audioFileInfo);
      
      if (enhancedFile.duration && !AudioUtils.validateAudioDuration(enhancedFile.duration, config.maxDurationSeconds)) {
        const maxMinutes = Math.floor(config.maxDurationSeconds / 60);
        throw new Error(`音声の長さが制限を超えています。${maxMinutes}分以内にしてください。`);
      }

      return enhancedFile;
    } catch (error) {
      if (error instanceof Error && error.message.includes('音声の長さ')) {
        throw error;
      }
      console.warn('Could not enhance audio file:', error);
      return audioFileInfo;
    }
  }, [validator, processor, config]);

  const handleFileSelect = useCallback(async (file: File) => {
    setUploadError(null);
    setIsProcessing(true);
    
    try {
      const processedFile = await validateAndProcessFile(file);
      setAudioFile(processedFile);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'ファイルの処理中にエラーが発生しました';
      setUploadError(errorMessage);
      setAudioFile(null);
    } finally {
      setIsProcessing(false);
    }
  }, [validateAndProcessFile]);

  const handleDrop = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const audioFile = fileArray.find(file => AudioUtils.isAudioFile(file));
    
    if (audioFile) {
      handleFileSelect(audioFile);
    } else {
      setUploadError('音声ファイルが見つかりませんでした');
    }
  }, [handleFileSelect]);

  const clearFile = useCallback(() => {
    if (audioFile?.file) {
      const url = AudioUtils.createAudioPreviewUrl(audioFile.file);
      AudioUtils.revokeAudioPreviewUrl(url);
    }
    setAudioFile(null);
    setUploadError(null);
  }, [audioFile]);

  const getFileInfo = useCallback(() => {
    if (!audioFile) return null;

    return {
      name: audioFile.file.name,
      size: processor.formatFileSize(audioFile.size),
      duration: audioFile.duration ? processor.formatDuration(audioFile.duration) : '不明',
      format: audioFile.format.toUpperCase(),
    };
  }, [audioFile, processor]);

  return {
    audioFile,
    isDragOver,
    uploadError,
    isProcessing,
    setIsDragOver,
    handleFileSelect,
    handleDrop,
    clearFile,
    getFileInfo,
  };
};