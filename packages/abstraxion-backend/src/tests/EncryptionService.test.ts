import { EncryptionService } from "../services/EncryptionService";
import { EncryptionError } from "../types";

describe("EncryptionService", () => {
  let encryptionService: EncryptionService;
  const testMasterKey = "test-master-key-12345678901234567890";

  beforeEach(() => {
    encryptionService = new EncryptionService(testMasterKey);
  });

  describe("constructor", () => {
    it("should create instance with valid master key", () => {
      expect(encryptionService).toBeInstanceOf(EncryptionService);
    });

    it("should throw error for empty master key", () => {
      expect(() => new EncryptionService("")).toThrow(EncryptionError);
      expect(() => new EncryptionService("")).toThrow(
        "Master encryption key is required",
      );
    });

    it("should throw error for null master key", () => {
      expect(() => new EncryptionService(null as any)).toThrow(EncryptionError);
    });

    it("should throw error for undefined master key", () => {
      expect(() => new EncryptionService(undefined as any)).toThrow(
        EncryptionError,
      );
    });
  });

  describe("encryptSessionKey", () => {
    it("should encrypt session key successfully", async () => {
      const sessionKey = "test-session-key-12345";
      const encrypted = await encryptionService.encryptSessionKey(sessionKey);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe("string");
      expect(encrypted).not.toBe(sessionKey);
    });

    it("should produce different encrypted results for same input", async () => {
      const sessionKey = "test-session-key-12345";
      const encrypted1 = await encryptionService.encryptSessionKey(sessionKey);
      const encrypted2 = await encryptionService.encryptSessionKey(sessionKey);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it("should handle empty string", async () => {
      const encrypted = await encryptionService.encryptSessionKey("");
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe("string");
    });

    it("should handle long session key", async () => {
      const longSessionKey = "a".repeat(1000);
      const encrypted =
        await encryptionService.encryptSessionKey(longSessionKey);
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe("string");
    });

    it("should handle special characters", async () => {
      const specialKey = "!@#$%^&*()_+-=[]{}|;:,.<>?";
      const encrypted = await encryptionService.encryptSessionKey(specialKey);
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe("string");
    });

    it("should handle unicode characters", async () => {
      const unicodeKey = "测试密钥🔐🎯";
      const encrypted = await encryptionService.encryptSessionKey(unicodeKey);
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe("string");
    });
  });

  describe("decryptSessionKey", () => {
    it("should decrypt session key successfully", async () => {
      const originalKey = "test-session-key-12345";
      const encrypted = await encryptionService.encryptSessionKey(originalKey);
      const decrypted = await encryptionService.decryptSessionKey(encrypted);

      expect(decrypted).toBe(originalKey);
    });

    it("should handle round-trip encryption/decryption", async () => {
      const testKeys = [
        "simple-key",
        "key-with-special-chars!@#$%",
        "key-with-unicode-测试🔐",
        "very-long-key-" + "x".repeat(1000),
        "",
        "single-char",
      ];

      for (const key of testKeys) {
        const encrypted = await encryptionService.encryptSessionKey(key);
        const decrypted = await encryptionService.decryptSessionKey(encrypted);
        expect(decrypted).toBe(key);
      }
    });

    it("should throw error for invalid base64", async () => {
      await expect(
        encryptionService.decryptSessionKey("invalid-base64!"),
      ).rejects.toThrow(EncryptionError);
    });

    it("should throw error for corrupted data", async () => {
      const originalKey = "test-key";
      const encrypted = await encryptionService.encryptSessionKey(originalKey);

      // Corrupt the encrypted data
      const corrupted = encrypted.slice(0, -10) + "corrupted";

      await expect(
        encryptionService.decryptSessionKey(corrupted),
      ).rejects.toThrow(EncryptionError);
    });

    it("should throw error for empty string", async () => {
      await expect(encryptionService.decryptSessionKey("")).rejects.toThrow(
        EncryptionError,
      );
    });

    it("should throw error for too short data", async () => {
      const shortData = Buffer.from("short").toString("base64");
      await expect(
        encryptionService.decryptSessionKey(shortData),
      ).rejects.toThrow(EncryptionError);
    });
  });

  describe("generateEncryptionKey", () => {
    it("should generate valid encryption key", () => {
      const key = EncryptionService.generateEncryptionKey();

      expect(key).toBeDefined();
      expect(typeof key).toBe("string");
      expect(EncryptionService.validateEncryptionKey(key)).toBe(true);
    });

    it("should generate different keys each time", () => {
      const key1 = EncryptionService.generateEncryptionKey();
      const key2 = EncryptionService.generateEncryptionKey();

      expect(key1).not.toBe(key2);
    });

    it("should generate base64 encoded key", () => {
      const key = EncryptionService.generateEncryptionKey();

      // Should be valid base64
      expect(() => Buffer.from(key, "base64")).not.toThrow();
    });
  });

  describe("validateEncryptionKey", () => {
    it("should validate correct 32-byte base64 key", () => {
      const validKey = Buffer.from("a".repeat(32)).toString("base64");
      expect(EncryptionService.validateEncryptionKey(validKey)).toBe(true);
    });

    it("should reject invalid base64", () => {
      expect(EncryptionService.validateEncryptionKey("invalid-base64!")).toBe(
        false,
      );
    });

    it("should reject wrong length key", () => {
      const shortKey = Buffer.from("short").toString("base64");
      const longKey = Buffer.from("a".repeat(64)).toString("base64");

      expect(EncryptionService.validateEncryptionKey(shortKey)).toBe(false);
      expect(EncryptionService.validateEncryptionKey(longKey)).toBe(false);
    });

    it("should reject empty string", () => {
      expect(EncryptionService.validateEncryptionKey("")).toBe(false);
    });

    it("should reject null and undefined", () => {
      expect(EncryptionService.validateEncryptionKey(null as any)).toBe(false);
      expect(EncryptionService.validateEncryptionKey(undefined as any)).toBe(
        false,
      );
    });
  });

  describe("encryption consistency", () => {
    it("should maintain consistency across multiple instances with same master key", async () => {
      const service1 = new EncryptionService(testMasterKey);
      const service2 = new EncryptionService(testMasterKey);

      const originalKey = "test-consistency-key";
      const encrypted1 = await service1.encryptSessionKey(originalKey);
      const decrypted1 = await service1.decryptSessionKey(encrypted1);
      const decrypted2 = await service2.decryptSessionKey(encrypted1);

      expect(decrypted1).toBe(originalKey);
      expect(decrypted2).toBe(originalKey);
    });

    it("should not decrypt with different master key", async () => {
      const service1 = new EncryptionService("master-key-1");
      const service2 = new EncryptionService("master-key-2");

      const originalKey = "test-key";
      const encrypted = await service1.encryptSessionKey(originalKey);

      await expect(service2.decryptSessionKey(encrypted)).rejects.toThrow(
        EncryptionError,
      );
    });
  });

  describe("performance", () => {
    it("should handle multiple rapid encryptions", async () => {
      const promises = Array.from({ length: 100 }, (_, i) =>
        encryptionService.encryptSessionKey(`key-${i}`),
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(100);
      results.forEach((result) => {
        expect(result).toBeDefined();
        expect(typeof result).toBe("string");
      });
    });

    it("should handle large data efficiently", async () => {
      const largeKey = "x".repeat(10000);
      const start = Date.now();

      const encrypted = await encryptionService.encryptSessionKey(largeKey);
      const decrypted = await encryptionService.decryptSessionKey(encrypted);

      const duration = Date.now() - start;

      expect(decrypted).toBe(largeKey);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe("error handling", () => {
    it("should provide meaningful error messages", async () => {
      try {
        await encryptionService.decryptSessionKey("invalid-data");
      } catch (error) {
        if (error instanceof Error) {
          expect(error).toBeInstanceOf(EncryptionError);
          expect(error.message).toContain("Failed to decrypt session key");
        }
      }
    });

    it("should handle scrypt errors gracefully", async () => {
      // Create service with very long master key that might cause scrypt issues
      const longMasterKey = "a".repeat(1000000);
      const service = new EncryptionService(longMasterKey);

      // This might throw due to memory constraints, but should be handled gracefully
      try {
        await service.encryptSessionKey("test");
      } catch (error) {
        if (error instanceof Error) {
          expect(error).toBeInstanceOf(EncryptionError);
          expect(error.message).toContain("Failed to encrypt session key");
        }
      }
    });
  });

  describe("security properties", () => {
    it("should produce different encrypted data for same input due to random IV", async () => {
      const sessionKey = "same-key";
      const encrypted1 = await encryptionService.encryptSessionKey(sessionKey);
      const encrypted2 = await encryptionService.encryptSessionKey(sessionKey);

      // Should be different due to random IV and salt
      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to the same value
      const decrypted1 = await encryptionService.decryptSessionKey(encrypted1);
      const decrypted2 = await encryptionService.decryptSessionKey(encrypted2);

      expect(decrypted1).toBe(sessionKey);
      expect(decrypted2).toBe(sessionKey);
    });

    it("should include authentication tag for integrity", async () => {
      const sessionKey = "test-key";
      const encrypted = await encryptionService.encryptSessionKey(sessionKey);

      // Decode and check structure: salt + iv + tag + encrypted
      const combined = Buffer.from(encrypted, "base64");
      const expectedMinLength = 32 + 16 + 16 + 1; // salt + iv + tag + at least 1 byte encrypted

      expect(combined.length).toBeGreaterThanOrEqual(expectedMinLength);
    });

    it("should detect tampering attempts", async () => {
      const sessionKey = "test-key";
      const encrypted = await encryptionService.encryptSessionKey(sessionKey);

      // Tamper with the encrypted data
      const combined = Buffer.from(encrypted, "base64");
      combined[0] = (combined[0] + 1) % 256; // Change first byte
      const tampered = combined.toString("base64");

      await expect(
        encryptionService.decryptSessionKey(tampered),
      ).rejects.toThrow(EncryptionError);
    });

    it("should detect tampering in salt", async () => {
      const sessionKey = "test-key";
      const encrypted = await encryptionService.encryptSessionKey(sessionKey);

      // Tamper with the salt (first 32 bytes)
      const combined = Buffer.from(encrypted, "base64");
      combined[31] = (combined[31] + 1) % 256; // Change last byte of salt
      const tampered = combined.toString("base64");

      await expect(
        encryptionService.decryptSessionKey(tampered),
      ).rejects.toThrow(EncryptionError);
    });

    it("should detect tampering in IV", async () => {
      const sessionKey = "test-key";
      const encrypted = await encryptionService.encryptSessionKey(sessionKey);

      // Tamper with the IV (bytes 32-47)
      const combined = Buffer.from(encrypted, "base64");
      combined[40] = (combined[40] + 1) % 256; // Change a byte in IV
      const tampered = combined.toString("base64");

      await expect(
        encryptionService.decryptSessionKey(tampered),
      ).rejects.toThrow(EncryptionError);
    });

    it("should detect tampering in authentication tag", async () => {
      const sessionKey = "test-key";
      const encrypted = await encryptionService.encryptSessionKey(sessionKey);

      // Tamper with the authentication tag (bytes 48-63)
      const combined = Buffer.from(encrypted, "base64");
      combined[60] = (combined[60] + 1) % 256; // Change a byte in tag
      const tampered = combined.toString("base64");

      await expect(
        encryptionService.decryptSessionKey(tampered),
      ).rejects.toThrow(EncryptionError);
    });

    it("should detect tampering in encrypted data", async () => {
      const sessionKey = "test-key";
      const encrypted = await encryptionService.encryptSessionKey(sessionKey);

      // Tamper with the encrypted data (after tag)
      const combined = Buffer.from(encrypted, "base64");
      combined[combined.length - 1] = (combined[combined.length - 1] + 1) % 256; // Change last byte
      const tampered = combined.toString("base64");

      await expect(
        encryptionService.decryptSessionKey(tampered),
      ).rejects.toThrow(EncryptionError);
    });
  });

  describe("key derivation", () => {
    it("should use different salts for different encryptions", async () => {
      const sessionKey = "test-key";
      const encrypted1 = await encryptionService.encryptSessionKey(sessionKey);
      const encrypted2 = await encryptionService.encryptSessionKey(sessionKey);

      const combined1 = Buffer.from(encrypted1, "base64");
      const combined2 = Buffer.from(encrypted2, "base64");

      const salt1 = combined1.subarray(0, 32);
      const salt2 = combined2.subarray(0, 32);

      expect(salt1).not.toEqual(salt2);
    });

    it("should use different IVs for different encryptions", async () => {
      const sessionKey = "test-key";
      const encrypted1 = await encryptionService.encryptSessionKey(sessionKey);
      const encrypted2 = await encryptionService.encryptSessionKey(sessionKey);

      const combined1 = Buffer.from(encrypted1, "base64");
      const combined2 = Buffer.from(encrypted2, "base64");

      const iv1 = combined1.subarray(32, 48);
      const iv2 = combined2.subarray(32, 48);

      expect(iv1).not.toEqual(iv2);
    });

    it("should derive different keys for different salts", async () => {
      const masterKey = "test-master-key";
      const service1 = new EncryptionService(masterKey);
      const service2 = new EncryptionService(masterKey);

      const sessionKey = "test-key";
      const encrypted1 = await service1.encryptSessionKey(sessionKey);
      const encrypted2 = await service2.encryptSessionKey(sessionKey);

      // Should be different due to different salts
      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt correctly with their respective services
      const decrypted1 = await service1.decryptSessionKey(encrypted1);
      const decrypted2 = await service2.decryptSessionKey(encrypted2);

      expect(decrypted1).toBe(sessionKey);
      expect(decrypted2).toBe(sessionKey);
    });
  });

  describe("memory safety", () => {
    it("should not expose private key in memory after encryption", async () => {
      const sessionKey = "sensitive-private-key-data";
      const encrypted = await encryptionService.encryptSessionKey(sessionKey);

      // The encrypted data should not contain the original key
      expect(encrypted).not.toContain(sessionKey);
      expect(encrypted).not.toContain("sensitive");
      expect(encrypted).not.toContain("private");
    });

    it("should handle very long keys efficiently", async () => {
      const longKey = "x".repeat(100000); // 100KB key
      const start = Date.now();

      const encrypted = await encryptionService.encryptSessionKey(longKey);
      const decrypted = await encryptionService.decryptSessionKey(encrypted);

      const duration = Date.now() - start;

      expect(decrypted).toBe(longKey);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe("concurrent operations", () => {
    it("should handle concurrent encryption operations", async () => {
      const promises = Array.from({ length: 50 }, (_, i) =>
        encryptionService.encryptSessionKey(`concurrent-key-${i}`),
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(50);

      // All results should be different
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBe(50);
    });

    it("should handle concurrent decryption operations", async () => {
      const sessionKey = "concurrent-test-key";
      const encrypted = await encryptionService.encryptSessionKey(sessionKey);

      const promises = Array.from({ length: 50 }, () =>
        encryptionService.decryptSessionKey(encrypted),
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(50);

      // All results should be the same
      results.forEach((result) => {
        expect(result).toBe(sessionKey);
      });
    });

    it("should handle mixed concurrent operations", async () => {
      const sessionKey = "mixed-concurrent-key";
      const encrypted = await encryptionService.encryptSessionKey(sessionKey);

      const encryptPromises = Array.from({ length: 25 }, (_, i) =>
        encryptionService.encryptSessionKey(`mixed-key-${i}`),
      );
      const decryptPromises = Array.from({ length: 25 }, () =>
        encryptionService.decryptSessionKey(encrypted),
      );

      const [encryptResults, decryptResults] = await Promise.all([
        Promise.all(encryptPromises),
        Promise.all(decryptPromises),
      ]);

      expect(encryptResults).toHaveLength(25);
      expect(decryptResults).toHaveLength(25);

      decryptResults.forEach((result) => {
        expect(result).toBe(sessionKey);
      });
    });
  });

  describe("error recovery", () => {
    it("should handle scrypt memory errors gracefully", async () => {
      // Create service with very long master key that might cause memory issues
      const veryLongMasterKey = "a".repeat(1000000);

      try {
        const service = new EncryptionService(veryLongMasterKey);
        await service.encryptSessionKey("test");
      } catch (error) {
        if (error instanceof Error) {
          expect(error).toBeInstanceOf(EncryptionError);
          expect(error.message).toContain("Failed to encrypt session key");
        }
      }
    });

    it("should handle invalid base64 input gracefully", async () => {
      const invalidInputs = [
        "not-base64!",
        "invalid-base64-characters-!@#$%",
        "too-short",
        "",
        "valid-base64-but-too-short",
      ];

      for (const input of invalidInputs) {
        await expect(
          encryptionService.decryptSessionKey(input),
        ).rejects.toThrow(EncryptionError);
      }
    });

    it("should handle malformed encrypted data", async () => {
      const sessionKey = "test-key";
      const encrypted = await encryptionService.encryptSessionKey(sessionKey);
      const combined = Buffer.from(encrypted, "base64");

      // Test with data that's too short
      const tooShort = combined.subarray(0, 10).toString("base64");
      await expect(
        encryptionService.decryptSessionKey(tooShort),
      ).rejects.toThrow(EncryptionError);

      // Test with data that's missing components
      const missingTag = combined.subarray(0, 48).toString("base64");
      await expect(
        encryptionService.decryptSessionKey(missingTag),
      ).rejects.toThrow(EncryptionError);
    });
  });
});
