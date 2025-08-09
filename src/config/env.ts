interface EnvConfig {
  openaiApiKey: string;
  amivoiceApiKey: string;
  googleSpeechApiKey: string;
  appName: string;
  maxFileSizeMB: number;
  maxDurationMinutes: number;
  devMode: boolean;
}

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = import.meta.env[key];
  if (!value && !defaultValue) {
    console.warn(`Environment variable ${key} is not set`);
    return '';
  }
  return value || defaultValue || '';
};

const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = import.meta.env[key];
  const parsed = value ? parseInt(value, 10) : defaultValue;
  return isNaN(parsed) ? defaultValue : parsed;
};

const getEnvBoolean = (key: string, defaultValue: boolean): boolean => {
  const value = import.meta.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
};

export const env: EnvConfig = {
  openaiApiKey: getEnvVar('VITE_OPENAI_API_KEY'),
  amivoiceApiKey: getEnvVar('VITE_AMIVOICE_API_KEY'),
  googleSpeechApiKey: getEnvVar('VITE_GOOGLE_SPEECH_API_KEY'),
  appName: getEnvVar('VITE_APP_NAME', '音声文字起こしサービス'),
  maxFileSizeMB: getEnvNumber('VITE_MAX_FILE_SIZE_MB', 10),
  maxDurationMinutes: getEnvNumber('VITE_MAX_DURATION_MINUTES', 10),
  devMode: getEnvBoolean('VITE_DEV_MODE', import.meta.env.DEV),
};

export const validateEnv = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!env.openaiApiKey) {
    errors.push('OpenAI API key is required. Please set VITE_OPENAI_API_KEY in your .env file.');
  }

  if (env.maxFileSizeMB <= 0) {
    errors.push('Max file size must be greater than 0');
  }

  if (env.maxDurationMinutes <= 0) {
    errors.push('Max duration must be greater than 0');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};