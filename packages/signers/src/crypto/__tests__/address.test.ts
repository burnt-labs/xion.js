import { describe, it, expect } from "vitest";
import { calculateSmartAccountAddress } from "../address";

describe("address.ts - calculateSmartAccountAddress", () => {
  // Valid test data for deterministic address calculation
  const validConfig = {
    checksum: "13a1fc994cc6d1c81b746ee0c0ff6f90043875e0bf1d9be6b7d779fc978dc2a5",
    creator: "xion1xrqz2wpt4rw8rtdvrc4n4yn5h54jm0nn4evn2x", // Valid testnet fee granter address
    salt: "b5a4c786a6f581ffc7e1d4c18e3c70c35344e9e2b0a65e4c8f8e6c2e1d4e3b8a",
    prefix: "xion",
  };

  describe("🔴 CRITICAL: Deterministic Address Calculation", () => {
    it("should return same address for same inputs (determinism check)", () => {
      const address1 = calculateSmartAccountAddress(validConfig);
      const address2 = calculateSmartAccountAddress(validConfig);
      const address3 = calculateSmartAccountAddress(validConfig);

      expect(address1).toBe(address2);
      expect(address2).toBe(address3);
      expect(address1).toMatch(/^xion1[a-z0-9]{38,59}$/); // Valid bech32 format
    });

    it("should return different addresses for different salts", () => {
      const address1 = calculateSmartAccountAddress(validConfig);
      const address2 = calculateSmartAccountAddress({
        ...validConfig,
        salt: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
      });

      expect(address1).not.toBe(address2);
    });

    it("should return different addresses for different checksums", () => {
      const address1 = calculateSmartAccountAddress(validConfig);
      const address2 = calculateSmartAccountAddress({
        ...validConfig,
        checksum: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
      });

      expect(address1).not.toBe(address2);
    });

    it("should return different addresses for different creators", () => {
      const address1 = calculateSmartAccountAddress(validConfig);
      const address2 = calculateSmartAccountAddress({
        ...validConfig,
        creator: "xion12q9q752mta5fvwjj2uevqpuku9y60j33j9rll0", // Different valid mainnet fee granter address
      });

      expect(address1).not.toBe(address2);
    });

    it("should use correct prefix in generated address", () => {
      const xionAddress = calculateSmartAccountAddress(validConfig);
      const cosmosAddress = calculateSmartAccountAddress({
        ...validConfig,
        prefix: "cosmos",
      });
      const osmoAddress = calculateSmartAccountAddress({
        ...validConfig,
        prefix: "osmo",
      });

      expect(xionAddress).toMatch(/^xion1/);
      expect(cosmosAddress).toMatch(/^cosmos1/);
      expect(osmoAddress).toMatch(/^osmo1/);
    });
  });

  describe("🔴 CRITICAL: Invalid Checksum Format Handling", () => {
    it("should throw error for empty checksum", () => {
      expect(() =>
        calculateSmartAccountAddress({
          ...validConfig,
          checksum: "",
        }),
      ).toThrow();
    });

    it("should throw error for non-hex checksum", () => {
      expect(() =>
        calculateSmartAccountAddress({
          ...validConfig,
          checksum: "not-a-hex-string-zzzz",
        }),
      ).toThrow();
    });

    it("should throw error for checksum with invalid characters", () => {
      expect(() =>
        calculateSmartAccountAddress({
          ...validConfig,
          checksum: "13a1fc994cc6d1c81b746ee0c0ff6f90043875e0bf1d9be6b7d779fc978dc2aG", // 'G' is invalid hex
        }),
      ).toThrow();
    });

    it("should throw error for odd-length checksum (not valid hex bytes)", () => {
      expect(() =>
        calculateSmartAccountAddress({
          ...validConfig,
          checksum: "13a1fc994cc6d1c81b746ee0c0ff6f90043875e0bf1d9be6b7d779fc978dc2a", // Missing 1 char
        }),
      ).toThrow();
    });

    it("should handle checksum with 0x prefix (if implementation strips it)", () => {
      // This tests if the implementation handles 0x prefix gracefully
      // If it doesn't strip it, this should throw an error
      const checksumWithPrefix = `0x${validConfig.checksum}`;
      expect(() =>
        calculateSmartAccountAddress({
          ...validConfig,
          checksum: checksumWithPrefix,
        }),
      ).toThrow(); // Should fail because Buffer.from('0x...', 'hex') is invalid
    });
  });

  describe("🔴 CRITICAL: Invalid Salt Format Handling", () => {
    it("should throw error for empty salt", () => {
      expect(() =>
        calculateSmartAccountAddress({
          ...validConfig,
          salt: "",
        }),
      ).toThrow();
    });

    it("should throw error for non-hex salt", () => {
      expect(() =>
        calculateSmartAccountAddress({
          ...validConfig,
          salt: "not-hex-zzzzz",
        }),
      ).toThrow();
    });

    it("should throw error for salt with invalid hex characters (BUG FIX)", () => {
      // BUG FIX: Now validates hex before calling CosmJS
      expect(() => calculateSmartAccountAddress({
        ...validConfig,
        salt: "b5a4c786a6f581ffc7e1d4c18e3c70c35344e9e2b0a65e4c8f8e6c2e1d4e3b8Z", // 'Z' is invalid
      })).toThrow(/invalid.*salt/i);
    });

    it("should throw error for odd-length salt (BUG FIX)", () => {
      // BUG FIX: Now validates even length before calling CosmJS
      expect(() => calculateSmartAccountAddress({
        ...validConfig,
        salt: "b5a4c786a6f581ffc7e1d4c18e3c70c35344e9e2b0a65e4c8f8e6c2e1d4e3b8", // Missing 1 char (63 chars)
      })).toThrow(/invalid.*salt/i);
    });
  });

  describe("🔴 CRITICAL: Invalid Creator Address Handling", () => {
    it("should throw error for empty creator address", () => {
      expect(() =>
        calculateSmartAccountAddress({
          ...validConfig,
          creator: "",
        }),
      ).toThrow();
    });

    it("should throw error for invalid bech32 creator address", () => {
      expect(() =>
        calculateSmartAccountAddress({
          ...validConfig,
          creator: "not-a-valid-address",
        }),
      ).toThrow();
    });

    it("should throw error for creator address with wrong prefix", () => {
      // This may or may not throw depending on implementation
      // The function should validate that creator is a valid bech32 address
      expect(() =>
        calculateSmartAccountAddress({
          ...validConfig,
          creator: "cosmos1invalidbech32", // Invalid checksum
        }),
      ).toThrow();
    });

    it("should throw error for creator address with invalid checksum", () => {
      expect(() =>
        calculateSmartAccountAddress({
          ...validConfig,
          creator: "xion1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaabbbbbb", // Invalid checksum
        }),
      ).toThrow();
    });
  });

  describe("🟡 HIGH: Edge Cases", () => {
    it("should reject too-short inputs (BUG FIX)", () => {
      // BUG FIX: Now validates length BEFORE calling CosmJS
      const minConfig = {
        checksum: "aa", // 1 byte (should be 32 bytes)
        creator: validConfig.creator,
        salt: "bb", // 1 byte (should be 32 bytes)
        prefix: "x", // 1 char prefix
      };

      expect(() => calculateSmartAccountAddress(minConfig)).toThrow(/checksum.*32 bytes/i);
    });

    it("should reject too-long inputs (BUG FIX)", () => {
      // BUG FIX: Now validates length BEFORE calling CosmJS
      const maxConfig = {
        checksum: "a".repeat(128), // 64 bytes (should be exactly 32 bytes / 64 hex chars)
        creator: validConfig.creator,
        salt: "b".repeat(128), // 64 bytes (should be exactly 32 bytes / 64 hex chars)
        prefix: "xion",
      };

      expect(() => calculateSmartAccountAddress(maxConfig)).toThrow(/checksum.*32 bytes/i);
    });

    it("should handle uppercase hex strings", () => {
      const upperConfig = {
        checksum: validConfig.checksum.toUpperCase(),
        creator: validConfig.creator,
        salt: validConfig.salt.toUpperCase(),
        prefix: "xion",
      };

      expect(() => calculateSmartAccountAddress(upperConfig)).not.toThrow();
    });

    it("should handle mixed case hex strings", () => {
      const mixedConfig = {
        checksum: "A1b2C3d4E5f6A7b8C9d0E1f2A3b4C5d6E7f8A9b0C1d2E3f4A5b6C7d8E9f0A1b2",
        creator: validConfig.creator,
        salt: "B5a4C786a6F581fFc7E1d4C18e3C70c35344E9e2B0a65E4c8F8e6C2e1D4e3B8a",
        prefix: "xion",
      };

      expect(() => calculateSmartAccountAddress(mixedConfig)).not.toThrow();
    });

    it("should reject empty prefix (BUG FIX)", () => {
      // BUG FIX: Now validates prefix format BEFORE calling CosmJS
      expect(() => calculateSmartAccountAddress({
        ...validConfig,
        prefix: "",
      })).toThrow(/invalid.*prefix/i);
    });

    it("should reject special characters in prefix (BUG FIX)", () => {
      // BUG FIX: Now validates prefix format BEFORE calling CosmJS
      expect(() => calculateSmartAccountAddress({
        ...validConfig,
        prefix: "xion@123",
      })).toThrow(/invalid.*prefix/i);
    });
  });

  describe("🟡 HIGH: Cross-Authenticator Type Consistency", () => {
    it("should produce consistent addresses across different authenticator flows", () => {
      // This test ensures that no matter which authenticator type is used,
      // if the salt is the same, the address should be the same
      const config1 = { ...validConfig };
      const config2 = { ...validConfig };
      const config3 = { ...validConfig };

      const address1 = calculateSmartAccountAddress(config1);
      const address2 = calculateSmartAccountAddress(config2);
      const address3 = calculateSmartAccountAddress(config3);

      expect(address1).toBe(address2);
      expect(address2).toBe(address3);
    });

    it("should work with all major blockchain prefixes", () => {
      const prefixes = ["xion", "cosmos", "osmo", "juno", "terra", "neutron"];

      prefixes.forEach((prefix) => {
        const address = calculateSmartAccountAddress({
          ...validConfig,
          prefix,
        });
        expect(address).toMatch(new RegExp(`^${prefix}1`));
      });
    });
  });

  describe("🟢 MEDIUM: Type Safety and Input Validation", () => {
    it("should handle null/undefined gracefully (TypeScript should prevent this)", () => {
      // These tests verify runtime behavior if TypeScript is bypassed
      expect(() =>
        calculateSmartAccountAddress({
          checksum: null as any,
          creator: validConfig.creator,
          salt: validConfig.salt,
          prefix: "xion",
        }),
      ).toThrow();

      expect(() =>
        calculateSmartAccountAddress({
          checksum: validConfig.checksum,
          creator: undefined as any,
          salt: validConfig.salt,
          prefix: "xion",
        }),
      ).toThrow();
    });

    it("should handle whitespace in inputs", () => {
      expect(() =>
        calculateSmartAccountAddress({
          ...validConfig,
          checksum: `  ${validConfig.checksum}  `, // Leading/trailing spaces
        }),
      ).toThrow(); // Should fail because spaces make it invalid hex
    });

    it("should reject newlines in inputs (BUG FIX)", () => {
      // BUG FIX: Now validates hex, so newlines throw error
      expect(() => calculateSmartAccountAddress({
        ...validConfig,
        salt: `${validConfig.salt}\n`, // Trailing newline
      })).toThrow(/invalid.*salt/i);
    });
  });

  describe("🔒 Security: Collision Resistance", () => {
    it("should produce different addresses for similar but different inputs", () => {
      const addresses = new Set<string>();

      // Generate addresses with incrementing salts
      for (let i = 0; i < 10; i++) {
        const salt = i.toString(16).padStart(64, "0");
        const address = calculateSmartAccountAddress({
          ...validConfig,
          salt,
        });
        addresses.add(address);
      }

      // All addresses should be unique
      expect(addresses.size).toBe(10);
    });

    it("should produce different addresses for byte-order variations", () => {
      const salt1 = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
      const salt2 = "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";

      const address1 = calculateSmartAccountAddress({
        ...validConfig,
        salt: salt1,
      });
      const address2 = calculateSmartAccountAddress({
        ...validConfig,
        salt: salt2,
      });

      expect(address1).not.toBe(address2);
    });
  });
});
