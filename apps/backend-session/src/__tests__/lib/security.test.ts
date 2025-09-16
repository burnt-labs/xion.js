import { SecurityManager } from "@/lib/security";

describe("SecurityManager", () => {
  const testKey = "test-encryption-key-32-chars-long!";
  const testText = "This is a secret message";

  beforeAll(() => {
    // Initialize with test key
    SecurityManager.initialize(testKey);
  });

  describe("generateEncryptionKey", () => {
    it("should generate a valid base64 encoded key", () => {
      const key = SecurityManager.generateEncryptionKey();
      expect(typeof key).toBe("string");
      expect(key.length).toBeGreaterThan(0);

      // Should be valid base64
      expect(() => Buffer.from(key, "base64")).not.toThrow();
    });

    it("should generate different keys each time", () => {
      const key1 = SecurityManager.generateEncryptionKey();
      const key2 = SecurityManager.generateEncryptionKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe("validateEncryptionKey", () => {
    it("should validate correct encryption key", () => {
      const key = SecurityManager.generateEncryptionKey();
      expect(SecurityManager.validateEncryptionKey(key)).toBe(true);
    });

    it("should reject invalid encryption key", () => {
      expect(SecurityManager.validateEncryptionKey("invalid")).toBe(false);
      expect(SecurityManager.validateEncryptionKey("")).toBe(false);
      expect(SecurityManager.validateEncryptionKey("not-base64")).toBe(false);
    });
  });

  describe("encrypt and decrypt", () => {
    it("should encrypt and decrypt text correctly", async () => {
      const encrypted = await SecurityManager.encrypt(testText);
      const decrypted = await SecurityManager.decrypt(encrypted);

      expect(decrypted).toBe(testText);
      expect(encrypted).not.toBe(testText);
    });

    it("should produce different encrypted values for same input", async () => {
      const encrypted1 = await SecurityManager.encrypt(testText);
      const encrypted2 = await SecurityManager.encrypt(testText);

      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to the same value
      const decrypted1 = await SecurityManager.decrypt(encrypted1);
      const decrypted2 = await SecurityManager.decrypt(encrypted2);
      expect(decrypted1).toBe(testText);
      expect(decrypted2).toBe(testText);
    });

    it("should fail to decrypt with wrong key", async () => {
      const wrongKey = "wrong-encryption-key-32-chars-long!";
      const encrypted = await SecurityManager.encrypt(testText, testKey);

      await expect(
        SecurityManager.decrypt(encrypted, wrongKey),
      ).rejects.toThrow();
    });
  });

  describe("generateSecureRandom", () => {
    it("should generate random string of specified length", () => {
      const random = SecurityManager.generateSecureRandom(16);
      expect(random).toHaveLength(32); // 16 bytes = 32 hex characters
    });

    it("should generate different values each time", () => {
      const random1 = SecurityManager.generateSecureRandom(8);
      const random2 = SecurityManager.generateSecureRandom(8);
      expect(random1).not.toBe(random2);
    });
  });

  describe("hashPassword and verifyPassword", () => {
    it("should hash and verify password correctly", async () => {
      const password = "testpassword123";
      const hashed = await SecurityManager.hashPassword(password);

      expect(hashed).not.toBe(password);
      expect(hashed).toContain(":"); // Should contain salt:hash format

      const isValid = await SecurityManager.verifyPassword(password, hashed);
      expect(isValid).toBe(true);
    });

    it("should reject wrong password", async () => {
      const password = "testpassword123";
      const wrongPassword = "wrongpassword";
      const hashed = await SecurityManager.hashPassword(password);

      const isValid = await SecurityManager.verifyPassword(
        wrongPassword,
        hashed,
      );
      expect(isValid).toBe(false);
    });

    it("should produce different hashes for same password", async () => {
      const password = "samepassword";
      const hashed1 = await SecurityManager.hashPassword(password);
      const hashed2 = await SecurityManager.hashPassword(password);

      expect(hashed1).not.toBe(hashed2);

      // But both should verify correctly
      expect(await SecurityManager.verifyPassword(password, hashed1)).toBe(
        true,
      );
      expect(await SecurityManager.verifyPassword(password, hashed2)).toBe(
        true,
      );
    });
  });

  describe("generateUUID", () => {
    it("should generate valid UUID v4", () => {
      const uuid = SecurityManager.generateUUID();
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuid).toMatch(uuidRegex);
    });

    it("should generate different UUIDs each time", () => {
      const uuid1 = SecurityManager.generateUUID();
      const uuid2 = SecurityManager.generateUUID();
      expect(uuid1).not.toBe(uuid2);
    });
  });

  describe("constantTimeCompare", () => {
    it("should return true for identical strings", () => {
      const str1 = "test string";
      const str2 = "test string";
      expect(SecurityManager.constantTimeCompare(str1, str2)).toBe(true);
    });

    it("should return false for different strings", () => {
      const str1 = "test string";
      const str2 = "different string";
      expect(SecurityManager.constantTimeCompare(str1, str2)).toBe(false);
    });

    it("should return false for strings of different lengths", () => {
      const str1 = "short";
      const str2 = "much longer string";
      expect(SecurityManager.constantTimeCompare(str1, str2)).toBe(false);
    });
  });

  describe("generateSecureString", () => {
    it("should generate string of specified length", () => {
      const str = SecurityManager.generateSecureString(10);
      expect(str).toHaveLength(10);
    });

    it("should use custom charset when provided", () => {
      const charset = "ABC123";
      const str = SecurityManager.generateSecureString(10, charset);
      expect(str).toMatch(/^[ABC123]+$/);
    });
  });
});
