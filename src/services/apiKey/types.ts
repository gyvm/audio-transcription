export interface APIKeyConfig {
  openai?: string;
  amivoice?: string;
}

export interface APIKeyMetadata {
  service: string;
  displayName: string;
  isConfigured: boolean;
  isFromEnvironment: boolean;
  isFromUserConfig: boolean;
  configuredAt?: number;
  lastValidated?: number;
  isValid?: boolean;
}

export interface APIKeyValidationResult {
  service: string;
  isValid: boolean;
  error?: string;
  responseTime?: number;
}

export interface APIKeyManagerState {
  hasUserPassword: boolean;
  isUnlocked: boolean;
  availableKeys: APIKeyMetadata[];
}

export const API_KEY_SERVICES = {
  OPENAI: 'openai',
  AMIVOICE: 'amivoice',
} as const;

export type APIKeyService = typeof API_KEY_SERVICES[keyof typeof API_KEY_SERVICES];

export const API_KEY_SERVICE_INFO = {
  [API_KEY_SERVICES.OPENAI]: {
    displayName: 'OpenAI',
    keyFormat: /^sk-[a-zA-Z0-9]{48,}$/,
    testEndpoint: 'https://api.openai.com/v1/models',
    testMethod: 'GET',
  },
  [API_KEY_SERVICES.AMIVOICE]: {
    displayName: 'AmiVoice',
    keyFormat: /^[A-Z0-9]+$/,
    testEndpoint: 'https://acp-api.amivoice.com/v1/nologging/recognize',
    testMethod: 'POST',
  },
} as const;

export interface APIKeyTestRequest {
  service: APIKeyService;
  apiKey: string;
  timeout?: number;
}