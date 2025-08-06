import React, { useState } from 'react';
import { Button } from '../common';
import { useAPIKeyManager } from '../../hooks';
import { API_KEY_SERVICE_INFO } from '../../services/apiKey';
import type { APIKeyService, APIKeyValidationResult } from '../../services/apiKey';

interface APIKeyInputProps {
  service: APIKeyService;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const APIKeyInput: React.FC<APIKeyInputProps> = ({
  service,
  value,
  onChange,
  disabled = false,
}) => {
  const { validateAPIKey } = useAPIKeyManager();
  const [showKey, setShowKey] = useState(false);
  const [validationResult, setValidationResult] = useState<APIKeyValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const serviceInfo = API_KEY_SERVICE_INFO[service];

  const handleValidate = async () => {
    if (!value.trim()) {
      setValidationResult(null);
      return;
    }

    setIsValidating(true);
    try {
      const result = await validateAPIKey(service, value.trim());
      setValidationResult(result);
    } catch (error) {
      setValidationResult({
        service,
        isValid: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleClear = () => {
    onChange('');
    setValidationResult(null);
  };

  const getValidationDisplay = () => {
    if (!validationResult) return null;

    if (validationResult.isValid) {
      return (
        <div className="flex items-center text-sm text-green-600 mt-2">
          <span className="mr-2">✅</span>
          <span>APIキーは有効です</span>
          {validationResult.responseTime && (
            <span className="ml-2 text-xs text-gray-500">
              ({validationResult.responseTime}ms)
            </span>
          )}
        </div>
      );
    }

    return (
      <div className="flex items-start text-sm text-red-600 mt-2">
        <span className="mr-2 mt-0.5">❌</span>
        <div>
          <p>APIキーが無効です</p>
          {validationResult.error && (
            <p className="text-xs text-red-500 mt-1">{validationResult.error}</p>
          )}
        </div>
      </div>
    );
  };

  const isKeyFormatValid = value ? serviceInfo.keyFormat.test(value) : true;

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {serviceInfo.displayName} APIキー
        </label>
        
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setValidationResult(null);
            }}
            className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm pr-20 ${
              !isKeyFormatValid ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
            }`}
            placeholder={`${serviceInfo.displayName} APIキーを入力`}
            disabled={disabled}
          />
          
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="text-gray-400 hover:text-gray-600 text-sm"
                disabled={disabled}
              >
                ❌
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="text-gray-400 hover:text-gray-600"
              disabled={disabled}
            >
              {showKey ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>

        {!isKeyFormatValid && (
          <p className="mt-1 text-sm text-red-600">
            無効なAPIキー形式です
          </p>
        )}

        {/* APIキー形式の説明 */}
        <div className="mt-2 text-xs text-gray-600">
          <p>期待される形式: {serviceInfo.keyFormat.toString()}</p>
          {service === 'openai' && (
            <p>例: sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</p>
          )}
          {service === 'amivoice' && (
            <p>例: ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890</p>
          )}
        </div>
      </div>

      {/* 検証ボタンと結果 */}
      <div className="flex items-center space-x-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleValidate}
          disabled={!value.trim() || !isKeyFormatValid || isValidating || disabled}
          className="text-blue-600 hover:text-blue-700"
        >
          {isValidating ? '検証中...' : 'APIキーを検証'}
        </Button>
        
        {isValidating && (
          <div className="flex items-center text-sm text-gray-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            <span>検証中...</span>
          </div>
        )}
      </div>

      {getValidationDisplay()}

      {/* サービス固有の情報 */}
      <div className="bg-gray-50 rounded-md p-3 text-xs text-gray-600">
        <h4 className="font-medium text-gray-700 mb-1">{serviceInfo.displayName} について</h4>
        {service === 'openai' && (
          <div className="space-y-1">
            <p>• OpenAI APIキーは <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">platform.openai.com</a> で取得できます</p>
            <p>• Whisper API (音声認識) を使用します</p>
            <p>• 使用量に応じて課金されます</p>
          </div>
        )}
        {service === 'amivoice' && (
          <div className="space-y-1">
            <p>• AmiVoice APIキーは契約後に提供されます</p>
            <p>• 日本語音声認識に特化したサービスです</p>
            <p>• 話者分離機能に対応しています</p>
          </div>
        )}
      </div>
    </div>
  );
};