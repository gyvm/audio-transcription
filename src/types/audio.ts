export interface AudioFile {
  file: File;
  duration?: number;
  size: number;
  format: string;
  isValid: boolean;
  validationErrors?: string[];
}

export interface AudioProcessingConfig {
  maxSizeBytes: number;
  maxDurationSeconds: number;
  supportedFormats: string[];
  enableCompression: boolean;
}