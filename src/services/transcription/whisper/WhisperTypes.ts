export interface WhisperApiSegment {
  text: string;
  start: number;
  end: number;
  avg_logprob: number;
  speaker?: string;
}

export interface WhisperApiResponse {
  text: string;
  segments?: WhisperApiSegment[];
  speakers?: any;
  duration?: number;
  language?: string;
}

export interface WhisperRequestOptions {
  model: string;
  response_format: string;
  timestamp_granularities: string[];
  speaker_diarization?: boolean;
  language?: string;
}