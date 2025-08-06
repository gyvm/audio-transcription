import { useState, useCallback } from 'react';
import type { ServiceConfig } from '../types/transcription';

export const useServiceSelector = (availableServices: Array<{ name: string; config: ServiceConfig }>) => {
  const [selectedServices, setSelectedServices] = useState<string[]>(
    availableServices.length > 0 ? [availableServices[0].name] : []
  );

  const toggleService = useCallback((serviceName: string) => {
    const service = availableServices.find(s => s.name === serviceName);
    if (!service) {
      console.warn(`Service '${serviceName}' not found`);
      return;
    }

    setSelectedServices(prev => {
      if (prev.includes(serviceName)) {
        // 選択解除（ただし、最低1つは選択状態を維持）
        if (prev.length > 1) {
          return prev.filter(name => name !== serviceName);
        }
        return prev;
      } else {
        // 選択追加
        return [...prev, serviceName];
      }
    });
  }, [availableServices]);

  const selectService = useCallback((serviceName: string) => {
    const service = availableServices.find(s => s.name === serviceName);
    if (service) {
      setSelectedServices([serviceName]);
    } else {
      console.warn(`Service '${serviceName}' not found`);
    }
  }, [availableServices]);

  const getSelectedServicesConfig = useCallback((): ServiceConfig[] => {
    return selectedServices
      .map(serviceName => {
        const service = availableServices.find(s => s.name === serviceName);
        return service ? service.config : null;
      })
      .filter((config): config is ServiceConfig => config !== null);
  }, [availableServices, selectedServices]);

  const getSelectedServiceConfig = useCallback((): ServiceConfig | null => {
    const configs = getSelectedServicesConfig();
    return configs.length > 0 ? configs[0] : null;
  }, [getSelectedServicesConfig]);

  const isServiceSelected = useCallback((serviceName: string): boolean => {
    return selectedServices.includes(serviceName);
  }, [selectedServices]);

  const isServiceAvailable = useCallback((serviceName: string): boolean => {
    return availableServices.some(s => s.name === serviceName);
  }, [availableServices]);

  const getServiceDisplayName = useCallback((serviceName: string): string => {
    const service = availableServices.find(s => s.name === serviceName);
    return service ? service.config.displayName : serviceName;
  }, [availableServices]);

  return {
    selectedServices,
    selectedService: selectedServices[0] || '', // 後方互換性のため
    toggleService,
    selectService,
    getSelectedServicesConfig,
    getSelectedServiceConfig,
    isServiceSelected,
    isServiceAvailable,
    getServiceDisplayName,
    availableServices,
  };
};