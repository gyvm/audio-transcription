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

export class ApiError extends Error {
  public request?: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: any;
  };
  public response?: {
    status: number;
    statusText: string;
    body?: any;
  };

  constructor(message: string, details?: { request?: any; response?: any }) {
    super(message);
    this.name = 'ApiError';
    this.request = details?.request;
    this.response = details?.response;
  }
}