export const FILE_FORMATS = {
  AUDIO: ['mp3', 'wav', 'flac', 'm4a', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'webm'],
  SUPPORTED_MIME_TYPES: [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/flac',
    'audio/x-flac',
    'audio/mp4',
    'audio/m4a',
    'audio/x-m4a',
    'audio/ogg',
    'audio/webm',
  ],
} as const;

export const LIMITS = {
  DEFAULT_MAX_FILE_SIZE_MB: 10,
  DEFAULT_MAX_DURATION_MINUTES: 10,
  WHISPER_MAX_FILE_SIZE_MB: 25,
  MIN_AUDIO_DURATION_SECONDS: 1,
} as const;

export const UI_MESSAGES = {
  UPLOAD: {
    DROP_ZONE: 'ファイルを選択するか、ここにドラッグ&ドロップ',
    FILE_INFO: '最大{maxSize}MB、{maxDuration}分まで',
    PROCESSING: 'ファイルを処理中...',
  },
  TRANSCRIPTION: {
    PROCESSING: '文字起こし中...',
    COMPLETED: '文字起こしが完了しました',
    FAILED: '文字起こしに失敗しました',
  },
  ERRORS: {
    FILE_TOO_LARGE: 'ファイルサイズが制限を超えています',
    UNSUPPORTED_FORMAT: 'サポートされていないファイル形式です',
    NETWORK_ERROR: 'ネットワークエラーが発生しました',
    API_ERROR: 'APIエラーが発生しました',
    UNKNOWN_ERROR: '予期しないエラーが発生しました',
  },
} as const;

export const STORAGE_KEYS = {
  TRANSCRIPTION_RESULTS: 'transcription_results',
  USER_PREFERENCES: 'user_preferences',
  SELECTED_SERVICE: 'selected_service',
} as const;