import React from 'react';
import type { ServiceConfig } from '../../types/transcription';

interface ServiceSelectorProps {
  availableServices: Array<{ name: string; config: ServiceConfig }>;
  selectedService: string;
  onServiceSelect: (serviceName: string) => void;
  disabled?: boolean;
  className?: string;
}

export const ServiceSelector: React.FC<ServiceSelectorProps> = ({
  availableServices,
  selectedService,
  onServiceSelect,
  disabled = false,
  className = '',
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onServiceSelect(e.target.value);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label htmlFor="service-select" className="block text-sm font-medium text-gray-700">
        文字起こしサービス
      </label>
      
      <select
        id="service-select"
        value={selectedService}
        onChange={handleChange}
        disabled={disabled}
        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed sm:text-sm"
      >
        {availableServices.map(({ name, config }) => (
          <option key={name} value={name}>
            {config.displayName}
          </option>
        ))}
      </select>

      {availableServices.length > 0 && (
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