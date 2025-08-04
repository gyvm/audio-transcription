import type { ServiceConfig } from '../../types/transcription';
import { TranscriptionService } from '../transcription/base/TranscriptionService';
import type { ServiceConstructor, DIContainerInterface } from './types';

export class DIContainer implements DIContainerInterface {
  private services = new Map<string, TranscriptionService>();
  private serviceConfigs = new Map<string, ServiceConfig>();
  private serviceConstructors = new Map<string, ServiceConstructor<TranscriptionService>>();

  registerService<T extends TranscriptionService>(
    name: string,
    constructor: ServiceConstructor<T>,
    config: ServiceConfig
  ): void {
    this.serviceConfigs.set(name, config);
    this.serviceConstructors.set(name, constructor as ServiceConstructor<TranscriptionService>);
    const instance = new constructor(config);
    this.services.set(name, instance);
  }

  getService(name: string): TranscriptionService {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service '${name}' not found`);
    }
    return service;
  }

  getAvailableServices(): Array<{ name: string; config: ServiceConfig }> {
    return Array.from(this.serviceConfigs.entries()).map(([name, config]) => ({
      name,
      config,
    }));
  }

  updateServiceConfig(name: string, newConfig: Partial<ServiceConfig>): void {
    const currentConfig = this.serviceConfigs.get(name);
    if (!currentConfig) {
      throw new Error(`Service '${name}' not found`);
    }

    const ServiceClass = this.serviceConstructors.get(name);
    if (!ServiceClass) {
      throw new Error(`Service constructor for '${name}' not found`);
    }

    const updatedConfig = { ...currentConfig, ...newConfig };
    this.serviceConfigs.set(name, updatedConfig);
    
    const newInstance = new ServiceClass(updatedConfig);
    this.services.set(name, newInstance);
  }
}