import type { GoogleSpeechConfig, GoogleSpeechPreset } from './GoogleSpeechTypes';

// Google Speech-to-Text API エンドポイント
export const GOOGLE_SPEECH_ENDPOINTS = {
  SYNC_RECOGNIZE: 'https://speech.googleapis.com/v1p1beta1/speech:recognize', // MP3サポート用にベータ版を使用
  ASYNC_RECOGNIZE: 'https://speech.googleapis.com/v1p1beta1/speech:longrunningrecognize', // MP3サポート用にベータ版を使用
  OPERATIONS: 'https://speech.googleapis.com/v1p1beta1/operations', // MP3サポート用にベータ版を使用
} as const;

// サポートされている音声フォーマット
export const SUPPORTED_ENCODINGS = {
  WAV: 'LINEAR16',
  FLAC: 'FLAC', 
  MP3: 'MP3',
  OGG: 'OGG_OPUS',
  WEBM: 'WEBM_OPUS',
} as const;

// デフォルト設定
export const DEFAULT_CONFIG: GoogleSpeechConfig = {
  encoding: 'LINEAR16',
  sampleRateHertz: 16000,
  languageCode: 'ja-JP',
  alternativeLanguageCodes: ['en-US'],
  maxAlternatives: 1,
  enableWordTimeOffsets: true,
  enableWordConfidence: true,
  enableAutomaticPunctuation: true,
  profanityFilter: false,
  diarizationConfig: {
    enableSpeakerDiarization: true,
    minSpeakerCount: 1,
    maxSpeakerCount: 6,
  },
};

// 言語設定
export const SUPPORTED_LANGUAGES = {
  'ja-JP': '日本語',
  'en-US': '英語（米国）',
  'en-GB': '英語（英国）',
  'ko-KR': '韓国語',
  'zh-CN': '中国語（簡体）',
  'zh-TW': '中国語（繁体）',
} as const;

// 設定プリセット
export const SPEECH_PRESETS: GoogleSpeechPreset[] = [
  {
    name: 'general',
    displayName: '一般的な音声',
    config: {
      ...DEFAULT_CONFIG,
      enableAutomaticPunctuation: true,
      diarizationConfig: {
        enableSpeakerDiarization: true,
        maxSpeakerCount: 4,
      },
    },
    description: '一般的な会話や音声に最適',
    recommended: 'general',
  },
  {
    name: 'meeting', 
    displayName: '会議・ミーティング',
    config: {
      ...DEFAULT_CONFIG,
      enableAutomaticPunctuation: true,
      diarizationConfig: {
        enableSpeakerDiarization: true,
        minSpeakerCount: 2,
        maxSpeakerCount: 10,
      },
      speechContexts: [
        {
          phrases: ['会議', 'ミーティング', '議題', '資料', 'プロジェクト'],
          boost: 5.0,
        },
      ],
    },
    description: '複数人の会議やミーティングに最適',
    recommended: 'meeting',
  },
  {
    name: 'phone',
    displayName: '電話音声', 
    config: {
      ...DEFAULT_CONFIG,
      sampleRateHertz: 8000,
      enableAutomaticPunctuation: true,
      diarizationConfig: {
        enableSpeakerDiarization: true,
        maxSpeakerCount: 2,
      },
    },
    description: '電話音声の品質に最適化',
    recommended: 'phone',
  },
  {
    name: 'video',
    displayName: 'ビデオ・録画',
    config: {
      ...DEFAULT_CONFIG,
      enableAutomaticPunctuation: true,
      enableSpokenPunctuation: false,
      diarizationConfig: {
        enableSpeakerDiarization: true,
        maxSpeakerCount: 6,
      },
    },
    description: 'ビデオ録画や配信音声に最適',
    recommended: 'video',
  },
];

// ファイル形式と対応するエンコーディングのマッピング
export const FILE_FORMAT_TO_ENCODING: Record<string, keyof typeof SUPPORTED_ENCODINGS> = {
  'wav': 'WAV',
  'flac': 'FLAC',
  'mp3': 'MP3',
  'ogg': 'OGG', 
  'webm': 'WEBM',
  'm4a': 'MP3', // M4Aは近似的にMP3として扱う
};

// 制限値
export const LIMITS = {
  SYNC_MAX_DURATION_SECONDS: 60, // Google公式制限：60秒
  SYNC_MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  ASYNC_MAX_DURATION_SECONDS: 480 * 60, // 480分 = 8時間
  ASYNC_MAX_FILE_SIZE_BYTES: 1024 * 1024 * 1024, // 1GB (Cloud Storage経由)
  MAX_ALTERNATIVES: 30,
  MAX_SPEECH_CONTEXTS: 500,
  POLLING_INTERVAL_MS: 3000, // 3秒間隔でポーリング
  MAX_POLLING_ATTEMPTS: 1200, // 最大60分間ポーリング (3秒 × 1200 = 3600秒)
} as const;

// デバッグ設定
export const DEBUG_CONFIG = {
  LOG_REQUESTS: true, // 一時的に強制有効化
  LOG_RESPONSES: true, // 一時的に強制有効化
  LOG_PROGRESS: true,
  MOCK_LONG_PROCESSING: false, // テスト用：長時間処理をモック
} as const;