import { useCallback } from 'react';
import type { ErrorInfo } from '../types/common';

class TranscriptionError extends Error {
  public readonly code: string;
  public readonly details?: any;
  
  constructor(
    message: string,
    code: string,
    details?: any
  ) {
    super(message);
    this.name = 'TranscriptionError';
    this.code = code;
    this.details = details;
  }
}

export { TranscriptionError };

const ERROR_CODES = {
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
  API_ERROR: 'API_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  INVALID_API_KEY: 'INVALID_API_KEY',
  FILE_DURATION_TOO_LONG: 'FILE_DURATION_TOO_LONG',
} as const;

export { ERROR_CODES };

export const useErrorHandler = () => {
  const handleError = useCallback((error: unknown): ErrorInfo => {
    if (error instanceof TranscriptionError) {
      return {
        message: error.message,
        code: error.code,
        timestamp: new Date(),
      };
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        message: 'ネットワークエラーが発生しました。インターネット接続を確認してください。',
        code: ERROR_CODES.NETWORK_ERROR,
        timestamp: new Date(),
      };
    }

    if (error instanceof Error) {
      if (error.message.includes('401')) {
        return {
          message: 'APIキーが無効です。設定を確認してください。',
          code: ERROR_CODES.INVALID_API_KEY,
          timestamp: new Date(),
        };
      }

      if (error.message.includes('File size exceeds limit')) {
        return {
          message: 'ファイルサイズが制限を超えています。',
          code: ERROR_CODES.FILE_TOO_LARGE,
          timestamp: new Date(),
        };
      }

      if (error.message.includes('Unsupported file format')) {
        return {
          message: 'サポートされていないファイル形式です。',
          code: ERROR_CODES.UNSUPPORTED_FORMAT,
          timestamp: new Date(),
        };
      }
    }

    return {
      message: '予期しないエラーが発生しました。',
      code: ERROR_CODES.UNKNOWN_ERROR,
      timestamp: new Date(),
    };
  }, []);

  const createError = useCallback((message: string, code: string, details?: any): TranscriptionError => {
    return new TranscriptionError(message, code, details);
  }, []);

  return {
    handleError,
    createError,
    ERROR_CODES,
  };
};