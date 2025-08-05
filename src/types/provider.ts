import type { TranscriptionResult, ServiceConfig } from './transcription';
import type { AudioFile } from './audio';

// API呼び出しの詳細情報
export interface APICallDetails {
  request: any;
  response: any;
  processingTime: number;
  timestamp: Date;
  success: boolean;
  error?: string;
}

// 拡張された文字起こし結果（デバッグ情報付き）
export interface EnhancedTranscriptionResult extends TranscriptionResult {
  apiId: string;
  apiCallDetails: APICallDetails;
}

// プロバイダーの機能定義
export interface ServiceCapabilities {
  supportsBatch: boolean;
  supportsRealtime: boolean;
  supportsCustomModels: boolean;
  maxConcurrentRequests: number;
  supportedLanguages: string[];
}

// プロバイダー情報
export interface ProviderInfo {
  id: string;
  name: string;
  description: string;
  capabilities: ServiceCapabilities;
  services: ServiceConfig[];
}

// 複数API実行結果
export interface MultiAPIResult {
  audioFile: AudioFile;
  results: EnhancedTranscriptionResult[];
  completedCount: number;
  totalCount: number;
  isCompleted: boolean;
  errors: Array<{
    apiId: string;
    error: string;
  }>;
}