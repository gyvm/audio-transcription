import { useState, useCallback } from 'react';
import type { ServiceConfig } from '../types/transcription';

export const useServiceSelector = (availableServices: Array<{ name: string; config: ServiceConfig }>) => {
  const [selectedService, setSelectedService] = useState<string>(
    availableServices.length > 0 ? availableServices[0].name : ''
  );

  const selectService = useCallback((serviceName: string) => {
    const service = availableServices.find(s => s.name === serviceName);
    if (service) {
      setSelectedService(serviceName);
    } else {
      console.warn(`Service '${serviceName}' not found`);
    }
  }, [availableServices]);

  const getSelectedServiceConfig = useCallback((): ServiceConfig | null => {
    const service = availableServices.find(s => s.name === selectedService);
    return service ? service.config : null;
  }, [availableServices, selectedService]);

  const isServiceAvailable = useCallback((serviceName: string): boolean => {
    return availableServices.some(s => s.name === serviceName);
  }, [availableServices]);

  const getServiceDisplayName = useCallback((serviceName: string): string => {
    const service = availableServices.find(s => s.name === serviceName);
    return service ? service.config.displayName : serviceName;
  }, [availableServices]);

  return {
    selectedService,
    selectService,
    getSelectedServiceConfig,
    isServiceAvailable,
    getServiceDisplayName,
    availableServices,
  };
};