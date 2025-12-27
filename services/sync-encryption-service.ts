import { pbkdf2, randomBytes, createCipheriv, createDecipheriv } from 'react-native-quick-crypto';
import { Buffer } from '@craftzdog/react-native-buffer';
import { encryptionCredentialsService } from './encryption-credentials-service';

/**
 * Service for encrypting and decrypting sync records.
 * Uses AES-256-CBC encryption with PBKDF2 key derivation.
 * 
 * Now uses react-native-quick-crypto which runs all crypto operations
 * on native threads - completely non-blocking to the JS thread.
 */
class SyncEncryptionService {
  private readonly PBKDF2_ITERATIONS = 10000;
  private readonly KEY_LENGTH = 32; // 256 bits
  private readonly IV_LENGTH = 16; // 128 bits
  private readonly ALGORITHM = 'aes-256-cbc';
  private readonly BATCH_SIZE = 20; // Larger batches since crypto is now non-blocking

  // Key cache to avoid deriving key for every record
  private cachedKey: Buffer | null = null;
  private cachedKeyHash: string | null = null;

  /**
   * Yields to the event loop to prevent blocking the UI.
   * Still useful for large batches to allow React to process updates.
   */
  private yieldToEventLoop(): Promise<void> {
    return new Promise(resolve => setImmediate(resolve));
  }

  /**
   * Derives an encryption key from password and salt using PBKDF2.
   * Results are cached to avoid expensive re-derivation.
   * Runs on native thread via react-native-quick-crypto.
   */
  private async deriveKey(password: string, salt: string): Promise<Buffer> {
    const keyHash = `${password}:${salt}`;

    if (this.cachedKey && this.cachedKeyHash === keyHash) {
      return this.cachedKey;
    }

    // PBKDF2 runs on native thread - non-blocking
    const key = await new Promise<Buffer>((resolve, reject) => {
      pbkdf2(password, salt, this.PBKDF2_ITERATIONS, this.KEY_LENGTH, 'sha256', (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey as Buffer);
      });
    });

    this.cachedKey = key;
    this.cachedKeyHash = keyHash;

    return key;
  }

  /**
   * Clears the cached encryption key.
   * Call this when the user logs out or changes their encryption password.
   */
  clearKeyCache(): void {
    this.cachedKey = null;
    this.cachedKeyHash = null;
  }

  /**
   * Encrypts a record object.
   * @param record The record object to encrypt
   * @returns Encrypted record as a base64 string
   */
  async encryptRecord(record: { id: string; record: any }): Promise<{ id: string; record: string }> {
    const credentials = await encryptionCredentialsService.getCredentials();
    if (!credentials) {
      throw new Error('Encryption credentials not found. User must be authenticated.');
    }

    const plaintext = JSON.stringify(record);
    const key = await this.deriveKey(credentials.password, credentials.salt);

    // Generate random IV - runs on native thread
    const iv = randomBytes(this.IV_LENGTH);

    // Encrypt using AES-256-CBC - runs on native thread
    const cipher = createCipheriv(this.ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

    // Combine IV and ciphertext, encode as base64
    const combined = Buffer.concat([iv, encrypted]);
    return { id: record.id, record: combined.toString('base64') };
  }

  /**
   * Decrypts an encrypted record string.
   * @param encryptedRecord The encrypted record string (base64)
   * @returns Decrypted record object
   */
  async decryptRecord(encryptedRecord: string): Promise<any> {
    const credentials = await encryptionCredentialsService.getCredentials();
    if (!credentials) {
      throw new Error('Encryption credentials not found. User must be authenticated.');
    }

    const combined = Buffer.from(encryptedRecord, 'base64');

    // Extract IV (first 16 bytes) and ciphertext (rest)
    const iv = combined.subarray(0, this.IV_LENGTH);
    const ciphertext = combined.subarray(this.IV_LENGTH);

    const key = await this.deriveKey(credentials.password, credentials.salt);

    // Decrypt using AES-256-CBC - runs on native thread
    const decipher = createDecipheriv(this.ALGORITHM, key, iv);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

    const plaintext = decrypted.toString('utf8');
    const record = JSON.parse(plaintext);
    delete record.record._changed;
    delete record.record._status;
    return record.record;
  }

  /**
   * Encrypts an array of records in batches, yielding between batches.
   * Crypto operations run on native threads, but we still yield to allow
   * React to process state updates for large datasets.
   */
  async encryptRecords(records: any[]): Promise<{ id: string; record: string }[]> {
    const results: { id: string; record: string }[] = [];

    for (let i = 0; i < records.length; i += this.BATCH_SIZE) {
      const batch = records.slice(i, i + this.BATCH_SIZE);
      const encryptedBatch = await Promise.all(
        batch.map(record => this.encryptRecord({ id: record.id, record: record }))
      );
      results.push(...encryptedBatch);

      // Yield after each batch to allow UI updates
      if (i + this.BATCH_SIZE < records.length) {
        await this.yieldToEventLoop();
      }
    }

    return results;
  }

  /**
   * Decrypts an array of encrypted record strings in batches.
   * Crypto operations run on native threads, but we still yield to allow
   * React to process state updates for large datasets.
   */
  async decryptRecords(encryptedRecords: string[]): Promise<any[]> {
    const results: any[] = [];

    for (let i = 0; i < encryptedRecords.length; i += this.BATCH_SIZE) {
      const batch = encryptedRecords.slice(i, i + this.BATCH_SIZE);
      const decryptedBatch = await Promise.all(batch.map(encrypted => this.decryptRecord(encrypted)));
      results.push(...decryptedBatch);

      // Yield after each batch to allow UI updates
      if (i + this.BATCH_SIZE < encryptedRecords.length) {
        await this.yieldToEventLoop();
      }
    }

    return results;
  }
}

export const syncEncryptionService = new SyncEncryptionService();
