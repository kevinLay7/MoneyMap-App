import * as SecureStore from 'expo-secure-store';

const ENCRYPTION_PASSWORD_KEY = 'encryption_password';
const ENCRYPTION_SALT_KEY = 'encryption_salt';

export interface EncryptionCredentials {
  password: string;
  salt: string;
}

/**
 * Service for managing encryption credentials securely.
 * Uses expo-secure-store which provides platform-native secure storage:
 * - iOS: Keychain
 * - Android: EncryptedSharedPreferences/Keystore
 */
class EncryptionCredentialsService {
  /**
   * Stores the encryption password securely.
   * @param password User-generated encryption password
   */
  async setEncryptionPassword(password: string): Promise<void> {
    if (!password || password.length === 0) {
      throw new Error('Encryption password cannot be empty');
    }
    await SecureStore.setItemAsync(ENCRYPTION_PASSWORD_KEY, password);
  }

  /**
   * Retrieves the encryption password.
   * @returns The encryption password or null if not set
   */
  async getEncryptionPassword(): Promise<string | null> {
    return await SecureStore.getItemAsync(ENCRYPTION_PASSWORD_KEY);
  }

  /**
   * Stores the encryption salt securely.
   * @param salt Server-generated salt
   */
  async setEncryptionSalt(salt: string): Promise<void> {
    if (!salt || salt.length === 0) {
      throw new Error('Encryption salt cannot be empty');
    }
    await SecureStore.setItemAsync(ENCRYPTION_SALT_KEY, salt);
  }

  /**
   * Retrieves the encryption salt.
   * @returns The encryption salt or null if not set
   */
  async getEncryptionSalt(): Promise<string | null> {
    return await SecureStore.getItemAsync(ENCRYPTION_SALT_KEY);
  }

  /**
   * Stores both encryption password and salt atomically.
   * @param credentials Object containing password and salt
   */
  async setCredentials(credentials: EncryptionCredentials): Promise<void> {
    await Promise.all([this.setEncryptionPassword(credentials.password), this.setEncryptionSalt(credentials.salt)]);
  }

  /**
   * Retrieves both encryption password and salt.
   * @returns Object containing password and salt, or null if either is missing
   */
  async getCredentials(): Promise<EncryptionCredentials | null> {
    const [password, salt] = await Promise.all([this.getEncryptionPassword(), this.getEncryptionSalt()]);

    if (!password || !salt) {
      return null;
    }

    return { password, salt };
  }

  /**
   * Checks if encryption credentials are set.
   * @returns true if both password and salt are set
   */
  async hasCredentials(): Promise<boolean> {
    const credentials = await this.getCredentials();
    return credentials !== null;
  }

  /**
   * Removes encryption password from secure storage.
   */
  async removeEncryptionPassword(): Promise<void> {
    await SecureStore.deleteItemAsync(ENCRYPTION_PASSWORD_KEY);
  }

  /**
   * Removes encryption salt from secure storage.
   */
  async removeEncryptionSalt(): Promise<void> {
    await SecureStore.deleteItemAsync(ENCRYPTION_SALT_KEY);
  }

  /**
   * Removes both encryption password and salt from secure storage.
   */
  async removeCredentials(): Promise<void> {
    await Promise.all([this.removeEncryptionPassword(), this.removeEncryptionSalt()]);
  }
}

export const encryptionCredentialsService = new EncryptionCredentialsService();
