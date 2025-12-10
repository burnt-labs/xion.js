/**
 * Normalization Regression Tests
 *
 * Ensures normalizeSecp256k1PublicKey always returns base64 format
 * to prevent salt calculation inconsistencies with AA-API.
 *
 * Bug: xion.js was converting pubkey to hex before sending to AA-API,
 * causing different salt calculations and signature verification failures.
 *
 * Fix: Always normalize to and maintain base64 format throughout the pipeline.
 */

import { describe, it, expect } from "vitest";
import { normalizeSecp256k1PublicKey } from "../normalize";

describe("normalizeSecp256k1PublicKey - Regression Tests", () => {
  describe("Base64 Format Consistency", () => {
    it("should return base64 when given base64 input", () => {
      const base64Pubkey = "Ainc9JdpcJrgWkxqraKNpU105QsjKYoWeKu0cm2j2e+v";
      const result = normalizeSecp256k1PublicKey(base64Pubkey);

      // REGRESSION TEST: Must return base64, not convert to hex
      expect(result).toBe(base64Pubkey);
      expect(result.length).toBe(44); // Base64 compressed key length
      expect(result[0]).toBe("A"); // Compressed keys start with 'A'
      expect(/^A[A-Za-z0-9+/]{43}$/.test(result)).toBe(true);
    });

    it("should convert hex to base64", () => {
      const hexPubkey = "0235ddf60543861890dd45f9488eda09b6f7a254b0bf1a98099a5fde105fa34f56";
      const expectedBase64 = "AjXd9gVDhhiQ3UX5SI7aCbb3olSwvxqYCZpf3hBfo09W";

      const result = normalizeSecp256k1PublicKey(hexPubkey);

      // CRITICAL: Must convert to base64
      expect(result).toBe(expectedBase64);
      expect(result.length).toBe(44);
      expect(/^A[A-Za-z0-9+/]{43}$/.test(result)).toBe(true);
    });

    it("should always output base64 regardless of input format", () => {
      const testCases = [
        {
          name: "compressed hex (02 prefix)",
          input: "0235ddf60543861890dd45f9488eda09b6f7a254b0bf1a98099a5fde105fa34f56",
          expectedBase64: "AjXd9gVDhhiQ3UX5SI7aCbb3olSwvxqYCZpf3hBfo09W",
        },
        {
          name: "compressed hex (03 prefix)",
          input: "03e47d5e1e3e23c8b25d98d2dcb10e5efc37dd4399bb9fb2a0f9ff6192e4d27ade",
          expectedBase64: "A+R9Xh4+I8iyXZjS3LEOXvw33UOZu5+yoPn/YZLk0nre",
        },
        {
          name: "base64 (already normalized)",
          input: "Ainc9JdpcJrgWkxqraKNpU105QsjKYoWeKu0cm2j2e+v",
          expectedBase64: "Ainc9JdpcJrgWkxqraKNpU105QsjKYoWeKu0cm2j2e+v",
        },
      ];

      testCases.forEach(({ name, input, expectedBase64 }) => {
        const result = normalizeSecp256k1PublicKey(input);

        // REGRESSION TEST: All inputs must normalize to base64
        expect(result, `Failed for ${name}`).toBe(expectedBase64);
        expect(result.length, `Wrong length for ${name}`).toBe(44);
        expect(/^A[A-Za-z0-9+/]{43}$/.test(result), `Invalid format for ${name}`).toBe(true);
      });
    });
  });

  describe("Output Validation", () => {
    it("should never output hex format", () => {
      const testPubkeys = [
        "Ainc9JdpcJrgWkxqraKNpU105QsjKYoWeKu0cm2j2e+v", // base64
        "0235ddf60543861890dd45f9488eda09b6f7a254b0bf1a98099a5fde105fa34f56", // hex
        "02297fd3c8d6eef95f069dbcc9abe28c89e2b41e59a0f61b72f696afd86eed46eb", // hex
      ];

      testPubkeys.forEach((pubkey) => {
        const result = normalizeSecp256k1PublicKey(pubkey);

        // REGRESSION TEST: Must NOT be hex format
        expect(result.length).not.toBe(66); // Hex compressed key length
        expect(result).not.toMatch(/^0[23][0-9a-fA-F]{64}$/); // Hex pattern
        expect(result).not.toMatch(/^0x/); // No 0x prefix

        // Must BE base64 format
        expect(result.length).toBe(44);
        expect(/^A[A-Za-z0-9+/]{43}$/.test(result)).toBe(true);
      });
    });

    it("should maintain idempotency - calling twice returns same result", () => {
      const testPubkeys = [
        "Ainc9JdpcJrgWkxqraKNpU105QsjKYoWeKu0cm2j2e+v",
        "0235ddf60543861890dd45f9488eda09b6f7a254b0bf1a98099a5fde105fa34f56",
      ];

      testPubkeys.forEach((pubkey) => {
        const firstCall = normalizeSecp256k1PublicKey(pubkey);
        const secondCall = normalizeSecp256k1PublicKey(firstCall);

        // REGRESSION TEST: Idempotent - calling twice should return same result
        expect(secondCall).toBe(firstCall);
        expect(secondCall.length).toBe(44);
        expect(/^A[A-Za-z0-9+/]{43}$/.test(secondCall)).toBe(true);
      });
    });
  });

  describe("Salt Calculation Consistency", () => {
    it("should ensure same normalized format produces same salt input", () => {
      const hexPubkey = "0235ddf60543861890dd45f9488eda09b6f7a254b0bf1a98099a5fde105fa34f56";
      const base64Pubkey = "AjXd9gVDhhiQ3UX5SI7aCbb3olSwvxqYCZpf3hBfo09W";

      const normalizedFromHex = normalizeSecp256k1PublicKey(hexPubkey);
      const normalizedFromBase64 = normalizeSecp256k1PublicKey(base64Pubkey);

      // CRITICAL: Both must normalize to the SAME base64 format
      expect(normalizedFromHex).toBe(normalizedFromBase64);
      expect(normalizedFromHex).toBe(base64Pubkey);

      // This ensures salt calculation will be consistent:
      // calculateSalt(AUTHENTICATOR_TYPE.Secp256K1, normalizedFromHex) ===
      // calculateSalt(AUTHENTICATOR_TYPE.Secp256K1, normalizedFromBase64)
    });
  });

  describe("Bug Prevention Documentation", () => {
    it("should document the bug and fix", () => {
      // This test serves as documentation
      const bugExample = {
        description: "The bug was in createAccount.ts line ~230",
        before: "const formattedPubkey = formatSecp256k1Pubkey(pubkeyHex); // ❌ Converted to hex",
        after: "const formattedPubkey = normalizedPubkey; // ✅ Keep as base64",
        impact: [
          "xion.js calculated salt from base64",
          "But sent hex to AA-API",
          "AA-API calculated salt from hex",
          "Different salts → different addresses → signature verification FAILED",
        ],
        fix: [
          "Always send base64 pubkey to AA-API",
          "Both sides calculate salt from same format",
          "Same salt → same address → signature verification SUCCEEDS",
        ],
      };

      // Verify the fix is in place
      const testPubkey = "Ainc9JdpcJrgWkxqraKNpU105QsjKYoWeKu0cm2j2e+v";
      const normalized = normalizeSecp256k1PublicKey(testPubkey);

      // REGRESSION TEST: Normalized pubkey should be base64
      expect(normalized).toBe(testPubkey);
      expect(normalized.length).toBe(44);
      expect(/^A[A-Za-z0-9+/]{43}$/.test(normalized)).toBe(true);

      // Document test always passes
      expect(bugExample.description).toBeTruthy();
    });
  });
});
