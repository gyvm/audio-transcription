export interface TranscriptionResult {
  id: string;
  serviceName: string;
  text: string;
  speakers?: Speaker[];
  confidence?: number;
  processingTime: number;
  timestamp: Date;
  metadata?: TranscriptionMetadata;
  requestData?: unknown;
  responseData?: unknown;
}

export interface Speaker {
  id: string;
  name?: string;
  segments: TextSegment[];
}

export interface TextSegment {
  text: string;
  startTime: number;
  endTime: number;
  confidence?: number;
  speakerId?: string;
}

export interface TranscriptionMetadata {
  audioLength: number;
  audioFormat: string;
  language: string;
  model?: string;
  apiVersion?: string;
}

export interface ServiceConfig {
  name: string;
  displayName: string;
  apiKey: string;
  endpoint: string;
  supportsSpeakerDiarization: boolean;
  maxFileSizeBytes: number;
  maxDurationSeconds: number;
  supportedFormats: string[];
}