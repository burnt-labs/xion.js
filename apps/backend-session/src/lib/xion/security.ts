import { randomBytes, pbkdf2Sync } from "node:crypto";
import { EncryptionService } from "@/lib/xion/backend";

export class SecurityManager {
  private static encryptionService: EncryptionService | null = null;

  /**
   * Initialize encryption service with master key
   */
  static initialize(encryptionKey: string): void {
    this.encryptionService = new EncryptionService(encryptionKey);
  }

  /**
   * Get or create encryption service instance
   */
  private static getEncryptionService(): EncryptionService {
    if (!this.encryptionService) {
      const key = process.env.ENCRYPTION_KEY;
      if (!key) {
        throw new Error("ENCRYPTION_KEY environment variable is required");
      }
      this.encryptionService = new EncryptionService(key);
    }
    return this.encryptionService;
  }

  /**
   * Generate a secure encryption key (using EncryptionService method)
   */
  static generateEncryptionKey(): string {
    return EncryptionService.generateEncryptionKey();
  }

  /**
   * Encrypt sensitive data using EncryptionService
   */
  static async encrypt(text: string, key?: string): Promise<string> {
    const service = key
      ? new EncryptionService(key)
      : this.getEncryptionService();
    return await service.encryptSessionKey(text);
  }

  /**
   * Decrypt sensitive data using EncryptionService
   */
  static async decrypt(encryptedText: string, key?: string): Promise<string> {
    const service = key
      ? new EncryptionService(key)
      : this.getEncryptionService();
    return await service.decryptSessionKey(encryptedText);
  }

  /**
   * Validate encryption key format (using EncryptionService method)
   */
  static validateEncryptionKey(key: string): boolean {
    return EncryptionService.validateEncryptionKey(key);
  }

  /**
   * Generate secure random string
   */
  static generateSecureRandom(length = 32): string {
    return randomBytes(length).toString("hex");
  }

  /**
   * Hash password using PBKDF2 (more secure than custom implementation)
   */
  static async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const hash = pbkdf2Sync(password, salt, 100000, 64, "sha512").toString(
      "hex",
    );
    return `${salt}:${hash}`;
  }

  /**
   * Verify password using PBKDF2
   */
  static async verifyPassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    const [salt, hash] = hashedPassword.split(":");
    if (!salt || !hash) return false;

    const verifyHash = pbkdf2Sync(
      password,
      salt,
      100000,
      64,
      "sha512",
    ).toString("hex");
    return hash === verifyHash;
  }

  /**
   * Generate secure random bytes
   */
  static generateRandomBytes(length: number): Buffer {
    return randomBytes(length);
  }

  /**
   * Generate secure random string with custom charset
   * Uses cryptographically secure random bytes
   */
  static generateSecureString(
    length: number,
    charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  ): string {
    const bytes = randomBytes(length);
    let result = "";
    for (let i = 0; i < length; i++) {
      result += charset.charAt(bytes[i] % charset.length);
    }
    return result;
  }

  /**
   * Generate UUID v4
   */
  static generateUUID(): string {
    const bytes = randomBytes(16);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant bits

    const hex = bytes.toString("hex");
    return [
      hex.substring(0, 8),
      hex.substring(8, 12),
      hex.substring(12, 16),
      hex.substring(16, 20),
      hex.substring(20, 32),
    ].join("-");
  }

  /**
   * Constant-time string comparison (prevents timing attacks)
   */
  static constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }
}
