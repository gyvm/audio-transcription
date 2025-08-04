export type Status = 'idle' | 'loading' | 'success' | 'error';

export interface ErrorInfo {
  message: string;
  code?: string;
  timestamp?: Date;
}

export interface LoadingState {
  status: Status;
  error?: ErrorInfo;
}

export type ServiceType = 'whisper' | 'google' | 'amazon';

export interface AppConfig {
  maxFileSizeMB: number;
  maxDurationMinutes: number;
  supportedFormats: string[];
  apiEndpoints: Record<ServiceType, string>;
}