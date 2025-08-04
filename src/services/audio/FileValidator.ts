import type { AudioFile, AudioProcessingConfig } from '../../types/audio';

export class FileValidator {
  private config: AudioProcessingConfig;

  constructor(config: AudioProcessingConfig) {
    this.config = config;
  }

  validateAudioFile(file: File): AudioFile {
    const errors: string[] = [];
    
    const format = this.getFileFormat(file);
    
    if (!this.config.supportedFormats.includes(format)) {
      errors.push(`サポートされていないファイル形式です: ${format}`);
    }

    if (file.size > this.config.maxSizeBytes) {
      const maxSizeMB = Math.round(this.config.maxSizeBytes / (1024 * 1024));
      errors.push(`ファイルサイズが制限を超えています: ${maxSizeMB}MBまで`);
    }

    return {
      file,
      size: file.size,
      format,
      isValid: errors.length === 0,
      validationErrors: errors.length > 0 ? errors : undefined,
    };
  }

  private getFileFormat(file: File): string {
    if (file.type) {
      const mimeType = file.type.toLowerCase();
      if (mimeType.includes('mp3') || mimeType.includes('mpeg')) return 'mp3';
      if (mimeType.includes('wav')) return 'wav';
      if (mimeType.includes('flac')) return 'flac';
      if (mimeType.includes('m4a')) return 'm4a';
      if (mimeType.includes('mp4')) return 'mp4';
      if (mimeType.includes('ogg')) return 'ogg';
      if (mimeType.includes('webm')) return 'webm';
    }

    const extension = file.name.toLowerCase().split('.').pop() || '';
    if (['mp3', 'wav', 'flac', 'm4a', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'webm'].includes(extension)) {
      return extension;
    }

    return 'unknown';
  }
}