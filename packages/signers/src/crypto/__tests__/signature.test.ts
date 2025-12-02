import { describe, it, expect, vi } from "vitest";
import {
  formatEthSignature,
  formatSecp256k1Signature,
  formatSecp256k1Pubkey,
  formatHexMessage,
  utf8ToHex,
  formatEthSignatureToBase64,
  formatSecp256k1SignatureToBase64,
} from "../signature";

describe("signature.ts - Signature Formatting Utilities", () => {
  describe("🔴 CRITICAL: formatEthSignature()", () => {
    // Valid Ethereum signature (65 bytes = 130 hex chars)
    const validEthSig =
      "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" +
      "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" +
      "01"; // r(32) + s(32) + v(1) = 65 bytes

    describe("Basic Functionality", () => {
      it("should add 0x prefix to signature without prefix", () => {
        const result = formatEthSignature(validEthSig);
        expect(result).toBe(`0x${validEthSig}`);
        expect(result).toHaveLength(132); // 130 + '0x'
      });

      it("should preserve 0x prefix when already present", () => {
        const withPrefix = `0x${validEthSig}`;
        const result = formatEthSignature(withPrefix);
        expect(result).toBe(withPrefix);
        expect(result).toHaveLength(132);
      });

      it("should be idempotent (calling multiple times returns same result)", () => {
        const firstCall = formatEthSignature(validEthSig);
        const secondCall = formatEthSignature(firstCall);
        const thirdCall = formatEthSignature(secondCall);

        expect(firstCall).toBe(secondCall);
        expect(secondCall).toBe(thirdCall);
      });

      it("should handle uppercase hex characters", () => {
        const upperSig = validEthSig.toUpperCase();
        const result = formatEthSignature(upperSig);
        expect(result).toBe(`0x${upperSig}`);
      });

      it("should handle mixed case hex characters", () => {
        const mixedSig = "A1B2c3D4e5F6" + "0".repeat(118);
        const result = formatEthSignature(mixedSig);
        expect(result).toBe(`0x${mixedSig}`);
      });
    });

    describe("Signature Length Validation", () => {
      it("should accept exactly 65 bytes (130 hex chars)", () => {
        expect(() => formatEthSignature(validEthSig)).not.toThrow();
      });

      it("should reject signature with 64 bytes (missing v byte)", () => {
        const shortSig = "a".repeat(128); // 64 bytes
        expect(() => formatEthSignature(shortSig)).toThrow(
          /ethereum signature.*65 bytes/i,
        );
      });

      it("should reject signature with 66 bytes (extra byte)", () => {
        const longSig = "a".repeat(132); // 66 bytes
        expect(() => formatEthSignature(longSig)).toThrow(
          /ethereum signature.*65 bytes/i,
        );
      });

      it("should reject signature with only r + s (no v)", () => {
        const noVSig = "a".repeat(128); // 64 bytes (r=32, s=32, no v)
        expect(() => formatEthSignature(noVSig)).toThrow(/ethereum signature.*65 bytes/i);
      });

      it("should provide clear error message for wrong length", () => {
        const wrongLengthSig = "abcd1234"; // Way too short
        expect(() => formatEthSignature(wrongLengthSig)).toThrow(
          /ethereum signature.*65 bytes/i,
        );
      });
    });

    describe("Multiple 0x Prefix Handling", () => {
      it("should normalize single 0x prefix", () => {
        // BUG: normalizeHexPrefix uses /^0x+/i which only matches ONE "0x" prefix
        // Multiple "0x0x" prefixes are NOT normalized (regex doesn't match repeated "0x")
        const singlePrefix = `0x${validEthSig}`;
        const result = formatEthSignature(singlePrefix);
        expect(result).toBe(`0x${validEthSig}`);
      });

      it("should normalize multiple 0x prefixes (BUG FIX)", () => {
        // BUG FIX: Now uses while loop to remove all "0x" prefixes
        const multiPrefix = `0x0x${validEthSig}`;
        const result = formatEthSignature(multiPrefix);
        expect(result).toBe(`0x${validEthSig}`);
      });

      it("should handle 0X (uppercase) prefix", () => {
        const upperPrefix = `0X${validEthSig}`;
        const result = formatEthSignature(upperPrefix);
        expect(result).toBe(`0x${validEthSig}`);
      });

      it("should reject 0xxx prefix (invalid hex)", () => {
        // BUG FIX: Now validates hex, so extra 'x' throws error
        const multiX = `0xxx${validEthSig}`;
        expect(() => formatEthSignature(multiX)).toThrow(/Invalid.*hex characters/i);
      });
    });

    describe("Invalid Input Handling", () => {
      it("should throw error for empty signature", () => {
        expect(() => formatEthSignature("")).toThrow(/Signature cannot be empty/i);
      });

      it("should reject signature with invalid hex characters (BUG FIX)", () => {
        // BUG FIX: Now validates hex characters before Buffer.from()
        const invalidSig = "g".repeat(130); // 'g' is not valid hex
        expect(() => formatEthSignature(invalidSig)).toThrow(/Invalid.*hex characters/i);
      });

      it("should reject signature with special characters (BUG FIX)", () => {
        // BUG FIX: Now validates hex, so '-' throws error
        const specialCharSig = "abcd-efgh-".repeat(13);
        expect(() => formatEthSignature(specialCharSig)).toThrow(/Invalid.*hex characters/i);
      });

      it("should reject signature with whitespace (BUG FIX)", () => {
        // BUG FIX: Now validates hex, so spaces throw error
        const withSpaces = `ab cd ${"ef".repeat(64)}`;
        expect(() => formatEthSignature(withSpaces)).toThrow(/Invalid.*hex characters/i);
      });

      it("should reject base64 signature (invalid hex)", () => {
        // BUG FIX: Now validates hex, so base64 special chars throw error
        const base64Sig = "SGVsbG8gV29ybGQhIFRoaXMgaXMgYSB0ZXN0IHNpZ25hdHVyZQ==";
        expect(() => formatEthSignature(base64Sig)).toThrow(/Invalid.*hex characters/i);
      });
    });

    describe("Edge Cases", () => {
      it("should handle signature with all zeros", () => {
        const zeroSig = "0".repeat(130);
        const result = formatEthSignature(zeroSig);
        expect(result).toBe(`0x${zeroSig}`);
      });

      it("should handle signature with all f's", () => {
        const maxSig = "f".repeat(130);
        const result = formatEthSignature(maxSig);
        expect(result).toBe(`0x${maxSig}`);
      });

      it("should handle odd-length hex string (invalid)", () => {
        const oddLengthSig = "a".repeat(129); // Odd number
        expect(() => formatEthSignature(oddLengthSig)).toThrow();
      });
    });
  });

  describe("🔴 CRITICAL: formatSecp256k1Signature()", () => {
    // Valid secp256k1 signature (64 bytes = 128 hex chars, no recovery byte)
    const validSecp256k1Hex =
      "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" +
      "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

    // Base64 encoding of 64 random bytes (valid secp256k1 signature)
    const validSecp256k1Base64 =
      "EjRWeJCrze8SNFZ4kKvN7xI0VniQq83vEjRWeJCrze8SNFZ4kKvN7xI0VniQq83vEjRWeJCrze8SNFZ4kKvN7w==";

    describe("Hex Format Handling", () => {
      it("should accept hex signature without 0x prefix", () => {
        const result = formatSecp256k1Signature(validSecp256k1Hex);
        expect(result).toBe(validSecp256k1Hex);
        expect(result).toHaveLength(128);
      });

      it("should remove 0x prefix from hex signature", () => {
        const withPrefix = `0x${validSecp256k1Hex}`;
        const result = formatSecp256k1Signature(withPrefix);
        expect(result).toBe(validSecp256k1Hex);
        expect(result).not.toMatch(/^0x/);
      });

      it("should be idempotent for hex signatures", () => {
        const firstCall = formatSecp256k1Signature(validSecp256k1Hex);
        const secondCall = formatSecp256k1Signature(firstCall);
        const thirdCall = formatSecp256k1Signature(secondCall);

        expect(firstCall).toBe(secondCall);
        expect(secondCall).toBe(thirdCall);
      });

      it("should detect hex by length (128 chars)", () => {
        const hexSig = "a".repeat(128);
        const result = formatSecp256k1Signature(hexSig);
        expect(result).toBe(hexSig);
        expect(result).toHaveLength(128);
      });

      it("should detect hex by length (130 chars with 0x)", () => {
        const hexSig = `0x${"a".repeat(128)}`;
        const result = formatSecp256k1Signature(hexSig);
        expect(result).toBe("a".repeat(128));
        expect(result).toHaveLength(128);
      });
    });

    describe("Base64 Format Handling", () => {
      it("should convert base64 signature to hex", () => {
        const result = formatSecp256k1Signature(validSecp256k1Base64);
        expect(result).toMatch(/^[0-9a-f]+$/i);
        expect(result).not.toMatch(/^0x/);
        expect(result.length).toBeGreaterThan(0);
      });

      it("should detect base64 by length (not 128 or 130)", () => {
        const base64Sig = "SGVsbG8gV29ybGQ="; // Short base64 string
        const result = formatSecp256k1Signature(base64Sig);
        // Should convert base64 to hex
        expect(result).toMatch(/^[0-9a-f]+$/);
      });

      it("should handle base64 with padding", () => {
        const paddedBase64 = "YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY3ODkw";
        const result = formatSecp256k1Signature(paddedBase64);
        expect(result).toMatch(/^[0-9a-f]+$/);
      });

      it("should handle base64 without padding", () => {
        const noPaddingBase64 = "YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY3ODkw";
        const result = formatSecp256k1Signature(noPaddingBase64);
        expect(result).toMatch(/^[0-9a-f]+$/);
      });
    });

    describe("Object/Buffer Format Handling", () => {
      it("should handle Uint8Array signature", () => {
        const buffer = new Uint8Array(64).fill(0xab);
        const result = formatSecp256k1Signature(buffer);
        expect(result).toMatch(/^[0-9a-f]+$/);
        expect(result).not.toMatch(/^0x/);
      });

      it("should handle Buffer signature", () => {
        const buffer = Buffer.from("test signature data");
        const result = formatSecp256k1Signature(buffer);
        expect(result).toMatch(/^[0-9a-f]+$/);
        expect(result).not.toMatch(/^0x/);
      });

      it("should handle object with buffer-like properties", () => {
        const bufferLike = {
          0: 0x12,
          1: 0x34,
          2: 0x56,
          length: 3,
        };
        const result = formatSecp256k1Signature(bufferLike);
        expect(result).toMatch(/^[0-9a-f]+$/);
      });
    });

    describe("Invalid Input Handling", () => {
      it("should throw error for empty signature", () => {
        expect(() => formatSecp256k1Signature("")).toThrow(
          /Signature cannot be empty/i,
        );
      });

      it("should throw error for null signature", () => {
        expect(() => formatSecp256k1Signature(null as any)).toThrow(
          /Signature cannot be empty/i,
        );
      });

      it("should throw error for undefined signature", () => {
        expect(() => formatSecp256k1Signature(undefined as any)).toThrow(
          /Signature cannot be empty/i,
        );
      });
    });

    describe("Edge Cases", () => {
      it("should handle signature with all zeros", () => {
        const zeroSig = "0".repeat(128);
        const result = formatSecp256k1Signature(zeroSig);
        expect(result).toBe(zeroSig);
      });

      it("should handle uppercase hex signature", () => {
        const upperSig = validSecp256k1Hex.toUpperCase();
        const result = formatSecp256k1Signature(upperSig);
        expect(result).toBe(upperSig);
      });

      it("should handle mixed case hex signature", () => {
        const mixedSig = "AaBbCcDd" + "0".repeat(120);
        const result = formatSecp256k1Signature(mixedSig);
        expect(result).toBe(mixedSig);
      });

      it("should handle short base64 signatures", () => {
        const shortBase64 = "YWJjZA=="; // "abcd" in base64
        const result = formatSecp256k1Signature(shortBase64);
        expect(result).toMatch(/^[0-9a-f]+$/);
      });
    });
  });

  describe("🔴 CRITICAL: formatSecp256k1Pubkey()", () => {
    // Compressed secp256k1 pubkey (33 bytes = 66 hex chars)
    const validCompressedPubkeyHex =
      "02" + "1234567890abcdef".repeat(4); // 33 bytes

    // Uncompressed secp256k1 pubkey (65 bytes = 130 hex chars)
    const validUncompressedPubkeyHex =
      "04" + "1234567890abcdef".repeat(8); // 65 bytes

    // Base64 encoding of 33 bytes (compressed pubkey) = 44 chars
    const validCompressedPubkeyBase64 = "AhI0VniQq83vEjRWeJCrze8SNFZ4kKvN7xI0VniQq83v";

    // Base64 encoding of 65 bytes (uncompressed pubkey) = 88 chars
    const validUncompressedPubkeyBase64 =
      "BBI0VniQq83vEjRWeJCrze8SNFZ4kKvN7xI0VniQq83vEjRWeJCrze8SNFZ4kKvN7xI0VniQq83vEjRWeJCrze8=";

    describe("Hex Format Handling", () => {
      it("should accept hex pubkey without 0x prefix", () => {
        const result = formatSecp256k1Pubkey(validCompressedPubkeyHex);
        expect(result).toBe(validCompressedPubkeyHex);
        expect(result).not.toMatch(/^0x/);
      });

      it("should remove 0x prefix from hex pubkey", () => {
        const withPrefix = `0x${validCompressedPubkeyHex}`;
        const result = formatSecp256k1Pubkey(withPrefix);
        expect(result).toBe(validCompressedPubkeyHex);
        expect(result).not.toMatch(/^0x/);
      });

      it("should be idempotent for hex pubkeys", () => {
        const firstCall = formatSecp256k1Pubkey(validCompressedPubkeyHex);
        const secondCall = formatSecp256k1Pubkey(firstCall);
        const thirdCall = formatSecp256k1Pubkey(secondCall);

        expect(firstCall).toBe(secondCall);
        expect(secondCall).toBe(thirdCall);
      });

      it("should handle compressed pubkey (33 bytes = 66 hex chars)", () => {
        const result = formatSecp256k1Pubkey(validCompressedPubkeyHex);
        expect(result).toHaveLength(66);
        expect(result).toMatch(/^02|03/); // Compressed pubkeys start with 02 or 03
      });

      it("should correctly handle 130-char hex (BUG FIX)", () => {
        // BUG FIX: Now checks exact length 130 FIRST, treats as hex not base64
        const result = formatSecp256k1Pubkey(validUncompressedPubkeyHex);
        expect(result).toBe(validUncompressedPubkeyHex);
        expect(result.length).toBe(130);
      });

      it("should handle pubkey with 0x prefix", () => {
        const withPrefix = `0x${validCompressedPubkeyHex}`;
        const result = formatSecp256k1Pubkey(withPrefix);
        expect(result).toBe(validCompressedPubkeyHex);
      });
    });

    describe("Base64 Format Handling", () => {
      it("should convert base64 compressed pubkey (44 chars) to hex", () => {
        const result = formatSecp256k1Pubkey(validCompressedPubkeyBase64);
        expect(result).toMatch(/^[0-9a-f]+$/i);
        expect(result).not.toMatch(/^0x/);
        expect(result.length).toBeGreaterThan(0);
      });

      it("should convert base64 uncompressed pubkey (88 chars) to hex", () => {
        const result = formatSecp256k1Pubkey(validUncompressedPubkeyBase64);
        expect(result).toMatch(/^[0-9a-f]+$/i);
        expect(result).not.toMatch(/^0x/);
        expect(result.length).toBeGreaterThan(0);
      });

      it("should detect base64 by length (44 chars for compressed)", () => {
        // Base64 detection relies on length = 44 or 88
        expect(() => formatSecp256k1Pubkey(validCompressedPubkeyBase64)).not.toThrow();
      });

      it("should detect base64 by length (88 chars for uncompressed)", () => {
        expect(() =>
          formatSecp256k1Pubkey(validUncompressedPubkeyBase64),
        ).not.toThrow();
      });

      it("should detect base64 by non-hex characters (BUG FIX)", () => {
        // BUG FIX: Now checks for non-hex chars (+, /, =) and treats as base64
        const base64WithSpecialChars = "AB+/CD+/EF+/GH+/IJ+/KL+/MN+/OP+/QR+/ST+/UV+/WX==";
        const result = formatSecp256k1Pubkey(base64WithSpecialChars);
        // Should be converted from base64 to hex
        expect(result).not.toBe(base64WithSpecialChars);
        expect(result).toMatch(/^[0-9a-f]+$/);
      });

      it("should treat long hex strings (not 66 or 130) as is", () => {
        // BUG FIX: Now only checks for exact lengths 66 or 130 for hex
        // Other lengths that are all hex chars are returned as-is (not converted)
        const longHex = "a".repeat(120); // Length 120, all valid hex
        const result = formatSecp256k1Pubkey(longHex);
        expect(result).toBe(longHex); // Returned as-is (no base64 conversion)
      });
    });

    describe("Invalid Input Handling", () => {
      it("should throw error for empty pubkey", () => {
        expect(() => formatSecp256k1Pubkey("")).toThrow(/Pubkey cannot be empty/i);
      });

      it("should throw error for null pubkey", () => {
        expect(() => formatSecp256k1Pubkey(null as any)).toThrow(
          /Pubkey cannot be empty/i,
        );
      });

      it("should throw error for undefined pubkey", () => {
        expect(() => formatSecp256k1Pubkey(undefined as any)).toThrow(
          /Pubkey cannot be empty/i,
        );
      });
    });

    describe("Edge Cases", () => {
      it("should handle uppercase hex pubkey", () => {
        const upperPubkey = validCompressedPubkeyHex.toUpperCase();
        const result = formatSecp256k1Pubkey(upperPubkey);
        expect(result).toBe(upperPubkey);
      });

      it("should handle mixed case hex pubkey", () => {
        const mixedPubkey = "02AaBbCcDd" + "0".repeat(56);
        const result = formatSecp256k1Pubkey(mixedPubkey);
        expect(result).toBe(mixedPubkey);
      });

      it("should treat very long hex strings as is", () => {
        // BUG FIX: Long strings of all hex chars (not 66 or 130) returned as-is
        const longHex = "a".repeat(150); // All valid hex chars
        const result = formatSecp256k1Pubkey(longHex);
        expect(result).toBe(longHex);
      });

      it("should reject base64 with URL-safe characters", () => {
        // URL-safe base64 (with - and _) is not supported
        const urlSafeBase64 = "AB-_CD-_EF-_GH-_IJ-_KL-_MN-_OP-_QR-_ST-_UV-_WX==";
        expect(() => formatSecp256k1Pubkey(urlSafeBase64)).toThrow(/invalid/i);
      });
    });

    describe("Format Detection Logic", () => {
      it("should prefer hex interpretation for 66-char strings", () => {
        // 66 chars = 33 bytes hex (compressed pubkey)
        const hexLike = "02" + "a".repeat(64);
        const result = formatSecp256k1Pubkey(hexLike);
        expect(result).toBe(hexLike);
      });

      it("should correctly handle 130-char hex strings (BUG FIX)", () => {
        // BUG FIX: Now checks exact length 130 for hex FIRST
        const hexLike = "04" + "a".repeat(128);
        const result = formatSecp256k1Pubkey(hexLike);
        // Correctly returned as hex (not base64 converted)
        expect(result).toBe(hexLike);
      });

      it("should convert 44-char base64 to hex", () => {
        // 44 chars = compressed pubkey in base64
        const result = formatSecp256k1Pubkey(validCompressedPubkeyBase64);
        expect(result).toMatch(/^[0-9a-f]+$/);
        // Base64 is more compact than hex, so hex output is longer
        expect(result.length).toBeGreaterThan(validCompressedPubkeyBase64.length);
      });

      it("should convert 88-char base64 to hex", () => {
        // 88 chars = uncompressed pubkey in base64
        const result = formatSecp256k1Pubkey(validUncompressedPubkeyBase64);
        expect(result).toMatch(/^[0-9a-f]+$/);
      });
    });
  });

  describe("🔴 CRITICAL: formatHexMessage()", () => {
    const validHexMessage = "48656c6c6f20576f726c64"; // "Hello World" in hex

    describe("Basic Functionality", () => {
      it("should add 0x prefix to message without prefix", () => {
        const result = formatHexMessage(validHexMessage);
        expect(result).toBe(`0x${validHexMessage}`);
        expect(result).toMatch(/^0x/);
      });

      it("should preserve 0x prefix when already present", () => {
        const withPrefix = `0x${validHexMessage}`;
        const result = formatHexMessage(withPrefix);
        expect(result).toBe(withPrefix);
      });

      it("should be idempotent (calling multiple times returns same result)", () => {
        const firstCall = formatHexMessage(validHexMessage);
        const secondCall = formatHexMessage(firstCall);
        const thirdCall = formatHexMessage(secondCall);

        expect(firstCall).toBe(secondCall);
        expect(secondCall).toBe(thirdCall);
      });

      it("should handle uppercase hex message", () => {
        const upperMsg = validHexMessage.toUpperCase();
        const result = formatHexMessage(upperMsg);
        expect(result).toBe(`0x${upperMsg}`);
      });

      it("should handle mixed case hex message", () => {
        const mixedMsg = "AaBbCcDd1122";
        const result = formatHexMessage(mixedMsg);
        expect(result).toBe(`0x${mixedMsg}`);
      });
    });

    describe("Multiple 0x Prefix Handling", () => {
      it("should normalize multiple 0x prefixes (BUG FIX)", () => {
        // BUG FIX: Now uses while loop to remove all "0x" prefixes
        const multiPrefix = `0x0x${validHexMessage}`;
        const result = formatHexMessage(multiPrefix);
        expect(result).toBe(`0x${validHexMessage}`);
      });

      it("should normalize many 0x prefixes (BUG FIX)", () => {
        // BUG FIX: Now removes all "0x" prefixes
        const manyPrefixes = `0x0x0x0x${validHexMessage}`;
        const result = formatHexMessage(manyPrefixes);
        expect(result).toBe(`0x${validHexMessage}`);
      });

      it("should handle 0X (uppercase) prefix", () => {
        const upperPrefix = `0X${validHexMessage}`;
        const result = formatHexMessage(upperPrefix);
        expect(result).toBe(`0x${validHexMessage}`);
      });

      it("should normalize mixed case prefixes (BUG FIX)", () => {
        // BUG FIX: Now removes all "0x" prefixes (case-insensitive)
        const mixedPrefix = `0X0x0X${validHexMessage}`;
        const result = formatHexMessage(mixedPrefix);
        expect(result).toBe(`0x${validHexMessage}`);
      });

      it("should reject 0xxx prefix (invalid hex)", () => {
        // BUG FIX: Now validates hex, so extra 'x' throws error
        const multiX = `0xxx${validHexMessage}`;
        expect(() => formatHexMessage(multiX)).toThrow(/Invalid.*hex characters/i);
      });
    });

    describe("Invalid Input Handling", () => {
      it("should throw error for empty message", () => {
        expect(() => formatHexMessage("")).toThrow(/Message cannot be empty/i);
      });

      it("should reject message with invalid hex characters (BUG FIX)", () => {
        // BUG FIX: Now validates hex characters
        const invalidMsg = "xyz123"; // 'x', 'y', 'z' are not valid hex
        expect(() => formatHexMessage(invalidMsg)).toThrow(/Invalid.*hex characters/i);
      });

      it("should reject message with special characters (BUG FIX)", () => {
        // BUG FIX: Now validates hex, so '-' throws error
        const specialCharMsg = "abc-def-123";
        expect(() => formatHexMessage(specialCharMsg)).toThrow(/Invalid.*hex characters/i);
      });

      it("should reject message with whitespace (BUG FIX)", () => {
        // BUG FIX: Now validates hex, so spaces throw error
        const withSpaces = "ab cd ef";
        expect(() => formatHexMessage(withSpaces)).toThrow(/Invalid.*hex characters/i);
      });

      it("should silently accept base64 message (CRITICAL BUG)", () => {
        // CRITICAL BUG: Base64 chars that happen to be valid hex pass through
        const base64Msg = "abcdef123456"; // Looks like base64 but is valid hex
        const result = formatHexMessage(base64Msg);
        expect(result).toMatch(/^0x/);
      });

      it("should silently accept UTF-8 text that looks like hex (CRITICAL BUG)", () => {
        // CRITICAL BUG: Text containing only a-f and 0-9 is treated as hex
        const textMsg = "deadbeef"; // Looks like hex
        const result = formatHexMessage(textMsg);
        expect(result).toBe("0xdeadbeef");
        // This might be intended as text, not hex
      });
    });

    describe("Edge Cases", () => {
      it("should handle very short hex message", () => {
        const shortMsg = "ab";
        const result = formatHexMessage(shortMsg);
        expect(result).toBe("0xab");
      });

      it("should handle very long hex message", () => {
        const longMsg = "a".repeat(1000);
        const result = formatHexMessage(longMsg);
        expect(result).toBe(`0x${longMsg}`);
      });

      it("should handle message with all zeros", () => {
        const zeroMsg = "0".repeat(64);
        const result = formatHexMessage(zeroMsg);
        expect(result).toBe(`0x${zeroMsg}`);
      });

      it("should handle message with all f's", () => {
        const maxMsg = "f".repeat(64);
        const result = formatHexMessage(maxMsg);
        expect(result).toBe(`0x${maxMsg}`);
      });

      it("should reject odd-length hex string (BUG FIX)", () => {
        // BUG FIX: Now validates even length (hex must be full bytes)
        const oddMsg = "abc";
        expect(() => formatHexMessage(oddMsg)).toThrow(/hex string must have even length/i);
      });
    });

    describe("EIP-191/EIP-712 Compatibility", () => {
      it("should format message for EIP-191 signing", () => {
        const eip191Prefix = "19"; // EIP-191 version byte
        const domainSeparator = "01"; // Domain separator
        const message = "deadbeef";
        const fullMessage = eip191Prefix + domainSeparator + message;

        const result = formatHexMessage(fullMessage);
        expect(result).toBe(`0x${fullMessage}`);
      });

      it("should format message for EIP-712 signing", () => {
        const eip712Prefix = "1901"; // EIP-712 prefix
        const domainSeparatorHash = "a".repeat(64);
        const messageHash = "b".repeat(64);
        const fullMessage = eip712Prefix + domainSeparatorHash + messageHash;

        const result = formatHexMessage(fullMessage);
        expect(result).toBe(`0x${fullMessage}`);
      });
    });
  });

  describe("🔴 CRITICAL: utf8ToHex()", () => {
    describe("Basic UTF-8 Conversion", () => {
      it("should convert simple ASCII text to hex", () => {
        const result = utf8ToHex("Hello");
        expect(result).toBe("48656c6c6f"); // "Hello" in hex
        expect(result).not.toMatch(/^0x/);
      });

      it("should convert text with spaces to hex", () => {
        const result = utf8ToHex("Hello World");
        expect(result).toBe("48656c6c6f20576f726c64");
      });

      it("should convert numbers as text to hex", () => {
        const result = utf8ToHex("12345");
        expect(result).toBe("3132333435");
      });

      it("should convert special characters to hex", () => {
        const result = utf8ToHex("!@#$%");
        expect(result).toMatch(/^[0-9a-f]+$/);
      });

      it("should convert punctuation to hex", () => {
        const result = utf8ToHex("Hello, World!");
        expect(result).toMatch(/^[0-9a-f]+$/);
        expect(result.length).toBeGreaterThan(0);
      });
    });

    describe("Unicode and Multi-byte Characters", () => {
      it("should convert emoji to hex", () => {
        const result = utf8ToHex("😀");
        expect(result).toMatch(/^[0-9a-f]+$/);
        expect(result.length).toBeGreaterThan(2); // Emoji is multi-byte
      });

      it("should convert Chinese characters to hex", () => {
        const result = utf8ToHex("你好");
        expect(result).toMatch(/^[0-9a-f]+$/);
        expect(result.length).toBeGreaterThan(4); // Multi-byte characters
      });

      it("should convert accented characters to hex", () => {
        const result = utf8ToHex("café");
        expect(result).toMatch(/^[0-9a-f]+$/);
      });

      it("should convert Arabic text to hex", () => {
        const result = utf8ToHex("مرحبا");
        expect(result).toMatch(/^[0-9a-f]+$/);
      });

      it("should convert Japanese text to hex", () => {
        const result = utf8ToHex("こんにちは");
        expect(result).toMatch(/^[0-9a-f]+$/);
      });
    });

    describe("Invalid Input Handling", () => {
      it("should throw error for empty text", () => {
        expect(() => utf8ToHex("")).toThrow(/Text cannot be empty/i);
      });

      it("should throw error for text starting with 0x", () => {
        expect(() => utf8ToHex("0xabcdef")).toThrow(
          /Invalid input.*appears to be hex.*starts with "0x"/i,
        );
      });

      it("should throw error for text starting with 0X (uppercase)", () => {
        expect(() => utf8ToHex("0Xabcdef")).toThrow(
          /Invalid input.*appears to be hex.*starts with "0x"/i,
        );
      });

      it("should warn for text that looks like hex (console.warn)", () => {
        const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

        // Text that contains only hex characters (likely hex, not UTF-8)
        const hexLikeText = "abcdef123456";
        const result = utf8ToHex(hexLikeText);

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining("Input appears to be hex"),
        );
        expect(result).toMatch(/^[0-9a-f]+$/);

        consoleSpy.mockRestore();
      });

      it("should not warn for short hex-like strings (≤2 chars)", () => {
        const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

        // Short strings with only hex chars should not trigger warning
        const shortText = "ab";
        utf8ToHex(shortText);

        expect(consoleSpy).not.toHaveBeenCalled();

        consoleSpy.mockRestore();
      });

      it("should not warn for text with mixed characters", () => {
        const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

        // Text with non-hex characters should not trigger warning
        const mixedText = "hello world";
        utf8ToHex(mixedText);

        expect(consoleSpy).not.toHaveBeenCalled();

        consoleSpy.mockRestore();
      });
    });

    describe("Edge Cases", () => {
      it("should convert single character to hex", () => {
        const result = utf8ToHex("A");
        expect(result).toBe("41");
      });

      it("should convert newline character to hex", () => {
        const result = utf8ToHex("\n");
        expect(result).toBe("0a");
      });

      it("should convert tab character to hex", () => {
        const result = utf8ToHex("\t");
        expect(result).toBe("09");
      });

      it("should convert null byte in text to hex", () => {
        const result = utf8ToHex("A\x00B");
        expect(result).toBe("410042");
      });

      it("should convert very long text to hex", () => {
        const longText = "A".repeat(1000);
        const result = utf8ToHex(longText);
        expect(result).toMatch(/^[0-9a-f]+$/);
        expect(result.length).toBe(2000); // Each 'A' = 2 hex chars
      });

      it("should convert text with line breaks to hex", () => {
        const multilineText = "Line1\nLine2\nLine3";
        const result = utf8ToHex(multilineText);
        expect(result).toMatch(/^[0-9a-f]+$/);
      });
    });

    describe("Return Format Validation", () => {
      it("should return hex without 0x prefix", () => {
        const result = utf8ToHex("test");
        expect(result).not.toMatch(/^0x/);
        expect(result).toMatch(/^[0-9a-f]+$/);
      });

      it("should return lowercase hex", () => {
        const result = utf8ToHex("ABC");
        expect(result).toBe(result.toLowerCase());
      });

      it("should return even-length hex string", () => {
        const result = utf8ToHex("test");
        expect(result.length % 2).toBe(0); // Even length
      });
    });

    describe("Integration with formatHexMessage", () => {
      it("should produce hex compatible with formatHexMessage", () => {
        const text = "Hello World";
        const hex = utf8ToHex(text);
        const formatted = formatHexMessage(hex);

        expect(formatted).toBe(`0x${hex}`);
        expect(formatted).toMatch(/^0x[0-9a-f]+$/);
      });

      it("should create valid signing message flow", () => {
        // Typical flow: UTF-8 text -> hex -> format for signing
        const originalText = "Sign this message";
        const hexMessage = utf8ToHex(originalText);
        const formattedForSigning = formatHexMessage(hexMessage);

        expect(formattedForSigning).toMatch(/^0x[0-9a-f]+$/);
        expect(hexMessage).not.toMatch(/^0x/);
      });
    });
  });

  describe("🟡 HIGH: Cross-Function Integration", () => {
    it("should maintain consistency between Ethereum and Secp256k1 formats", () => {
      const ethSig =
        "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" +
        "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" +
        "01";

      const ethFormatted = formatEthSignature(ethSig);
      expect(ethFormatted).toMatch(/^0x/);

      const secp256k1Sig =
        "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" +
        "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

      const secp256k1Formatted = formatSecp256k1Signature(secp256k1Sig);
      expect(secp256k1Formatted).not.toMatch(/^0x/);
    });

    it("should handle message signing workflow (UTF-8 -> hex -> format)", () => {
      const message = "Hello, Blockchain!";
      const hexMessage = utf8ToHex(message);
      const formattedMessage = formatHexMessage(hexMessage);

      expect(hexMessage).not.toMatch(/^0x/);
      expect(formattedMessage).toMatch(/^0x/);
      expect(formattedMessage).toBe(`0x${hexMessage}`);
    });

    it("should maintain idempotency across all formatting functions", () => {
      const ethSig = "a".repeat(130);
      const secp256k1Sig = "b".repeat(128);
      const pubkey = "02" + "c".repeat(64);
      const message = "d".repeat(40);

      // Call each function 3 times
      const eth1 = formatEthSignature(ethSig);
      const eth2 = formatEthSignature(eth1);
      const eth3 = formatEthSignature(eth2);
      expect(eth1).toBe(eth2);
      expect(eth2).toBe(eth3);

      const secp1 = formatSecp256k1Signature(secp256k1Sig);
      const secp2 = formatSecp256k1Signature(secp1);
      const secp3 = formatSecp256k1Signature(secp2);
      expect(secp1).toBe(secp2);
      expect(secp2).toBe(secp3);

      const pubkey1 = formatSecp256k1Pubkey(pubkey);
      const pubkey2 = formatSecp256k1Pubkey(pubkey1);
      const pubkey3 = formatSecp256k1Pubkey(pubkey2);
      expect(pubkey1).toBe(pubkey2);
      expect(pubkey2).toBe(pubkey3);

      const msg1 = formatHexMessage(message);
      const msg2 = formatHexMessage(msg1);
      const msg3 = formatHexMessage(msg2);
      expect(msg1).toBe(msg2);
      expect(msg2).toBe(msg3);
    });
  });

  describe("🟢 MEDIUM: Error Message Quality", () => {
    it("should provide helpful error for wrong signature length", () => {
      const wrongLengthSig = "abc123";
      expect(() => formatEthSignature(wrongLengthSig)).toThrow(
        /ethereum signature.*65 bytes/i,
      );
    });

    it("should provide error for invalid hex characters (BUG FIX)", () => {
      // BUG FIX: Now validates hex and provides helpful error
      const invalidHex = "g".repeat(130);
      expect(() => formatEthSignature(invalidHex)).toThrow(/Invalid.*hex characters/i);
    });

    it("should provide helpful error for 0x-prefixed UTF-8 input", () => {
      expect(() => utf8ToHex("0xtest")).toThrow(
        /appears to be hex.*starts with "0x".*use formatHexMessage/i,
      );
    });

    it("should provide error for invalid characters first (BUG FIX)", () => {
      // BUG FIX: Now checks hex validity before length
      const veryLongInvalidSig = "x".repeat(200);
      expect(() => formatEthSignature(veryLongInvalidSig)).toThrow(/Invalid.*hex characters/i);
    });
  });

  describe("🔒 Security: Input Validation", () => {
    describe("Injection Attack Prevention", () => {
      it("should reject signatures with script injection attempts", () => {
        const maliciousSig = "<script>alert('xss')</script>";
        expect(() => formatEthSignature(maliciousSig)).toThrow();
      });

      it("should reject signatures with SQL injection patterns", () => {
        const sqlInjection = "'; DROP TABLE users; --";
        expect(() => formatEthSignature(sqlInjection)).toThrow();
      });

      it("should reject signatures with null bytes", () => {
        const withNullByte = "abcdef\x00123456";
        expect(() => formatEthSignature(withNullByte)).toThrow();
      });
    });

    describe("Format Confusion Attacks", () => {
      it("should reject base64 signature for Ethereum format", () => {
        const base64Sig = "SGVsbG8gV29ybGQh";
        expect(() => formatEthSignature(base64Sig)).toThrow();
      });

      it("should not allow hex message to be passed to utf8ToHex", () => {
        const hexMessage = "0x48656c6c6f";
        expect(() => utf8ToHex(hexMessage)).toThrow(/appears to be hex/i);
      });

      it("should detect likely hex strings in utf8ToHex", () => {
        const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

        const hexLike = "abcdef123456";
        utf8ToHex(hexLike);

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining("appears to be hex"),
        );

        consoleSpy.mockRestore();
      });
    });

    describe("Buffer Overflow Prevention", () => {
      it("should handle extremely long inputs safely", () => {
        const veryLongHex = "a".repeat(100000);
        expect(() => formatHexMessage(veryLongHex)).not.toThrow();
      });

      it("should handle extremely long UTF-8 text safely", () => {
        const veryLongText = "A".repeat(50000);
        const result = utf8ToHex(veryLongText);
        expect(result.length).toBe(100000);
      });
    });

    describe("Type Confusion Prevention", () => {
      it("should reject number input for signature", () => {
        expect(() => formatEthSignature(12345 as any)).toThrow();
      });

      it("should reject boolean input for signature", () => {
        expect(() => formatEthSignature(true as any)).toThrow();
      });

      it("should reject array input for signature (unless formatSecp256k1Signature)", () => {
        expect(() => formatEthSignature([1, 2, 3] as any)).toThrow();
      });

      it("should reject object input for formatHexMessage", () => {
        expect(() => formatHexMessage({ message: "test" } as any)).toThrow();
      });
    });
  });

  describe("🔒 Security: Signature Validation", () => {
    it("should validate Ethereum signature length matches r+s+v", () => {
      const validSig = "a".repeat(130); // 65 bytes
      expect(() => formatEthSignature(validSig)).not.toThrow();

      const invalidSig = "a".repeat(64); // Only r
      expect(() => formatEthSignature(invalidSig)).toThrow(/ethereum signature.*65 bytes/i);
    });

    it("should prevent signature truncation attacks", () => {
      const truncatedSig = "a".repeat(128); // Missing v byte
      expect(() => formatEthSignature(truncatedSig)).toThrow();
    });

    it("should prevent signature extension attacks", () => {
      const extendedSig = "a".repeat(132); // Extra bytes
      expect(() => formatEthSignature(extendedSig)).toThrow();
    });
  });

  describe("🔴 CRITICAL: formatEthSignatureToBase64()", () => {
    const validEthSig =
      "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" +
      "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" +
      "01"; // r(32) + s(32) + v(1) = 65 bytes

    describe("Basic Functionality", () => {
      it("should convert hex signature to base64", () => {
        const result = formatEthSignatureToBase64(validEthSig);
        expect(result).toMatch(/^[A-Za-z0-9+/]+=*$/); // Base64 format
        expect(result).not.toMatch(/^0x/);
      });

      it("should handle signature with 0x prefix", () => {
        const withPrefix = `0x${validEthSig}`;
        const result = formatEthSignatureToBase64(withPrefix);
        expect(result).toMatch(/^[A-Za-z0-9+/]+=*$/);
      });

      it("should produce consistent base64 output", () => {
        const result1 = formatEthSignatureToBase64(validEthSig);
        const result2 = formatEthSignatureToBase64(validEthSig);
        expect(result1).toBe(result2);
      });

      it("should convert 65-byte signature correctly", () => {
        const result = formatEthSignatureToBase64(validEthSig);
        // Base64 of 65 bytes = 88 chars (64 * 4/3 = 85.33, rounded up with padding)
        expect(result.length).toBeGreaterThan(85);
      });
    });

    describe("Signature Length Validation", () => {
      it("should accept exactly 65 bytes (130 hex chars)", () => {
        expect(() => formatEthSignatureToBase64(validEthSig)).not.toThrow();
      });

      it("should reject signature with 64 bytes", () => {
        const shortSig = "a".repeat(128);
        expect(() => formatEthSignatureToBase64(shortSig)).toThrow(
          /must be 65 bytes, got 64/i
        );
      });

      it("should reject signature with 66 bytes", () => {
        const longSig = "a".repeat(132);
        expect(() => formatEthSignatureToBase64(longSig)).toThrow(
          /must be 65 bytes, got 66/i
        );
      });
    });

    describe("Invalid Input Handling", () => {
      it("should throw error for empty signature", () => {
        expect(() => formatEthSignatureToBase64("")).toThrow(
          /Signature cannot be empty/i
        );
      });

      it("should reject invalid hex characters", () => {
        const invalidSig = "g".repeat(130);
        expect(() => formatEthSignatureToBase64(invalidSig)).toThrow(
          /invalid.*ethereum signature/i
        );
      });

      it("should reject signature with special characters", () => {
        const specialCharSig = "abcd-efgh-".repeat(13);
        expect(() => formatEthSignatureToBase64(specialCharSig)).toThrow(
          /invalid.*ethereum signature/i
        );
      });
    });

    describe("Edge Cases", () => {
      it("should handle signature with all zeros", () => {
        const zeroSig = "0".repeat(130);
        const result = formatEthSignatureToBase64(zeroSig);
        expect(result).toMatch(/^[A-Za-z0-9+/]+=*$/);
      });

      it("should handle signature with all f's", () => {
        const maxSig = "f".repeat(130);
        const result = formatEthSignatureToBase64(maxSig);
        expect(result).toMatch(/^[A-Za-z0-9+/]+=*$/);
      });

      it("should handle uppercase hex signature", () => {
        const upperSig = validEthSig.toUpperCase();
        const result = formatEthSignatureToBase64(upperSig);
        expect(result).toMatch(/^[A-Za-z0-9+/]+=*$/);
      });
    });
  });

  describe("🔴 CRITICAL: formatSecp256k1SignatureToBase64()", () => {
    const validSecp256k1Hex =
      "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" +
      "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

    describe("Basic Functionality", () => {
      it("should convert hex signature to base64", () => {
        const result = formatSecp256k1SignatureToBase64(validSecp256k1Hex);
        expect(result).toMatch(/^[A-Za-z0-9+/]+=*$/);
        expect(result).not.toMatch(/^0x/);
      });

      it("should handle signature with 0x prefix", () => {
        const withPrefix = `0x${validSecp256k1Hex}`;
        const result = formatSecp256k1SignatureToBase64(withPrefix);
        expect(result).toMatch(/^[A-Za-z0-9+/]+=*$/);
      });

      it("should produce consistent base64 output", () => {
        const result1 = formatSecp256k1SignatureToBase64(validSecp256k1Hex);
        const result2 = formatSecp256k1SignatureToBase64(validSecp256k1Hex);
        expect(result1).toBe(result2);
      });

      it("should convert 64-byte signature correctly", () => {
        const result = formatSecp256k1SignatureToBase64(validSecp256k1Hex);
        // Base64 of 64 bytes = 88 chars with padding
        expect(result.length).toBeGreaterThan(80);
      });
    });

    describe("Signature Length Validation", () => {
      it("should accept exactly 64 bytes (128 hex chars)", () => {
        expect(() =>
          formatSecp256k1SignatureToBase64(validSecp256k1Hex)
        ).not.toThrow();
      });

      it("should reject signature with 63 bytes", () => {
        const shortSig = "a".repeat(126);
        expect(() => formatSecp256k1SignatureToBase64(shortSig)).toThrow(
          /must be 64 bytes, got 63/i
        );
      });

      it("should reject signature with 65 bytes", () => {
        const longSig = "a".repeat(130);
        expect(() => formatSecp256k1SignatureToBase64(longSig)).toThrow(
          /must be 64 bytes, got 65/i
        );
      });
    });

    describe("Invalid Input Handling", () => {
      it("should throw error for empty signature", () => {
        expect(() => formatSecp256k1SignatureToBase64("")).toThrow(
          /Signature cannot be empty/i
        );
      });

      it("should reject invalid hex characters", () => {
        const invalidSig = "g".repeat(128);
        expect(() => formatSecp256k1SignatureToBase64(invalidSig)).toThrow(
          /invalid.*secp256k1 signature/i
        );
      });

      it("should reject signature with special characters", () => {
        const specialCharSig = "abcd-efgh".repeat(16);
        expect(() => formatSecp256k1SignatureToBase64(specialCharSig)).toThrow(
          /invalid.*secp256k1 signature/i
        );
      });
    });

    describe("Edge Cases", () => {
      it("should handle signature with all zeros", () => {
        const zeroSig = "0".repeat(128);
        const result = formatSecp256k1SignatureToBase64(zeroSig);
        expect(result).toMatch(/^[A-Za-z0-9+/]+=*$/);
      });

      it("should handle signature with all f's", () => {
        const maxSig = "f".repeat(128);
        const result = formatSecp256k1SignatureToBase64(maxSig);
        expect(result).toMatch(/^[A-Za-z0-9+/]+=*$/);
      });

      it("should handle uppercase hex signature", () => {
        const upperSig = validSecp256k1Hex.toUpperCase();
        const result = formatSecp256k1SignatureToBase64(upperSig);
        expect(result).toMatch(/^[A-Za-z0-9+/]+=*$/);
      });
    });

    describe("Integration with AA API", () => {
      it("should produce same output as API parseSignature for Secp256k1", () => {
        const signatureHex = "abcdef1234567890".repeat(8); // 128 hex chars (without 0x)
        const result = formatSecp256k1SignatureToBase64(signatureHex);

        // Should be base64 encoded
        expect(result).toMatch(/^[A-Za-z0-9+/]+=*$/);

        // Should be able to decode back to original bytes
        const decoded = Buffer.from(result, "base64");
        const originalBytes = Buffer.from(signatureHex, "hex");
        expect(decoded.toString("hex")).toBe(originalBytes.toString("hex"));
      });
    });
  });
});
