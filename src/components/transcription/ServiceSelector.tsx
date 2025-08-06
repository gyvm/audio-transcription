import React from 'react';
import type { ServiceConfig } from '../../types/transcription';

interface ServiceSelectorProps {
  availableServices: Array<{ name: string; config: ServiceConfig }>;
  selectedServices?: string[];
  selectedService?: string;
  onServiceToggle?: (serviceName: string) => void;
  onServiceSelect?: (serviceName: string) => void;
  disabled?: boolean;
  className?: string;
}

export const ServiceSelector: React.FC<ServiceSelectorProps> = ({
  availableServices,
  selectedServices,
  selectedService,
  onServiceToggle,
  onServiceSelect,
  disabled = false,
  className = '',
}) => {
  const isMultipleMode = selectedServices && onServiceToggle;
  const currentSelectedServices = selectedServices || (selectedService ? [selectedService] : []);

  const handleCheckboxChange = (serviceName: string) => {
    if (onServiceToggle) {
      onServiceToggle(serviceName);
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onServiceSelect) {
      onServiceSelect(e.target.value);
    }
  };

  if (isMultipleMode) {
    return (
      <div className={`space-y-4 ${className}`}>
        <label className="block text-sm font-medium text-gray-700">
          文字起こしサービス（複数選択可）
        </label>
        
        <div className="space-y-3">
          {availableServices.map(({ name, config }) => {
            const isSelected = currentSelectedServices.includes(name);
            const maxSizeMB = Math.round(config.maxFileSizeBytes / (1024 * 1024));
            const maxMinutes = Math.round(config.maxDurationSeconds / 60);
            
            return (
              <div
                key={name}
                className={`relative rounded-lg border p-4 ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                onClick={() => !disabled && handleCheckboxChange(name)}
              >
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleCheckboxChange(name)}
                    disabled={disabled}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:cursor-not-allowed"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900">
                        {config.displayName}
                      </h4>
                      {config.supportsSpeakerDiarization && (
                        <span className="text-xs text-green-600 font-medium">
                          ✓ 話者分離
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-gray-500 space-y-1">
                      <p>最大ファイルサイズ: {maxSizeMB}MB • 最大音声長: {maxMinutes}分</p>
                      <p>対応形式: {config.supportedFormats.join(', ').toUpperCase()}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {currentSelectedServices.length > 0 && (
          <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-md">
            選択中: {currentSelectedServices.map(serviceName => {
              const service = availableServices.find(s => s.name === serviceName);
              return service ? service.config.displayName : serviceName;
            }).join(', ')}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <label htmlFor="service-select" className="block text-sm font-medium text-gray-700">
        文字起こしサービス
      </label>
      
      <select
        id="service-select"
        value={selectedService || ''}
        onChange={handleSelectChange}
        disabled={disabled}
        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed sm:text-sm"
      >
        {availableServices.map(({ name, config }) => (
          <option key={name} value={name}>
            {config.displayName}
          </option>
        ))}
      </select>

      {availableServices.length > 0 && selectedService && (
        <div className="text-xs text-gray-500">
          {(() => {
            const service = availableServices.find(s => s.name === selectedService);
            if (!service) return null;
            
            const { config } = service;
            const maxSizeMB = Math.round(config.maxFileSizeBytes / (1024 * 1024));
            const maxMinutes = Math.round(config.maxDurationSeconds / 60);
            
            return (
              <div className="space-y-1">
                <p>最大ファイルサイズ: {maxSizeMB}MB</p>
                <p>最大音声長: {maxMinutes}分</p>
                <p>対応形式: {config.supportedFormats.join(', ').toUpperCase()}</p>
                {config.supportsSpeakerDiarization && (
                  <p className="text-green-600">✓ 話者分離対応</p>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};