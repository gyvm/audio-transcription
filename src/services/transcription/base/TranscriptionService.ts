import type { ServiceConfig, TranscriptionResult } from '../../../types/transcription';
import type { AudioFile } from '../../../types/audio';

export abstract class TranscriptionService {
  protected config: ServiceConfig;
  
  constructor(config: ServiceConfig) {
    this.config = config;
  }

  abstract transcribe(audioFile: AudioFile): Promise<TranscriptionResult>;
  
  protected validateFile(audioFile: AudioFile): void {
    if (!audioFile.isValid) {
      throw new Error('Invalid audio file');
    }
    
    if (audioFile.size > this.config.maxFileSizeBytes) {
      throw new Error('File size exceeds limit');
    }
    
    if (!this.config.supportedFormats.includes(audioFile.format)) {
      throw new Error('Unsupported file format');
    }
  }

  protected generateId(): string {
    return `${this.config.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  protected async measureProcessingTime<T>(operation: () => Promise<T>): Promise<{ result: T; time: number }> {
    const start = Date.now();
    const result = await operation();
    return {
      result,
      time: Date.now() - start
    };
  }
}