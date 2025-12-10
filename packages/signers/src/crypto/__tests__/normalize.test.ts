import { describe, it, expect } from "vitest";
import {
  normalizeEthereumAddress,
  normalizeSecp256k1PublicKey,
  normalizeJWTIdentifier,
} from "../normalize";

describe("normalize.ts - Normalization Utilities", () => {
  describe("normalizeEthereumAddress", () => {
    describe("Valid Ethereum Addresses", () => {
      it("should normalize valid lowercase Ethereum address", () => {
        const address = "0x742d35cc6634c0532925a3b844bc9e7595f0beb0";
        const normalized = normalizeEthereumAddress(address);

        expect(normalized).toBe(address);
        expect(normalized).toMatch(/^0x[a-f0-9]{40}$/);
      });

      it("should normalize valid uppercase Ethereum address to lowercase", () => {
        const address = "0x742D35CC6634C0532925A3B844BC9E7595F0BEB0";
        const normalized = normalizeEthereumAddress(address);

        expect(normalized).toBe("0x742d35cc6634c0532925a3b844bc9e7595f0beb0");
        expect(normalized).toMatch(/^0x[a-f0-9]{40}$/);
      });

      it("should normalize mixed case Ethereum address to lowercase", () => {
        const address = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0";
        const normalized = normalizeEthereumAddress(address);

        expect(normalized).toBe("0x742d35cc6634c0532925a3b844bc9e7595f0beb0");
      });

      it("should handle all zeros address", () => {
        const address = "0x0000000000000000000000000000000000000000";
        const normalized = normalizeEthereumAddress(address);

        expect(normalized).toBe(address);
      });

      it("should handle all f's address", () => {
        const address = "0xffffffffffffffffffffffffffffffffffffffff";
        const normalized = normalizeEthereumAddress(address);

        expect(normalized).toBe(address);
      });

      it("should normalize address with leading/trailing whitespace", () => {
        const address = "  0x742d35cc6634c0532925a3b844bc9e7595f0beb0  ";
        const normalized = normalizeEthereumAddress(address);

        expect(normalized).toBe("0x742d35cc6634c0532925a3b844bc9e7595f0beb0");
      });
    });

    describe("Invalid Ethereum Addresses", () => {
      it("should throw error for empty address", () => {
        expect(() => normalizeEthereumAddress("")).toThrow(
          "Ethereum address cannot be empty",
        );
      });

      it("should throw error for whitespace-only address", () => {
        expect(() => normalizeEthereumAddress("   ")).toThrow(
          "Ethereum address cannot be empty",
        );
      });

      it("should auto-add 0x prefix for address without it (backward compatibility)", () => {
        const address = "742d35cc6634c0532925a3b844bc9e7595f0beb0";
        const normalized = normalizeEthereumAddress(address);

        expect(normalized).toBe("0x742d35cc6634c0532925a3b844bc9e7595f0beb0");
        expect(normalized).toMatch(/^0x[a-f0-9]{40}$/);
      });

      it("should produce same result regardless of 0x prefix presence", () => {
        const withPrefix = normalizeEthereumAddress(
          "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
        );
        const withoutPrefix = normalizeEthereumAddress(
          "742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
        );

        expect(withPrefix).toBe(withoutPrefix);
        expect(withPrefix).toBe("0x742d35cc6634c0532925a3b844bc9e7595f0beb0");
      });

      it("should throw error for address with only 0x", () => {
        expect(() => normalizeEthereumAddress("0x")).toThrow(
          "Invalid Ethereum address format",
        );
      });

      it("should throw error for too short address", () => {
        expect(() => normalizeEthereumAddress("0x123")).toThrow(
          "Invalid Ethereum address format",
        );
      });

      it("should throw error for too long address", () => {
        expect(() =>
          normalizeEthereumAddress(
            "0x742d35cc6634c0532925a3b844bc9e7595f0beb01",
          ),
        ).toThrow("Invalid Ethereum address format");
      });

      it("should throw error for address with invalid hex character", () => {
        expect(() =>
          normalizeEthereumAddress(
            "0x742d35cc6634c0532925a3b844bc9e7595f0bebZ",
          ),
        ).toThrow("Invalid Ethereum address format");
      });

      it("should throw error for completely invalid string", () => {
        expect(() => normalizeEthereumAddress("not-an-address")).toThrow(
          "Invalid Ethereum address format",
        );
      });

      it("should throw error for address with special characters", () => {
        expect(() =>
          normalizeEthereumAddress(
            "0x742d35cc6634c0532925a3b844bc9e7595f0beb!",
          ),
        ).toThrow("Invalid Ethereum address format");
      });
    });
  });

  describe("normalizeSecp256k1PublicKey", () => {
    describe("Base64 Format (Already Normalized)", () => {
      it("should return base64 public key as-is when already valid", () => {
        const base64PubKey = "A1234567890123456789012345678901234567890123";
        const normalized = normalizeSecp256k1PublicKey(base64PubKey);

        expect(normalized).toBe(base64PubKey);
      });

      it("should return another valid base64 public key as-is", () => {
        const base64PubKey = "A9876543210987654321098765432109876543210987";
        const normalized = normalizeSecp256k1PublicKey(base64PubKey);

        expect(normalized).toBe(base64PubKey);
      });

      it("should handle base64 key with + character", () => {
        const base64PubKey = "A123456789+123456789012345678901234567890123";
        const normalized = normalizeSecp256k1PublicKey(base64PubKey);

        expect(normalized).toBe(base64PubKey);
      });

      it("should handle base64 key with / character", () => {
        const base64PubKey = "A123456789/123456789012345678901234567890123";
        const normalized = normalizeSecp256k1PublicKey(base64PubKey);

        expect(normalized).toBe(base64PubKey);
      });

      it("should handle base64 key with whitespace (trimmed)", () => {
        const base64PubKey = "A1234567890123456789012345678901234567890123";
        const normalized = normalizeSecp256k1PublicKey(`  ${base64PubKey}  `);

        expect(normalized).toBe(base64PubKey);
      });
    });

    describe("Compressed Hex Format (66 chars)", () => {
      it("should convert compressed hex starting with 02 to base64", () => {
        const hexPubKey =
          "02123456789abcdef123456789abcdef123456789abcdef123456789abcdef1234";

        const normalized = normalizeSecp256k1PublicKey(hexPubKey);

        expect(typeof normalized).toBe("string");
        expect(normalized.length).toBeGreaterThan(0);
        expect(normalized).toMatch(/^[A-Za-z0-9+/=]+$/); // Base64 pattern
      });

      it("should convert compressed hex starting with 03 to base64", () => {
        const hexPubKey =
          "03123456789abcdef123456789abcdef123456789abcdef123456789abcdef1234";

        const normalized = normalizeSecp256k1PublicKey(hexPubKey);

        expect(typeof normalized).toBe("string");
        expect(normalized.length).toBeGreaterThan(0);
        expect(normalized).toMatch(/^[A-Za-z0-9+/=]+$/);
      });

      it("should handle compressed hex with uppercase characters", () => {
        const hexPubKey =
          "02ABCDEF123456789ABCDEF123456789ABCDEF123456789ABCDEF123456789ABCD";

        const normalized = normalizeSecp256k1PublicKey(hexPubKey);

        expect(typeof normalized).toBe("string");
        expect(normalized).toMatch(/^[A-Za-z0-9+/=]+$/);
      });

      it("should handle compressed hex with mixed case", () => {
        const hexPubKey =
          "02AbCdEf123456789aBcDeF123456789AbCdEf123456789aBcDeF123456789aBcD";

        const normalized = normalizeSecp256k1PublicKey(hexPubKey);

        expect(typeof normalized).toBe("string");
        expect(normalized).toMatch(/^[A-Za-z0-9+/=]+$/);
      });
    });

    describe("Uncompressed Hex Format (130 chars)", () => {
      it("should convert uncompressed hex starting with 04 to base64", () => {
        const uncompressedHex = "04" + "1".repeat(128);

        const normalized = normalizeSecp256k1PublicKey(uncompressedHex);

        expect(typeof normalized).toBe("string");
        expect(normalized.length).toBeGreaterThan(0);
        expect(normalized).toMatch(/^[A-Za-z0-9+/=]+$/);
      });

      it("should handle uncompressed hex with various characters", () => {
        const uncompressedHex = "04" + "a".repeat(128);

        const normalized = normalizeSecp256k1PublicKey(uncompressedHex);

        expect(typeof normalized).toBe("string");
        expect(normalized).toMatch(/^[A-Za-z0-9+/=]+$/);
      });

      it("should handle uncompressed hex with uppercase", () => {
        const uncompressedHex = "04" + "F".repeat(128);

        const normalized = normalizeSecp256k1PublicKey(uncompressedHex);

        expect(typeof normalized).toBe("string");
        expect(normalized).toMatch(/^[A-Za-z0-9+/=]+$/);
      });
    });

    describe("Invalid Public Key Formats", () => {
      it("should throw error for empty public key", () => {
        expect(() => normalizeSecp256k1PublicKey("")).toThrow(
          "Public key cannot be empty",
        );
      });

      it("should throw error for whitespace-only public key", () => {
        expect(() => normalizeSecp256k1PublicKey("   ")).toThrow(
          "Public key cannot be empty",
        );
      });

      it("should throw error for invalid format", () => {
        expect(() => normalizeSecp256k1PublicKey("invalid-key-format")).toThrow(
          "Invalid Secp256k1 public key format",
        );
      });

      it("should throw error for base64 not starting with A", () => {
        const invalidBase64 = "B123456789abcdef123456789abcdef123456789abc";
        expect(() => normalizeSecp256k1PublicKey(invalidBase64)).toThrow(
          "Invalid Secp256k1 public key format",
        );
      });

      it("should throw error for too short base64", () => {
        const shortBase64 = "A123";
        expect(() => normalizeSecp256k1PublicKey(shortBase64)).toThrow(
          "Invalid Secp256k1 public key format",
        );
      });

      it("should throw error for hex starting with wrong prefix", () => {
        const wrongPrefix =
          "01123456789abcdef123456789abcdef123456789abcdef123456789abcdef1234";
        expect(() => normalizeSecp256k1PublicKey(wrongPrefix)).toThrow(
          "Invalid Secp256k1 public key format",
        );
      });

      it("should throw error for compressed hex with wrong length", () => {
        const wrongLength = "02123456789abcdef"; // Too short
        expect(() => normalizeSecp256k1PublicKey(wrongLength)).toThrow(
          "Invalid Secp256k1 public key format",
        );
      });

      it("should throw error for uncompressed hex with wrong length", () => {
        const wrongLength = "04" + "a".repeat(64); // Too short (should be 128)
        expect(() => normalizeSecp256k1PublicKey(wrongLength)).toThrow(
          "Invalid Secp256k1 public key format",
        );
      });

      it("should truncate long invalid keys in error message", () => {
        const longInvalidKey = "x".repeat(100);

        expect(() => normalizeSecp256k1PublicKey(longInvalidKey)).toThrow(
          /Invalid Secp256k1 public key format: x{50}\.\.\./,
        );
      });

      it("should not truncate short invalid keys in error message", () => {
        const shortInvalidKey = "invalid";

        expect(() => normalizeSecp256k1PublicKey(shortInvalidKey)).toThrow(
          "Invalid Secp256k1 public key format: invalid",
        );
      });
    });
  });

  describe("normalizeJWTIdentifier", () => {
    describe("Valid JWT Identifiers", () => {
      it("should normalize JWT with string aud", () => {
        const normalized = normalizeJWTIdentifier("test-aud", "test-sub");

        expect(normalized).toBe("test-aud.test-sub");
      });

      it("should normalize JWT with array aud (use first element)", () => {
        const normalized = normalizeJWTIdentifier(
          ["test-aud", "other-aud"],
          "test-sub",
        );

        expect(normalized).toBe("test-aud.test-sub");
      });

      it("should handle complex aud and sub values", () => {
        const normalized = normalizeJWTIdentifier(
          "my-app-prod-v2",
          "user-123-456-789",
        );

        expect(normalized).toBe("my-app-prod-v2.user-123-456-789");
      });

      it("should handle array aud with multiple elements", () => {
        const normalized = normalizeJWTIdentifier(
          ["first-aud", "second-aud", "third-aud"],
          "my-subject",
        );

        expect(normalized).toBe("first-aud.my-subject");
      });

      it("should handle aud and sub with special characters", () => {
        const normalized = normalizeJWTIdentifier(
          "aud-with-dashes_and_underscores",
          "sub:with:colons",
        );

        expect(normalized).toBe(
          "aud-with-dashes_and_underscores.sub:with:colons",
        );
      });
    });

    describe("Invalid JWT Identifiers", () => {
      it("should throw error for missing aud (undefined)", () => {
        expect(() =>
          normalizeJWTIdentifier(undefined as any, "test-sub"),
        ).toThrow('JWT identifier must contain valid "aud" and "sub" claims');
      });

      it("should throw error for missing sub (undefined)", () => {
        expect(() =>
          normalizeJWTIdentifier("test-aud", undefined as any),
        ).toThrow('JWT identifier must contain valid "aud" and "sub" claims');
      });

      it("should throw error for missing aud (null)", () => {
        expect(() => normalizeJWTIdentifier(null as any, "test-sub")).toThrow(
          'JWT identifier must contain valid "aud" and "sub" claims',
        );
      });

      it("should throw error for missing sub (null)", () => {
        expect(() => normalizeJWTIdentifier("test-aud", null as any)).toThrow(
          'JWT identifier must contain valid "aud" and "sub" claims',
        );
      });

      it("should throw error for empty string aud", () => {
        expect(() => normalizeJWTIdentifier("", "test-sub")).toThrow(
          'JWT identifier must contain valid "aud" and "sub" claims',
        );
      });

      it("should throw error for empty string sub", () => {
        expect(() => normalizeJWTIdentifier("test-aud", "")).toThrow(
          'JWT identifier must contain valid "aud" and "sub" claims',
        );
      });

      it("should throw error for empty array aud", () => {
        expect(() => normalizeJWTIdentifier([], "test-sub")).toThrow(
          'JWT "aud" claim cannot be empty',
        );
      });

      it("should throw error for array aud with empty first element", () => {
        expect(() =>
          normalizeJWTIdentifier(["", "second"], "test-sub"),
        ).toThrow('JWT "aud" claim cannot be empty');
      });
    });

    describe("Type Safety", () => {
      it("should handle single-element array aud", () => {
        const normalized = normalizeJWTIdentifier(["only-aud"], "test-sub");

        expect(normalized).toBe("only-aud.test-sub");
      });

      it("should handle very long aud string", () => {
        const longAud = "a".repeat(1000);
        const normalized = normalizeJWTIdentifier(longAud, "test-sub");

        expect(normalized).toBe(`${longAud}.test-sub`);
      });

      it("should handle very long sub string", () => {
        const longSub = "s".repeat(1000);
        const normalized = normalizeJWTIdentifier("test-aud", longSub);

        expect(normalized).toBe(`test-aud.${longSub}`);
      });
    });
  });
});
