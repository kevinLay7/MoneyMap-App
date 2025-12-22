import CryptoJS from 'crypto-js';
import { encryptionCredentialsService } from './encryption-credentials-service';

/**
 * Service for encrypting and decrypting sync records.
 * Uses AES-256-CBC encryption with PBKDF2 key derivation.
 */
class SyncEncryptionService {
  private readonly PBKDF2_ITERATIONS = 10000;
  private readonly KEY_SIZE = 256 / 32; // 256 bits = 32 bytes
  private readonly IV_SIZE = 128 / 32; // 128 bits = 16 bytes

  /**
   * Derives an encryption key from password and salt using PBKDF2.
   */
  private async deriveKey(password: string, salt: string): Promise<CryptoJS.lib.WordArray> {
    return CryptoJS.PBKDF2(password, salt, {
      keySize: this.KEY_SIZE,
      iterations: this.PBKDF2_ITERATIONS,
    });
  }

  /**
   * Encrypts a record object.
   * @param record The record object to encrypt
   * @returns Encrypted record as a string
   */
  async encryptRecord(record: any): Promise<string> {
    const credentials = await encryptionCredentialsService.getCredentials();
    if (!credentials) {
      throw new Error('Encryption credentials not found. User must be authenticated.');
    }

    // Serialize the record to JSON
    const plaintext = JSON.stringify(record);

    // Derive encryption key from password and salt
    const key = await this.deriveKey(credentials.password, credentials.salt);

    // Generate a random IV for each encryption
    const iv = CryptoJS.lib.WordArray.random(this.IV_SIZE);

    // Encrypt using AES-256-CBC
    const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    // Combine IV and ciphertext, then encode as base64
    const combined = iv.concat(encrypted.ciphertext);
    return combined.toString(CryptoJS.enc.Base64);
  }

  /**
   * Decrypts an encrypted record string.
   * @param encryptedRecord The encrypted record string
   * @returns Decrypted record object
   */
  async decryptRecord(encryptedRecord: string): Promise<any> {
    const credentials = await encryptionCredentialsService.getCredentials();
    if (!credentials) {
      throw new Error('Encryption credentials not found. User must be authenticated.');
    }

    // Decode from base64
    const combined = CryptoJS.enc.Base64.parse(encryptedRecord);

    // Extract IV (first 16 bytes) and ciphertext (rest)
    const iv = CryptoJS.lib.WordArray.create(combined.words.slice(0, this.IV_SIZE));
    const ciphertext = CryptoJS.lib.WordArray.create(combined.words.slice(this.IV_SIZE));

    // Derive decryption key from password and salt
    const key = await this.deriveKey(credentials.password, credentials.salt);

    // Decrypt using AES-256-CBC
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: ciphertext } as CryptoJS.lib.CipherParams,
      key,
      {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      }
    );

    // Convert to string and parse JSON
    const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
    return JSON.parse(plaintext);
  }

  /**
   * Encrypts an array of records.
   * @param records Array of record objects to encrypt
   * @returns Array of encrypted record strings
   */
  async encryptRecords(records: any[]): Promise<string[]> {
    return Promise.all(records.map(record => this.encryptRecord(record)));
  }

  /**
   * Decrypts an array of encrypted record strings.
   * @param encryptedRecords Array of encrypted record strings
   * @returns Array of decrypted record objects
   */
  async decryptRecords(encryptedRecords: string[]): Promise<any[]> {
    return Promise.all(encryptedRecords.map(encrypted => this.decryptRecord(encrypted)));
  }
}

export const syncEncryptionService = new SyncEncryptionService();

