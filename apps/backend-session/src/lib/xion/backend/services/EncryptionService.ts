import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scrypt,
} from "node:crypto";
import { promisify } from "node:util";
import { EncryptionError } from "../types";

const scryptAsync = promisify(scrypt);

export class EncryptionService {
  private readonly algorithm = "aes-256-gcm";
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly tagLength = 16; // 128 bits
  private readonly saltLength = 32; // 256 bits

  constructor(private readonly masterKey: string) {
    if (!masterKey) {
      throw new EncryptionError("Master encryption key is required");
    }
  }

  /**
   * Encrypt session key material using AES-256-GCM
   */
  async encryptSessionKey(sessionKey: string): Promise<string> {
    try {
      // Generate random salt and IV
      const salt = randomBytes(this.saltLength);
      const iv = randomBytes(this.ivLength);

      // Derive key from master key and salt
      const key = await this.deriveKey(this.masterKey, salt);

      // Create cipher
      const cipher = createCipheriv(this.algorithm, key, iv);
      cipher.setAAD(salt); // Use salt as additional authenticated data

      // Encrypt the session key
      let encrypted = cipher.update(sessionKey, "utf8", "hex");
      encrypted += cipher.final("hex");

      // Get authentication tag
      const tag = cipher.getAuthTag();

      // Combine salt + iv + tag + encrypted data
      const combined = Buffer.concat([
        salt,
        iv,
        tag,
        Buffer.from(encrypted, "hex"),
      ]);

      return combined.toString("base64");
    } catch (error) {
      throw new EncryptionError(
        `Failed to encrypt session key: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Decrypt session key material using AES-256-GCM
   */
  async decryptSessionKey(encryptedData: string): Promise<string> {
    try {
      // Decode base64
      const combined = Buffer.from(encryptedData, "base64");

      // Extract components
      const salt = combined.subarray(0, this.saltLength);
      const iv = combined.subarray(
        this.saltLength,
        this.saltLength + this.ivLength,
      );
      const tag = combined.subarray(
        this.saltLength + this.ivLength,
        this.saltLength + this.ivLength + this.tagLength,
      );
      const encrypted = combined.subarray(
        this.saltLength + this.ivLength + this.tagLength,
      );

      // Derive key from master key and salt
      const key = await this.deriveKey(this.masterKey, salt);

      // Create decipher
      const decipher = createDecipheriv(this.algorithm, key, iv);
      decipher.setAAD(salt); // Use salt as additional authenticated data
      decipher.setAuthTag(tag);

      // Decrypt the session key
      let decrypted = decipher.update(encrypted, undefined, "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      throw new EncryptionError(
        `Failed to decrypt session key: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Generate a new encryption key
   */
  static generateEncryptionKey(): string {
    return randomBytes(32).toString("base64");
  }

  /**
   * Derive encryption key from master key and salt using scrypt
   */
  private async deriveKey(masterKey: string, salt: Buffer): Promise<Buffer> {
    try {
      const key = (await scryptAsync(
        masterKey,
        salt,
        this.keyLength,
      )) as Buffer;
      return key;
    } catch (error) {
      throw new EncryptionError(
        `Failed to derive key: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Validate encryption key format
   */
  static validateEncryptionKey(key: string): boolean {
    try {
      const decoded = Buffer.from(key, "base64");
      return decoded.length === 32; // 256 bits
    } catch {
      return false;
    }
  }
}
