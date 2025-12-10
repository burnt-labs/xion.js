import { describe, it, expect } from "vitest";
import {
  calculateEthWalletSalt,
  calculateSecp256k1Salt,
  calculateJWTSalt,
  calculateSalt,
  hexSaltToUint8Array,
} from "../salt";
import {
  AUTHENTICATOR_TYPE,
  type AuthenticatorType,
} from "../../types/account";
import { ETH_WALLET_TEST_DATA } from "@burnt-labs/test-utils/mocks";

describe("salt.ts - Salt Calculation Utilities", () => {
  // Valid test data for deterministic salt calculation
  const validEthAddress = ETH_WALLET_TEST_DATA.address;
  const validEthAddressWithout0x = ETH_WALLET_TEST_DATA.addressNoPrefix;
  const validSecp256k1Pubkey =
    "03d8f1b7b8e3c6c8f7b8f7c6e5f7c8d9e0f1c2d3e4f5c6d7e8f9c0d1e2f3c4d5";
  const validJWT = "https://accounts.google.com.user123";

  describe("🔴 CRITICAL: calculateEthWalletSalt()", () => {
    it("should return same salt for same address (determinism check)", () => {
      const salt1 = calculateEthWalletSalt(validEthAddress);
      const salt2 = calculateEthWalletSalt(validEthAddress);
      const salt3 = calculateEthWalletSalt(validEthAddress);

      expect(salt1).toBe(salt2);
      expect(salt2).toBe(salt3);
      expect(salt1).toMatch(/^[a-f0-9]{64}$/); // Valid SHA256 hex string (64 chars)
    });

    it("should handle addresses with 0x prefix", () => {
      const saltWith0x = calculateEthWalletSalt(validEthAddress);
      const saltWithout0x = calculateEthWalletSalt(validEthAddressWithout0x);

      // Both should produce the same salt (0x prefix should be stripped)
      expect(saltWith0x).toBe(saltWithout0x);
    });

    it("should handle addresses without 0x prefix", () => {
      const salt = calculateEthWalletSalt(validEthAddressWithout0x);
      expect(salt).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should return different salts for different addresses", () => {
      const address1 = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0";
      const address2 = "0x1234567890123456789012345678901234567890";

      const salt1 = calculateEthWalletSalt(address1);
      const salt2 = calculateEthWalletSalt(address2);

      expect(salt1).not.toBe(salt2);
    });

    it("should handle uppercase addresses", () => {
      const lowerAddress = validEthAddress.toLowerCase();
      const upperAddress = validEthAddress.toUpperCase();

      const saltLower = calculateEthWalletSalt(lowerAddress);
      const saltUpper = calculateEthWalletSalt(upperAddress);

      // BUG FIX: Now normalizes to lowercase, so uppercase and lowercase produce same salt
      expect(saltLower).toBe(saltUpper);
    });

    it("should handle mixed case addresses (checksum format)", () => {
      // Ethereum addresses use EIP-55 checksum format with mixed case
      const checksumAddress = "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed";
      const salt = calculateEthWalletSalt(checksumAddress);
      expect(salt).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should produce valid SHA256 hash (64 hex characters)", () => {
      const salt = calculateEthWalletSalt(validEthAddress);
      expect(salt.length).toBe(64); // SHA256 = 32 bytes = 64 hex chars
      expect(salt).toMatch(/^[a-f0-9]+$/); // Only lowercase hex chars
    });
  });

  describe("🔴 CRITICAL: calculateSecp256k1Salt()", () => {
    it("should return same salt for same pubkey (determinism check)", () => {
      const salt1 = calculateSecp256k1Salt(validSecp256k1Pubkey);
      const salt2 = calculateSecp256k1Salt(validSecp256k1Pubkey);
      const salt3 = calculateSecp256k1Salt(validSecp256k1Pubkey);

      expect(salt1).toBe(salt2);
      expect(salt2).toBe(salt3);
      expect(salt1).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should return different salts for different pubkeys", () => {
      const pubkey1 =
        "03d8f1b7b8e3c6c8f7b8f7c6e5f7c8d9e0f1c2d3e4f5c6d7e8f9c0d1e2f3c4d5";
      const pubkey2 =
        "02a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1";

      const salt1 = calculateSecp256k1Salt(pubkey1);
      const salt2 = calculateSecp256k1Salt(pubkey2);

      expect(salt1).not.toBe(salt2);
    });

    it("should produce valid SHA256 hash (64 hex characters)", () => {
      const salt = calculateSecp256k1Salt(validSecp256k1Pubkey);
      expect(salt.length).toBe(64);
      expect(salt).toMatch(/^[a-f0-9]+$/);
    });

    it("should handle compressed pubkeys (33 bytes)", () => {
      // Compressed pubkey starts with 02 or 03 (33 bytes)
      const compressedPubkey =
        "02d8f1b7b8e3c6c8f7b8f7c6e5f7c8d9e0f1c2d3e4f5c6d7e8f9c0d1e2f3c4d5";
      const salt = calculateSecp256k1Salt(compressedPubkey);
      expect(salt).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should handle uncompressed pubkeys (65 bytes)", () => {
      // Uncompressed pubkey starts with 04 (65 bytes)
      const uncompressedPubkey =
        "04d8f1b7b8e3c6c8f7b8f7c6e5f7c8d9e0f1c2d3e4f5c6d7e8f9c0d1e2f3c4d5" +
        "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2";
      const salt = calculateSecp256k1Salt(uncompressedPubkey);
      expect(salt).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should treat pubkey as string, not hex bytes", () => {
      // IMPLEMENTATION NOTE: calculateSecp256k1Salt uses Buffer.from(pubkey)
      // which treats it as UTF-8 string, NOT hex bytes
      // This is different from calculateEthWalletSalt which uses Buffer.from(hex, 'hex')
      const pubkey = "test-pubkey-string";
      const salt = calculateSecp256k1Salt(pubkey);
      expect(salt).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe("🔴 CRITICAL: calculateJWTSalt()", () => {
    it("should return same salt for same JWT (determinism check)", () => {
      const salt1 = calculateJWTSalt(validJWT);
      const salt2 = calculateJWTSalt(validJWT);
      const salt3 = calculateJWTSalt(validJWT);

      expect(salt1).toBe(salt2);
      expect(salt2).toBe(salt3);
      expect(salt1).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should return different salts for different JWTs", () => {
      const jwt1 = "https://accounts.google.com.user123";
      const jwt2 = "https://accounts.google.com.user456";

      const salt1 = calculateJWTSalt(jwt1);
      const salt2 = calculateJWTSalt(jwt2);

      expect(salt1).not.toBe(salt2);
    });

    it("should produce valid SHA256 hash (64 hex characters)", () => {
      const salt = calculateJWTSalt(validJWT);
      expect(salt.length).toBe(64);
      expect(salt).toMatch(/^[a-f0-9]+$/);
    });

    it("should handle full JWT tokens", () => {
      const fullJWT =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
      const salt = calculateJWTSalt(fullJWT);
      expect(salt).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should handle aud.sub format", () => {
      const audSubFormat = "https://stytch.com.user-test-abc123";
      const salt = calculateJWTSalt(audSubFormat);
      expect(salt).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should handle special characters in JWT", () => {
      const jwtWithSpecialChars =
        "https://accounts.google.com.user+special/chars=test";
      const salt = calculateJWTSalt(jwtWithSpecialChars);
      expect(salt).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should treat JWT as string, not hex bytes", () => {
      // Same behavior as calculateSecp256k1Salt
      const jwt = "simple-string-identifier";
      const salt = calculateJWTSalt(jwt);
      expect(salt).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe("🔴 CRITICAL: calculateSalt() - Routing Logic", () => {
    it("should route to calculateEthWalletSalt for EthWallet type", () => {
      const genericSalt = calculateSalt(
        AUTHENTICATOR_TYPE.EthWallet,
        validEthAddress,
      );
      const specificSalt = calculateEthWalletSalt(validEthAddress);

      expect(genericSalt).toBe(specificSalt);
    });

    it("should route to calculateSecp256k1Salt for Secp256K1 type", () => {
      const genericSalt = calculateSalt(
        AUTHENTICATOR_TYPE.Secp256K1,
        validSecp256k1Pubkey,
      );
      const specificSalt = calculateSecp256k1Salt(validSecp256k1Pubkey);

      expect(genericSalt).toBe(specificSalt);
    });

    it("should route to calculateJWTSalt for JWT type", () => {
      const genericSalt = calculateSalt(AUTHENTICATOR_TYPE.JWT, validJWT);
      const specificSalt = calculateJWTSalt(validJWT);

      expect(genericSalt).toBe(specificSalt);
    });

    it("should route to calculateSecp256k1Salt for Passkey type", () => {
      const credential = "passkey-credential-id";
      const passkeySalt = calculateSalt(AUTHENTICATOR_TYPE.Passkey, credential);
      const secp256k1Salt = calculateSecp256k1Salt(credential);

      // Passkey uses same calculation as Secp256K1
      expect(passkeySalt).toBe(secp256k1Salt);
    });

    it("should route to calculateSecp256k1Salt for Ed25519 type", () => {
      const pubkey = "ed25519-pubkey-string";
      const ed25519Salt = calculateSalt(AUTHENTICATOR_TYPE.Ed25519, pubkey);
      const secp256k1Salt = calculateSecp256k1Salt(pubkey);

      // Ed25519 uses same calculation as Secp256K1
      expect(ed25519Salt).toBe(secp256k1Salt);
    });

    it("should route to calculateSecp256k1Salt for Sr25519 type", () => {
      const pubkey = "sr25519-pubkey-string";
      const sr25519Salt = calculateSalt(AUTHENTICATOR_TYPE.Sr25519, pubkey);
      const secp256k1Salt = calculateSecp256k1Salt(pubkey);

      // Sr25519 uses same calculation as Secp256K1
      expect(sr25519Salt).toBe(secp256k1Salt);
    });

    it("should handle all authenticator types without throwing", () => {
      // Use type-appropriate credentials for each authenticator type
      const typeCredentials: Array<[AuthenticatorType, string]> = [
        [
          AUTHENTICATOR_TYPE.EthWallet,
          "0x1234567890123456789012345678901234567890",
        ],
        [AUTHENTICATOR_TYPE.Secp256K1, "test-credential"],
        [AUTHENTICATOR_TYPE.JWT, "test-credential"],
        [AUTHENTICATOR_TYPE.Passkey, "test-credential"],
        [AUTHENTICATOR_TYPE.Ed25519, "test-credential"],
        [AUTHENTICATOR_TYPE.Sr25519, "test-credential"],
      ];

      typeCredentials.forEach(([type, credential]) => {
        expect(() => calculateSalt(type, credential)).not.toThrow();
      });
    });

    it("should throw error for invalid authenticator type (TypeScript bypass)", () => {
      const invalidType = "InvalidType" as AuthenticatorType;
      expect(() => calculateSalt(invalidType, "test-credential")).toThrow(
        /Unsupported authenticator type/,
      );
    });
  });

  describe("🔴 CRITICAL: Edge Cases - Empty/Invalid Inputs", () => {
    it("should throw error for empty string for EthWallet", () => {
      // BUG FIX: Now validates input, so empty string throws error
      expect(() => calculateEthWalletSalt("")).toThrow(
        /invalid.*ethereum address/i,
      );
    });

    it("should throw error for empty string for Secp256k1 (defense-in-depth)", () => {
      // Runtime validation now throws error for empty strings
      expect(() => calculateSecp256k1Salt("")).toThrow(
        /public key.*non-empty/i,
      );
    });

    it("should throw error for empty string for JWT (defense-in-depth)", () => {
      // Runtime validation now throws error for empty strings
      expect(() => calculateJWTSalt("")).toThrow(/jwt.*non-empty/i);
    });

    it("should handle whitespace-only strings", () => {
      const whitespaceCredential = "   ";
      const salt = calculateSecp256k1Salt(whitespaceCredential);
      expect(salt).toMatch(/^[a-f0-9]{64}$/);
      // SHA256 of three spaces (UTF-8 bytes: 0x20 0x20 0x20)
      expect(salt).toBe(
        "0aad7da77d2ed59c396c99a74e49f3a4524dcdbcb5163251b1433d640247aeb4",
      );
    });

    it("should handle newlines in credentials", () => {
      const credentialWithNewline = "test\ncredential";
      const salt = calculateSecp256k1Salt(credentialWithNewline);
      expect(salt).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should handle null characters in credentials", () => {
      const credentialWithNull = "test\x00credential";
      const salt = calculateSecp256k1Salt(credentialWithNull);
      expect(salt).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe("🔴 CRITICAL: Edge Cases - EthWallet Address Prefix Handling", () => {
    it("should strip 0x prefix from Ethereum addresses", () => {
      const addressWith0x = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0";
      const addressWithout0x = "742d35Cc6634C0532925a3b844Bc9e7595f0bEb0";

      const saltWith0x = calculateEthWalletSalt(addressWith0x);
      const saltWithout0x = calculateEthWalletSalt(addressWithout0x);

      expect(saltWith0x).toBe(saltWithout0x);
    });

    it("should handle multiple 0x prefixes (normalized)", () => {
      // normalizeHexPrefix() removes duplicate 0x prefixes, making this valid
      const addressWithDouble0x =
        "0x0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0";
      const addressNormal = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0";

      const saltDouble = calculateEthWalletSalt(addressWithDouble0x);
      const saltNormal = calculateEthWalletSalt(addressNormal);

      // After normalization, both should produce the same salt
      expect(saltDouble).toBe(saltNormal);
    });

    it("should handle 0X uppercase prefix", () => {
      const addressWithUppercase0X =
        "0X742d35Cc6634C0532925a3b844Bc9e7595f0bEb0";
      const addressWithLowercase0x =
        "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0";

      const saltUpper = calculateEthWalletSalt(addressWithUppercase0X);
      const saltLower = calculateEthWalletSalt(addressWithLowercase0x);

      // BUG FIX: Now uses case-insensitive regex /^0x/i, so both produce same salt
      expect(saltUpper).toBe(saltLower);
    });

    it("should reject 0x in the middle of address", () => {
      // BUG FIX: Now validates hex, so 'x' in middle throws error
      const addressWith0xMiddle = "742d0x35Cc6634C0532925a3b844Bc9e7595f0bEb0";
      expect(() => calculateEthWalletSalt(addressWith0xMiddle)).toThrow(
        /invalid.*ethereum address/i,
      );
    });
  });

  describe("🟡 HIGH: Invalid Hex Handling for EthWallet", () => {
    it("should reject invalid hex characters in address", () => {
      // BUG FIX: Now validates hex, so 'Z' throws error
      const invalidAddress = "742d35Cc6634C0532925a3b844Bc9e7595f0bEZ0"; // 'Z' is invalid
      expect(() => calculateEthWalletSalt(invalidAddress)).toThrow(
        /invalid.*ethereum address/i,
      );
    });

    it("should reject odd-length hex strings", () => {
      // BUG FIX: Now validates length, so 39 chars throws error
      const oddLengthAddress = "742d35Cc6634C0532925a3b844Bc9e7595f0bE"; // 39 chars (missing 1)
      expect(() => calculateEthWalletSalt(oddLengthAddress)).toThrow(
        /invalid.*ethereum address/i,
      );
    });

    it("should reject non-hex strings", () => {
      // BUG FIX: Now validates format, so non-hex throws error
      const nonHexAddress = "not-a-hex-address";
      expect(() => calculateEthWalletSalt(nonHexAddress)).toThrow(
        /invalid.*ethereum address/i,
      );
    });
  });

  describe("🟡 HIGH: Cross-Authenticator Consistency", () => {
    it("should produce different salts for same credential across authenticator types", () => {
      // Use valid Ethereum address for EthWallet type
      const ethAddress = "0x1234567890123456789012345678901234567890";
      const credential = "test-credential-123";

      const ethSalt = calculateSalt(AUTHENTICATOR_TYPE.EthWallet, ethAddress);
      const secp256k1Salt = calculateSalt(
        AUTHENTICATOR_TYPE.Secp256K1,
        credential,
      );
      const jwtSalt = calculateSalt(AUTHENTICATOR_TYPE.JWT, credential);

      // EthWallet interprets as hex, others as string - different results
      expect(ethSalt).not.toBe(secp256k1Salt);
      // JWT and Secp256k1 use same calculation
      expect(jwtSalt).toBe(secp256k1Salt);
    });

    it("should produce same salts for Passkey/Ed25519/Sr25519 (use Secp256k1 implementation)", () => {
      const credential = "test-pubkey";

      const passkeySalt = calculateSalt(AUTHENTICATOR_TYPE.Passkey, credential);
      const ed25519Salt = calculateSalt(AUTHENTICATOR_TYPE.Ed25519, credential);
      const sr25519Salt = calculateSalt(AUTHENTICATOR_TYPE.Sr25519, credential);
      const secp256k1Salt = calculateSalt(
        AUTHENTICATOR_TYPE.Secp256K1,
        credential,
      );

      expect(passkeySalt).toBe(secp256k1Salt);
      expect(ed25519Salt).toBe(secp256k1Salt);
      expect(sr25519Salt).toBe(secp256k1Salt);
    });
  });

  describe("🟢 MEDIUM: Type Safety and Input Validation", () => {
    it("should handle null/undefined gracefully (TypeScript should prevent this)", () => {
      // These tests verify runtime behavior if TypeScript is bypassed
      expect(() => calculateEthWalletSalt(null as any)).toThrow();
      expect(() => calculateSecp256k1Salt(undefined as any)).toThrow();
      expect(() => calculateJWTSalt(null as any)).toThrow();
    });

    it("should handle numeric inputs (TypeScript should prevent this)", () => {
      expect(() => calculateEthWalletSalt(12345 as any)).toThrow();
      expect(() => calculateSecp256k1Salt(67890 as any)).toThrow();
      expect(() => calculateJWTSalt(11111 as any)).toThrow();
    });

    it("should handle object inputs (TypeScript should prevent this)", () => {
      const obj = { address: "test" };
      expect(() => calculateEthWalletSalt(obj as any)).toThrow();
      expect(() => calculateSecp256k1Salt(obj as any)).toThrow();
      expect(() => calculateJWTSalt(obj as any)).toThrow();
    });

    it("should handle array inputs (TypeScript should prevent this)", () => {
      const arr = ["test"];
      // calculateEthWalletSalt calls normalizeHexPrefix().toLowerCase(), which throws on arrays
      expect(() => calculateEthWalletSalt(arr as any)).toThrow(
        /toLowerCase is not a function/,
      );
      // Runtime validation now throws error for non-string inputs
      expect(() => calculateSecp256k1Salt(arr as any)).toThrow();
      expect(() => calculateJWTSalt(arr as any)).toThrow();
    });
  });

  describe("🔒 Security: Collision Resistance", () => {
    it("should produce unique salts for sequential inputs", () => {
      const salts = new Set<string>();

      // Generate salts with incrementing credentials
      for (let i = 0; i < 100; i++) {
        const credential = i.toString();
        const salt = calculateSecp256k1Salt(credential);
        salts.add(salt);
      }

      // All salts should be unique
      expect(salts.size).toBe(100);
    });

    it("should produce different salts for similar addresses", () => {
      // Test addresses that differ by 1 character
      const addresses = [
        "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
        "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
        "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2",
        "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb3",
      ];

      const salts = addresses.map((addr) => calculateEthWalletSalt(addr));
      const uniqueSalts = new Set(salts);

      expect(uniqueSalts.size).toBe(addresses.length);
    });

    it("should produce different salts for byte-order variations", () => {
      const credential1 = "0123456789abcdef";
      const credential2 = "fedcba9876543210";

      const salt1 = calculateSecp256k1Salt(credential1);
      const salt2 = calculateSecp256k1Salt(credential2);

      expect(salt1).not.toBe(salt2);
    });

    it("should produce different salts for case variations", () => {
      const lowerCredential = "test-credential";
      const upperCredential = "TEST-CREDENTIAL";
      const mixedCredential = "Test-Credential";

      const saltLower = calculateSecp256k1Salt(lowerCredential);
      const saltUpper = calculateSecp256k1Salt(upperCredential);
      const saltMixed = calculateSecp256k1Salt(mixedCredential);

      expect(saltLower).not.toBe(saltUpper);
      expect(saltLower).not.toBe(saltMixed);
      expect(saltUpper).not.toBe(saltMixed);
    });
  });

  describe("🔒 Security: Known SHA256 Test Vectors", () => {
    it("should reject empty input (defense-in-depth)", () => {
      // Runtime validation now throws error for empty strings
      expect(() => calculateSecp256k1Salt("")).toThrow(
        /public key.*non-empty/i,
      );
    });

    it("should produce correct SHA256 for 'abc'", () => {
      const salt = calculateSecp256k1Salt("abc");
      // SHA256 of 'abc' is well-known test vector
      expect(salt).toBe(
        "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
      );
    });

    it("should produce correct SHA256 for 'The quick brown fox jumps over the lazy dog'", () => {
      const salt = calculateSecp256k1Salt(
        "The quick brown fox jumps over the lazy dog",
      );
      // SHA256 of this phrase is well-known test vector
      expect(salt).toBe(
        "d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592",
      );
    });

    it("should produce correct SHA256 for hex address bytes", () => {
      // Test known Ethereum address → salt conversion
      const address = "0000000000000000000000000000000000000000"; // 20 bytes of zeros
      const salt = calculateEthWalletSalt(address);
      // SHA256 of 20 zero bytes (0x00 repeated 20 times)
      expect(salt).toBe(
        "de47c9b27eb8d300dbb5f2c353e632c393262cf06340c4fa7f1b40c4cbd36f90",
      );
    });
  });

  describe("🔒 Security: Real-World Credential Examples", () => {
    it("should handle real Ethereum mainnet address", () => {
      const mainnetAddress = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"; // Vitalik's address
      const salt = calculateEthWalletSalt(mainnetAddress);
      expect(salt).toMatch(/^[a-f0-9]{64}$/);
      expect(salt.length).toBe(64);
    });

    it("should handle real Cosmos Secp256k1 pubkey", () => {
      const realPubkey = "A08EGB7ro1ORuFhjOnZcSgwYlpe0DSFjVNUIkNNQxwKQ"; // Example from Cosmos
      const salt = calculateSecp256k1Salt(realPubkey);
      expect(salt).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should handle real Google OAuth JWT sub", () => {
      const googleSub = "https://accounts.google.com.103547991597142817347";
      const salt = calculateJWTSalt(googleSub);
      expect(salt).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should handle real Stytch session identifier", () => {
      const stytchIdentifier =
        "https://stytch.com/project-test-abc123.user-test-xyz456";
      const salt = calculateJWTSalt(stytchIdentifier);
      expect(salt).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe("🔒 Security: AUTHENTICATOR_TYPE Constants", () => {
    it("should have correct authenticator type constants", () => {
      expect(AUTHENTICATOR_TYPE.EthWallet).toBe("EthWallet");
      expect(AUTHENTICATOR_TYPE.Secp256K1).toBe("Secp256K1");
      expect(AUTHENTICATOR_TYPE.Ed25519).toBe("Ed25519");
      expect(AUTHENTICATOR_TYPE.JWT).toBe("JWT");
      expect(AUTHENTICATOR_TYPE.Passkey).toBe("Passkey");
      expect(AUTHENTICATOR_TYPE.Sr25519).toBe("Sr25519");
    });

    it("should prevent type mutation (readonly + Object.freeze)", () => {
      // TypeScript enforces readonly at compile time
      // Object.freeze() prevents mutation at runtime (BUG FIX #23)
      const originalValue = AUTHENTICATOR_TYPE.EthWallet;
      expect(() => {
        (AUTHENTICATOR_TYPE as any).EthWallet = "Modified";
      }).toThrow(/read only/i);
      // Value should remain unchanged
      expect(AUTHENTICATOR_TYPE.EthWallet).toBe(originalValue);
    });

    it("should support all authenticator types in calculateSalt", () => {
      // Use type-appropriate credentials
      const typeCredentials = new Map<string, string>([
        [
          AUTHENTICATOR_TYPE.EthWallet,
          "0x1234567890123456789012345678901234567890",
        ],
        [AUTHENTICATOR_TYPE.Secp256K1, "test"],
        [AUTHENTICATOR_TYPE.Ed25519, "test"],
        [AUTHENTICATOR_TYPE.JWT, "test"],
        [AUTHENTICATOR_TYPE.Passkey, "test"],
        [AUTHENTICATOR_TYPE.Sr25519, "test"],
      ]);

      const types = Object.values(AUTHENTICATOR_TYPE);
      types.forEach((type) => {
        const credential = typeCredentials.get(type) || "test";
        expect(() => calculateSalt(type, credential)).not.toThrow();
      });
    });
  });

  describe("🔴 CRITICAL: hexSaltToUint8Array()", () => {
    const validHexSalt = "a".repeat(64); // 32 bytes = 64 hex chars

    describe("Basic Functionality", () => {
      it("should convert hex salt to Uint8Array", () => {
        const result = hexSaltToUint8Array(validHexSalt);
        expect(result).toBeInstanceOf(Uint8Array);
        expect(result.length).toBe(32); // 64 hex chars = 32 bytes
      });

      it("should produce consistent results for same input", () => {
        const result1 = hexSaltToUint8Array(validHexSalt);
        const result2 = hexSaltToUint8Array(validHexSalt);

        expect(result1.length).toBe(result2.length);
        expect(Buffer.from(result1).toString("hex")).toBe(
          Buffer.from(result2).toString("hex"),
        );
      });

      it("should convert salt from calculateEthWalletSalt", () => {
        const address = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0";
        const hexSalt = calculateEthWalletSalt(address);
        const uint8Salt = hexSaltToUint8Array(hexSalt);

        expect(uint8Salt).toBeInstanceOf(Uint8Array);
        expect(uint8Salt.length).toBe(32);
      });

      it("should convert salt from calculateSecp256k1Salt", () => {
        const pubkey =
          "03d8f1b7b8e3c6c8f7b8f7c6e5f7c8d9e0f1c2d3e4f5c6d7e8f9c0d1e2f3c4d5";
        const hexSalt = calculateSecp256k1Salt(pubkey);
        const uint8Salt = hexSaltToUint8Array(hexSalt);

        expect(uint8Salt).toBeInstanceOf(Uint8Array);
        expect(uint8Salt.length).toBe(32);
      });

      it("should convert salt from calculateJWTSalt", () => {
        const jwt = "https://accounts.google.com.user123";
        const hexSalt = calculateJWTSalt(jwt);
        const uint8Salt = hexSaltToUint8Array(hexSalt);

        expect(uint8Salt).toBeInstanceOf(Uint8Array);
        expect(uint8Salt.length).toBe(32);
      });
    });

    describe("Salt Length Validation", () => {
      it("should accept exactly 32 bytes (64 hex chars)", () => {
        const salt = "a".repeat(64);
        expect(() => hexSaltToUint8Array(salt)).not.toThrow();
      });

      it("should reject salt with 31 bytes (62 hex chars)", () => {
        const shortSalt = "a".repeat(62);
        expect(() => hexSaltToUint8Array(shortSalt)).toThrow(/salt.*32 bytes/i);
      });

      it("should reject salt with 33 bytes (66 hex chars)", () => {
        const longSalt = "a".repeat(66);
        expect(() => hexSaltToUint8Array(longSalt)).toThrow(/salt.*32 bytes/i);
      });

      it("should reject odd-length hex string", () => {
        const oddSalt = "a".repeat(63);
        expect(() => hexSaltToUint8Array(oddSalt)).toThrow(/salt.*32 bytes/i);
      });
    });

    describe("Invalid Input Handling", () => {
      it("should throw error for empty salt", () => {
        expect(() => hexSaltToUint8Array("")).toThrow(/invalid.*salt/i);
      });

      it("should reject invalid hex characters", () => {
        const invalidSalt = "g".repeat(64);
        expect(() => hexSaltToUint8Array(invalidSalt)).toThrow(
          /invalid.*salt/i,
        );
      });

      it("should reject salt with special characters", () => {
        const specialCharSalt = "abcd-efgh".repeat(8);
        expect(() => hexSaltToUint8Array(specialCharSalt)).toThrow(
          /invalid.*salt/i,
        );
      });

      it("should reject salt with spaces", () => {
        const saltWithSpaces = "abcd efgh".repeat(8);
        expect(() => hexSaltToUint8Array(saltWithSpaces)).toThrow(
          /invalid.*salt/i,
        );
      });

      it("should reject salt with 0x prefix", () => {
        const saltWith0x = `0x${"a".repeat(64)}`;
        expect(() => hexSaltToUint8Array(saltWith0x)).toThrow(/invalid.*salt/i);
      });
    });

    describe("Edge Cases", () => {
      it("should handle salt with all zeros", () => {
        const zeroSalt = "0".repeat(64);
        const result = hexSaltToUint8Array(zeroSalt);

        expect(result).toBeInstanceOf(Uint8Array);
        expect(result.length).toBe(32);
        // All bytes should be 0
        expect(Array.from(result).every((byte) => byte === 0)).toBe(true);
      });

      it("should handle salt with all f's (max value)", () => {
        const maxSalt = "f".repeat(64);
        const result = hexSaltToUint8Array(maxSalt);

        expect(result).toBeInstanceOf(Uint8Array);
        expect(result.length).toBe(32);
        // All bytes should be 255 (0xff)
        expect(Array.from(result).every((byte) => byte === 255)).toBe(true);
      });

      it("should handle uppercase hex salt", () => {
        const upperSalt = "ABCDEF".repeat(11).substring(0, 64);
        const result = hexSaltToUint8Array(upperSalt);

        expect(result).toBeInstanceOf(Uint8Array);
        expect(result.length).toBe(32);
      });

      it("should handle mixed case hex salt", () => {
        const mixedSalt = "AaBbCcDdEeFf".repeat(6).substring(0, 64);
        const result = hexSaltToUint8Array(mixedSalt);

        expect(result).toBeInstanceOf(Uint8Array);
        expect(result.length).toBe(32);
      });
    });

    describe("Integration with calculateSmartAccountAddress", () => {
      it("should produce Uint8Array compatible with instantiate2Address", () => {
        const address = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0";
        const hexSalt = calculateEthWalletSalt(address);
        const uint8Salt = hexSaltToUint8Array(hexSalt);

        // Verify it can be used with Buffer.from
        const buffer = Buffer.from(uint8Salt);
        expect(buffer.length).toBe(32);

        // Verify round-trip conversion
        const hexFromUint8 = buffer.toString("hex");
        expect(hexFromUint8).toBe(hexSalt);
      });

      it("should be compatible with AA API address calculation", () => {
        // Simulate AA API flow
        const credential = "0x1234567890123456789012345678901234567890";
        const hexSalt = calculateEthWalletSalt(credential);
        const saltBytes = hexSaltToUint8Array(hexSalt);

        // Should be able to use with instantiate2Address
        expect(saltBytes).toBeInstanceOf(Uint8Array);
        expect(saltBytes.length).toBe(32);
        expect(saltBytes.byteLength).toBe(32);
      });
    });

    describe("Round-Trip Conversion", () => {
      it("should preserve data in hex -> Uint8Array -> hex conversion", () => {
        const originalHex = "1234567890abcdef".repeat(4); // 64 chars
        const uint8Array = hexSaltToUint8Array(originalHex);
        const convertedHex = Buffer.from(uint8Array).toString("hex");

        expect(convertedHex).toBe(originalHex);
      });

      it("should preserve uppercase hex after round-trip", () => {
        const originalHex = "ABCDEF1234567890".repeat(4); // 64 chars
        const uint8Array = hexSaltToUint8Array(originalHex);
        const convertedHex = Buffer.from(uint8Array).toString("hex");

        // Buffer.toString('hex') returns lowercase, so compare case-insensitive
        expect(convertedHex.toLowerCase()).toBe(originalHex.toLowerCase());
      });
    });

    describe("Type Safety", () => {
      it("should reject non-string inputs", () => {
        expect(() => hexSaltToUint8Array(123 as any)).toThrow();
        expect(() => hexSaltToUint8Array(null as any)).toThrow();
        expect(() => hexSaltToUint8Array(undefined as any)).toThrow();
        expect(() => hexSaltToUint8Array({} as any)).toThrow();
        expect(() => hexSaltToUint8Array([] as any)).toThrow();
      });
    });
  });
});
