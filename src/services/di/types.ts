import type { ServiceConfig } from '../../types/transcription';
import { TranscriptionService } from '../transcription/base/TranscriptionService';

export type ServiceConstructor<T> = new (config: ServiceConfig) => T;

export interface DIContainerInterface {
  registerService<T extends TranscriptionService>(
    name: string,
    constructor: ServiceConstructor<T>,
    config: ServiceConfig
  ): void;
  
  getService(name: string): TranscriptionService;
  
  getAvailableServices(): Array<{ name: string; config: ServiceConfig }>;
  
  updateServiceConfig(name: string, newConfig: Partial<ServiceConfig>): void;
}