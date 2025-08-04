import { FILE_FORMATS, LIMITS } from './constants';

export const isAudioFile = (file: File): boolean => {
  // Check MIME type first
  if (FILE_FORMATS.SUPPORTED_MIME_TYPES.includes(file.type.toLowerCase() as any)) {
    return true;
  }

  // Fall back to file extension
  const extension = file.name.toLowerCase().split('.').pop();
  return extension ? FILE_FORMATS.AUDIO.includes(extension as any) : false;
};

export const validateFileSize = (file: File, maxSizeBytes: number): boolean => {
  return file.size <= maxSizeBytes;
};

export const validateAudioDuration = (duration: number, maxDurationSeconds: number): boolean => {
  return duration >= LIMITS.MIN_AUDIO_DURATION_SECONDS && duration <= maxDurationSeconds;
};

export const validateApiKey = (apiKey: string): boolean => {
  // OpenAI API keys start with 'sk-' and are typically 51 characters long
  if (apiKey.startsWith('sk-') && apiKey.length >= 20) {
    return true;
  }
  return false;
};

export const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const sanitizeFilename = (filename: string): string => {
  // Remove or replace invalid characters for file names
  return filename
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .toLowerCase();
};

export const validateTextLength = (text: string, maxLength: number): boolean => {
  return text.length <= maxLength;
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};