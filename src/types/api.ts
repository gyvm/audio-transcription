export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

export interface ApiError {
  message: string;
  code: string;
  details?: any;
}

export interface WhisperApiResponse {
  text: string;
  segments?: Array<{
    text: string;
    start: number;
    end: number;
    avg_logprob: number;
    speaker?: string;
  }>;
  speakers?: any;
  duration?: number;
  language?: string;
}