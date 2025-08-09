// Google Cloud Speech-to-Text API の型定義

export interface GoogleSpeechConfig {
  encoding: 'LINEAR16' | 'FLAC' | 'MULAW' | 'AMR' | 'AMR_WB' | 'OGG_OPUS' | 'SPEEX_WITH_HEADER_BYTE' | 'MP3' | 'WEBM_OPUS';
  sampleRateHertz?: number;
  audioChannelCount?: number;
  languageCode: string;
  alternativeLanguageCodes?: string[];
  maxAlternatives?: number;
  profanityFilter?: boolean;
  speechContexts?: SpeechContext[];
  enableWordTimeOffsets?: boolean;
  enableWordConfidence?: boolean;
  enableAutomaticPunctuation?: boolean;
  enableSpokenPunctuation?: boolean;
  enableSpokenEmojis?: boolean;
  diarizationConfig?: SpeakerDiarizationConfig;
}

export interface SpeechContext {
  phrases: string[];
  boost?: number;
}

export interface SpeakerDiarizationConfig {
  enableSpeakerDiarization: boolean;
  minSpeakerCount?: number;
  maxSpeakerCount?: number;
  speakerTag?: number;
}

// 同期認識リクエスト
export interface RecognizeRequest {
  config: GoogleSpeechConfig;
  audio: {
    content?: string;  // Base64エンコードされた音声データ
    uri?: string;      // Cloud Storage URI
  };
}

// 非同期認識リクエスト
export interface LongRunningRecognizeRequest {
  config: GoogleSpeechConfig;
  audio: {
    uri: string;  // Cloud Storage URI (必須)
  };
  outputConfig?: {
    gcsUri?: string;
  };
}

// 認識結果
export interface SpeechRecognitionResult {
  alternatives: SpeechRecognitionAlternative[];
  channelTag?: number;
  resultEndTime?: string;
  languageCode?: string;
}

export interface SpeechRecognitionAlternative {
  transcript: string;
  confidence?: number;
  words?: WordInfo[];
}

export interface WordInfo {
  startTime?: string;
  endTime?: string;
  word: string;
  confidence?: number;
  speakerTag?: number;
}

// 同期認識レスポンス
export interface RecognizeResponse {
  results?: SpeechRecognitionResult[];
  totalBilledTime?: string;
  speechAdaptationInfo?: SpeechAdaptationInfo;
  requestId?: string;
}

// 非同期認識レスポンス
export interface LongRunningRecognizeResponse {
  name: string;  // Operation name
}

// Operation状態
export interface Operation {
  name: string;
  metadata?: any;
  done: boolean;
  error?: {
    code: number;
    message: string;
    details?: any[];
  };
  response?: RecognizeResponse;
}

export interface SpeechAdaptationInfo {
  adaptationTimeout?: boolean;
  timeoutMessage?: string;
}

// エラーレスポンス
export interface GoogleSpeechError {
  error: {
    code: number;
    message: string;
    status: string;
    details?: Array<{
      '@type': string;
      [key: string]: any;
    }>;
  };
}

// 処理状態
export interface ProcessingStatus {
  phase: 'uploading' | 'processing' | 'polling' | 'completed' | 'error';
  progress: number;  // 0-100
  message: string;
  estimatedTimeRemaining?: number; // 秒
  uploadProgress?: number;  // アップロード進行状況 (0-100)
}

// 音声ファイル情報
export interface AudioFileInfo {
  duration: number;  // 秒
  sampleRate?: number;
  channels?: number;
  encoding: string;
  size: number;  // bytes
  format?: string;  // ファイル形式 (mp3, wav, flac など)
}

// Google Speech設定プリセット
export interface GoogleSpeechPreset {
  name: string;
  displayName: string;
  config: Partial<GoogleSpeechConfig>;
  description: string;
  recommended: 'general' | 'meeting' | 'phone' | 'video';
}