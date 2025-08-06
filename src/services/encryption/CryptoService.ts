import { DEFAULT_ENCRYPTION_CONFIG } from './types';
import type { EncryptedData } from './types';

export class CryptoService {
  private static encoder = new TextEncoder();
  private static decoder = new TextDecoder();

  /**
   * パスワードからCryptoKeyを生成
   */
  private static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      this.encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: DEFAULT_ENCRYPTION_CONFIG.iterations,
        hash: 'SHA-256',
      },
      keyMaterial,
      {
        name: DEFAULT_ENCRYPTION_CONFIG.algorithm,
        length: DEFAULT_ENCRYPTION_CONFIG.keyLength,
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * ランダムなバイト配列を生成
   */
  private static generateRandomBytes(length: number): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(length));
  }

  /**
   * Uint8ArrayをBase64文字列に変換
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Base64文字列をUint8Arrayに変換
   */
  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * データを暗号化
   * @param plainText 暗号化する平文
   * @param password 暗号化パスワード
   * @returns 暗号化されたデータ
   */
  static async encrypt(plainText: string, password: string): Promise<EncryptedData> {
    try {
      // ランダムなsaltとIVを生成
      const salt = this.generateRandomBytes(DEFAULT_ENCRYPTION_CONFIG.saltLength);
      const iv = this.generateRandomBytes(DEFAULT_ENCRYPTION_CONFIG.ivLength);

      // パスワードから暗号化キーを導出
      const key = await this.deriveKey(password, salt);

      // データを暗号化
      const encodedPlainText = this.encoder.encode(plainText);
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: DEFAULT_ENCRYPTION_CONFIG.algorithm,
          iv: iv,
        },
        key,
        encodedPlainText
      );

      return {
        encryptedData: this.arrayBufferToBase64(encryptedBuffer),
        iv: this.arrayBufferToBase64(iv),
        salt: this.arrayBufferToBase64(salt),
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * データを復号化
   * @param encryptedData 暗号化されたデータ
   * @param password 復号化パスワード
   * @returns 復号化された平文
   */
  static async decrypt(encryptedData: EncryptedData, password: string): Promise<string> {
    try {
      // Base64データをArrayBufferに変換
      const salt = new Uint8Array(this.base64ToArrayBuffer(encryptedData.salt));
      const iv = new Uint8Array(this.base64ToArrayBuffer(encryptedData.iv));
      const encrypted = this.base64ToArrayBuffer(encryptedData.encryptedData);

      // パスワードから暗号化キーを導出
      const key = await this.deriveKey(password, salt);

      // データを復号化
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: DEFAULT_ENCRYPTION_CONFIG.algorithm,
          iv: iv,
        },
        key,
        encrypted
      );

      return this.decoder.decode(decryptedBuffer);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data - incorrect password or corrupted data');
    }
  }

  /**
   * パスワードの強度をチェック
   * @param password チェックするパスワード
   * @returns 強度スコア (0-100)
   */
  static checkPasswordStrength(password: string): {
    score: number;
    requirements: {
      length: boolean;
      uppercase: boolean;
      lowercase: boolean;
      numbers: boolean;
      symbols: boolean;
    };
  } {
    const requirements = {
      length: password.length >= 12,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /\d/.test(password),
      symbols: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    };

    const score = Object.values(requirements).filter(Boolean).length * 20;

    return { score, requirements };
  }

  /**
   * 暗号化テスト - 正常に暗号化・復号化できるかテスト
   */
  static async testEncryption(): Promise<boolean> {
    try {
      const testData = 'test-api-key-12345';
      const testPassword = 'test-password-123';
      
      const encrypted = await this.encrypt(testData, testPassword);
      const decrypted = await this.decrypt(encrypted, testPassword);
      
      return decrypted === testData;
    } catch (error) {
      console.error('Encryption test failed:', error);
      return false;
    }
  }
}