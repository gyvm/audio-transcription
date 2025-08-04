import React, { useState } from 'react';
import { ApiError } from '../../types/common';

interface ErrorMessageProps {
  error: any; // string | Error | ApiError | null
  onDismiss?: () => void;
  className?: string;
}

const isApiError = (error: any): error is ApiError => {
  return error instanceof ApiError || (error && error.name === 'ApiError');
};

const JsonViewer: React.FC<{ data: any }> = ({ data }) => {
  if (!data) return null;
  try {
    const formattedJson = JSON.stringify(data, null, 2);
    return (
      <pre className="text-xs bg-gray-800 text-white p-2 rounded-md overflow-x-auto">
        <code>{formattedJson}</code>
      </pre>
    );
  } catch {
    return <p className="text-xs text-red-500">Could not serialize error data.</p>;
  }
};

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  error,
  onDismiss,
  className = '',
}) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  if (!error) return null;

  const message = error.message || 'An unexpected error occurred.';
  const showDetailsButton = isApiError(error) && (error.request || error.response);

  return (
    <div className={`bg-red-50 border border-red-200 rounded-md p-4 ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-red-400"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium text-red-800">{message}</p>
          {showDetailsButton && (
            <div className="mt-2">
              <button
                onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                className="text-sm text-red-700 hover:text-red-800 font-medium"
              >
                {isDetailsOpen ? '詳細を隠す' : '詳細を表示'}
              </button>
            </div>
          )}
        </div>
        {onDismiss && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={onDismiss}
                className="inline-flex rounded-md bg-red-50 p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50"
              >
                <span className="sr-only">閉じる</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {showDetailsButton && isDetailsOpen && (
        <div className="mt-4 pl-8">
          <h3 className="text-sm font-bold text-red-900">デバッグ情報</h3>
          {isApiError(error) && error.request && (
            <div className="mt-2">
              <h4 className="text-xs font-semibold text-gray-700">Request:</h4>
              <JsonViewer data={error.request} />
            </div>
          )}
          {isApiError(error) && error.response && (
            <div className="mt-2">
              <h4 className="text-xs font-semibold text-gray-700">Response:</h4>
              <JsonViewer data={error.response} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
