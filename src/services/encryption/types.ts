export interface EncryptedData {
  encryptedData: string;
  iv: string;
  salt: string;
  authTag?: string;
}

export interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  saltLength: number;
  iterations: number;
}

export interface CryptoKeyPair {
  key: CryptoKey;
  iv: Uint8Array;
  salt: Uint8Array;
}

export const DEFAULT_ENCRYPTION_CONFIG: EncryptionConfig = {
  algorithm: 'AES-GCM',
  keyLength: 256,
  ivLength: 12, // 96 bits for GCM
  saltLength: 32, // 256 bits
  iterations: 100000, // PBKDF2 iterations
};