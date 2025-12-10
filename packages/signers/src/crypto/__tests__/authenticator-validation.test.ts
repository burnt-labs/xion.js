import { describe, it, expect } from "vitest";
import {
  isEthereumAddress,
  isSecp256k1PublicKey,
  isJWTToken,
  detectAuthenticatorType,
  type AuthenticatorType,
} from "../authenticator-validation";

describe("validation.ts - Credential Validation", () => {
  describe("isEthereumAddress", () => {
    describe("Valid Ethereum addresses", () => {
      it("should validate correct Ethereum addresses with mixed case", () => {
        const validAddresses = [
          "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
          "0x742D35CC6634C0532925A3B844BC9E7595F0BEB0",
          "0x0000000000000000000000000000000000000000",
          "0xffffffffffffffffffffffffffffffffffffffff",
          "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF",
        ];

        validAddresses.forEach((address) => {
          expect(isEthereumAddress(address)).toBe(true);
        });
      });

      it("should validate all lowercase Ethereum addresses", () => {
        expect(
          isEthereumAddress("0x742d35cc6634c0532925a3b844bc9e7595f0beb0"),
        ).toBe(true);
      });

      it("should validate all uppercase Ethereum addresses", () => {
        expect(
          isEthereumAddress("0x742D35CC6634C0532925A3B844BC9E7595F0BEB0"),
        ).toBe(true);
      });
    });

    describe("Invalid Ethereum addresses", () => {
      it("should reject empty string", () => {
        expect(isEthereumAddress("")).toBe(false);
      });

      it("should reject address without 0x prefix", () => {
        expect(
          isEthereumAddress("742d35Cc6634C0532925a3b844Bc9e7595f0bEb0"),
        ).toBe(false);
      });

      it("should reject address with only 0x", () => {
        expect(isEthereumAddress("0x")).toBe(false);
      });

      it("should reject too short addresses", () => {
        expect(isEthereumAddress("0x123")).toBe(false);
        expect(isEthereumAddress("0x123456789abcdef")).toBe(false);
      });

      it("should reject too long addresses", () => {
        expect(
          isEthereumAddress("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb01"),
        ).toBe(false);
        expect(
          isEthereumAddress("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0123"),
        ).toBe(false);
      });

      it("should reject addresses with invalid characters", () => {
        expect(
          isEthereumAddress("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbZ"),
        ).toBe(false);
        expect(
          isEthereumAddress("0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG"),
        ).toBe(false);
        expect(
          isEthereumAddress("0x742d35Cc6634C0532925a3b844Bc9e7595f0bE!0"),
        ).toBe(false);
      });

      it("should reject non-address strings", () => {
        expect(isEthereumAddress("not-an-address")).toBe(false);
        expect(isEthereumAddress("0xNOTANADDRESS")).toBe(false);
      });

      it("should reject addresses with spaces", () => {
        expect(
          isEthereumAddress("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0 "),
        ).toBe(false);
        expect(
          isEthereumAddress(" 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0"),
        ).toBe(false);
      });
    });
  });

  describe("isSecp256k1PublicKey", () => {
    describe("Valid Secp256k1 public keys", () => {
      it("should validate base64-encoded compressed keys (44 chars starting with A)", () => {
        const validKeys = [
          "A1234567890123456789012345678901234567890123",
          "A9876543210987654321098765432109876543210987",
          "A/+/+/+/+/+/+/+/+/+/+/+/+/+/+/+/+/+/+/+/+123", // Valid base64 chars
          "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        ];

        validKeys.forEach((key) => {
          expect(isSecp256k1PublicKey(key)).toBe(true);
        });
      });

      it("should validate hex compressed keys (66 chars starting with 02)", () => {
        expect(
          isSecp256k1PublicKey(
            "02123456789abcdef123456789abcdef123456789abcdef123456789abcdef1234",
          ),
        ).toBe(true);
        expect(
          isSecp256k1PublicKey(
            "0200000000000000000000000000000000000000000000000000000000000000ab",
          ),
        ).toBe(true);
      });

      it("should validate hex compressed keys (66 chars starting with 03)", () => {
        expect(
          isSecp256k1PublicKey(
            "03123456789abcdef123456789abcdef123456789abcdef123456789abcdef1234",
          ),
        ).toBe(true);
        expect(
          isSecp256k1PublicKey(
            "03ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
          ),
        ).toBe(true);
      });

      it("should validate hex uncompressed keys (130 chars starting with 04)", () => {
        expect(isSecp256k1PublicKey("04" + "a".repeat(128))).toBe(true);
        expect(
          isSecp256k1PublicKey(
            "04123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0",
          ),
        ).toBe(true);
      });
    });

    describe("Invalid Secp256k1 public keys", () => {
      it("should reject empty string", () => {
        expect(isSecp256k1PublicKey("")).toBe(false);
      });

      it("should reject base64 keys not starting with A", () => {
        expect(
          isSecp256k1PublicKey("B123456789abcdef123456789abcdef123456789abc"),
        ).toBe(false);
        expect(
          isSecp256k1PublicKey("C123456789abcdef123456789abcdef123456789abc"),
        ).toBe(false);
      });

      it("should reject too short keys", () => {
        expect(isSecp256k1PublicKey("A123")).toBe(false);
        expect(isSecp256k1PublicKey("02123")).toBe(false);
      });

      it("should reject non-key strings", () => {
        expect(isSecp256k1PublicKey("not-a-key")).toBe(false);
        expect(isSecp256k1PublicKey("random-string-value")).toBe(false);
      });

      it("should reject hex keys with invalid prefix", () => {
        expect(
          isSecp256k1PublicKey(
            "01123456789abcdef123456789abcdef123456789abcdef123456789abcdef1234",
          ),
        ).toBe(false);
        expect(
          isSecp256k1PublicKey(
            "05123456789abcdef123456789abcdef123456789abcdef123456789abcdef1234",
          ),
        ).toBe(false);
      });

      it("should reject hex keys with invalid characters", () => {
        expect(
          isSecp256k1PublicKey(
            "02123456789abcdefg123456789abcdef123456789abcdef123456789abcdef123",
          ),
        ).toBe(false);
        expect(
          isSecp256k1PublicKey(
            "03GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG",
          ),
        ).toBe(false);
      });

      it("should reject keys with no A prefix for base64", () => {
        expect(
          isSecp256k1PublicKey("123456789abcdef123456789abcdef123456789abc"),
        ).toBe(false);
      });

      it("should reject base64 keys with invalid base64 characters", () => {
        expect(
          isSecp256k1PublicKey("A123456789!bcdef123456789abcdef123456789ab"),
        ).toBe(false);
      });
    });
  });

  describe("isJWTToken", () => {
    describe("Valid JWT tokens", () => {
      it("should validate standard JWT tokens", () => {
        const validTokens = [
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
          "abcdefghijklmnopqrstuvwxyz1234567890.abcdefghijklmnopqrstuvwxyz1234567890ABCDEF.signature123456789",
        ];

        validTokens.forEach((token) => {
          expect(isJWTToken(token)).toBe(true);
        });
      });

      it("should validate JWT tokens with minimum length parts (exactly 10 chars)", () => {
        expect(isJWTToken("1234567890.abcdefghij.signature12345")).toBe(true);
        expect(isJWTToken("abcdefghij.1234567890.sig12345678")).toBe(true);
      });

      it("should validate JWT tokens with underscores and hyphens", () => {
        expect(
          isJWTToken("header_with-chars.payload_with-chars.signature_12345"),
        ).toBe(true);
      });

      it("should validate very long JWT tokens", () => {
        const longHeader = "a".repeat(100);
        const longPayload = "b".repeat(200);
        const longSignature = "c".repeat(150);
        expect(
          isJWTToken(`${longHeader}.${longPayload}.${longSignature}`),
        ).toBe(true);
      });
    });

    describe("Invalid JWT tokens", () => {
      it("should reject empty string", () => {
        expect(isJWTToken("")).toBe(false);
      });

      it("should reject single part tokens", () => {
        expect(isJWTToken("only-one-part")).toBe(false);
      });

      it("should reject two part tokens", () => {
        expect(isJWTToken("two.parts")).toBe(false);
        expect(isJWTToken("validheaderpart123.validpayloadpart123")).toBe(
          false,
        );
      });

      it("should reject four part tokens", () => {
        expect(isJWTToken("four.parts.too.many")).toBe(false);
        expect(isJWTToken("a.b.c.d")).toBe(false);
      });

      it("should reject tokens with invalid characters", () => {
        expect(isJWTToken("invalid!.characters$.here")).toBe(false);
        expect(isJWTToken("header@test.payload.signature")).toBe(false);
      });

      it("should reject tokens with very short parts", () => {
        expect(isJWTToken("a.b.c")).toBe(false);
        expect(isJWTToken("abc.def.ghi")).toBe(false);
      });

      it("should reject tokens with short header (less than 10 chars)", () => {
        expect(
          isJWTToken("short.longPayloadPartHere12345.signature12345"),
        ).toBe(false);
        expect(isJWTToken("a.verylongpayloadpart.signature12345")).toBe(false);
        expect(isJWTToken("123456789.validpayloadpart123.signature")).toBe(
          false,
        ); // 9 chars
      });

      it("should reject tokens with short payload (less than 10 chars)", () => {
        expect(isJWTToken("longenoughheader123.short.signature12345")).toBe(
          false,
        );
        expect(isJWTToken("verylongheaderpart.b.signature12345")).toBe(false);
        expect(isJWTToken("validheaderpart123.123456789.signature")).toBe(
          false,
        ); // 9 chars
      });

      it("should reject tokens with both header and payload too short", () => {
        expect(isJWTToken("a.b.signature12345")).toBe(false);
        expect(isJWTToken("abc.def.signature12345")).toBe(false);
      });

      it("should reject tokens with empty header", () => {
        expect(isJWTToken(".validpayloadpart123.signature")).toBe(false);
      });

      it("should reject tokens with empty payload", () => {
        expect(isJWTToken("validheaderpart123..signature")).toBe(false);
      });

      it("should reject tokens with empty signature", () => {
        expect(isJWTToken("validheaderpart123.validpayloadpart123.")).toBe(
          false,
        );
      });

      it("should reject tokens with invalid characters in header", () => {
        expect(isJWTToken("invalid!header.validpayloadpart123.signature")).toBe(
          false,
        );
        expect(isJWTToken("invalid$header.validpayloadpart123.signature")).toBe(
          false,
        );
        expect(isJWTToken("invalid@header.validpayloadpart123.signature")).toBe(
          false,
        );
      });

      it("should reject tokens with invalid characters in payload", () => {
        expect(isJWTToken("validheaderpart123.invalid!payload.signature")).toBe(
          false,
        );
        expect(isJWTToken("validheaderpart123.invalid$payload.signature")).toBe(
          false,
        );
        expect(isJWTToken("validheaderpart123.invalid@payload.signature")).toBe(
          false,
        );
      });

      it("should reject tokens with invalid characters in signature", () => {
        expect(
          isJWTToken("validheaderpart123.validpayloadpart123.invalid!sig"),
        ).toBe(false);
        expect(
          isJWTToken("validheaderpart123.validpayloadpart123.invalid$sig"),
        ).toBe(false);
        expect(
          isJWTToken("validheaderpart123.validpayloadpart123.invalid@sig"),
        ).toBe(false);
      });

      it("should reject tokens with spaces", () => {
        expect(
          isJWTToken(" validheaderpart123.validpayloadpart123.signature"),
        ).toBe(false);
        expect(
          isJWTToken("validheaderpart123.validpayloadpart123.signature "),
        ).toBe(false);
        expect(
          isJWTToken("validheader part123.validpayloadpart123.signature"),
        ).toBe(false);
      });
    });

    describe("Edge cases with exactly 10 character parts", () => {
      it("should accept tokens with exactly 10 character header and payload", () => {
        expect(isJWTToken("1234567890.abcdefghij.signature12345")).toBe(true);
      });

      it("should reject tokens with 9 character header", () => {
        expect(isJWTToken("123456789.abcdefghij.signature12345")).toBe(false);
      });

      it("should reject tokens with 9 character payload", () => {
        expect(isJWTToken("1234567890.abcdefghi.signature12345")).toBe(false);
      });
    });
  });

  describe("detectAuthenticatorType", () => {
    describe("JWT detection", () => {
      it("should detect valid JWT tokens", () => {
        const jwtToken =
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

        expect(detectAuthenticatorType(jwtToken)).toBe("JWT");
      });

      it("should detect JWT with whitespace (trimmed)", () => {
        const jwtToken =
          "  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c  ";

        expect(detectAuthenticatorType(jwtToken)).toBe("JWT");
      });
    });

    describe("Ethereum detection", () => {
      it("should detect valid Ethereum addresses", () => {
        const ethAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0";

        expect(detectAuthenticatorType(ethAddress)).toBe("EthWallet");
      });

      it("should detect Ethereum address with whitespace (trimmed)", () => {
        const ethAddress = "  0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0  ";

        expect(detectAuthenticatorType(ethAddress)).toBe("EthWallet");
      });

      it("should detect all lowercase Ethereum addresses", () => {
        expect(
          detectAuthenticatorType("0x742d35cc6634c0532925a3b844bc9e7595f0beb0"),
        ).toBe("EthWallet");
      });

      it("should detect all uppercase Ethereum addresses", () => {
        expect(
          detectAuthenticatorType("0x742D35CC6634C0532925A3B844BC9E7595F0BEB0"),
        ).toBe("EthWallet");
      });
    });

    describe("Secp256k1 detection", () => {
      it("should detect valid base64 Secp256k1 public keys", () => {
        const secp256k1Key = "A1234567890123456789012345678901234567890123";

        expect(detectAuthenticatorType(secp256k1Key)).toBe("Secp256K1");
      });

      it("should detect hex compressed Secp256k1 keys", () => {
        const hexKey =
          "02123456789abcdef123456789abcdef123456789abcdef123456789abcdef1234";

        expect(detectAuthenticatorType(hexKey)).toBe("Secp256K1");
      });

      it("should detect hex uncompressed Secp256k1 keys", () => {
        const hexKey = "04" + "a".repeat(128);

        expect(detectAuthenticatorType(hexKey)).toBe("Secp256K1");
      });

      it("should detect Secp256k1 with whitespace (trimmed)", () => {
        const secp256k1Key = "  A1234567890123456789012345678901234567890123  ";

        expect(detectAuthenticatorType(secp256k1Key)).toBe("Secp256K1");
      });
    });

    describe("Unknown/invalid credentials", () => {
      it("should return null for empty string", () => {
        expect(detectAuthenticatorType("")).toBeNull();
      });

      it("should return null for whitespace only", () => {
        expect(detectAuthenticatorType("   ")).toBeNull();
      });

      it("should return null for unrecognized identifier", () => {
        expect(detectAuthenticatorType("unknown-identifier-format")).toBeNull();
      });

      it("should return null for invalid Ethereum address", () => {
        expect(detectAuthenticatorType("0x123")).toBeNull();
      });

      it("should return null for invalid JWT", () => {
        expect(detectAuthenticatorType("not.a.jwt")).toBeNull();
      });

      it("should return null for invalid Secp256k1 key", () => {
        expect(detectAuthenticatorType("B123456789abc")).toBeNull();
      });

      it("should return null for random strings", () => {
        expect(detectAuthenticatorType("random-string")).toBeNull();
        expect(detectAuthenticatorType("12345")).toBeNull();
        expect(detectAuthenticatorType("abc@def.com")).toBeNull();
      });
    });

    describe("Priority order (JWT > Ethereum > Secp256k1)", () => {
      it("should prioritize JWT detection over other formats", () => {
        // Even if a JWT-like string could potentially match other patterns
        const jwtToken =
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

        expect(detectAuthenticatorType(jwtToken)).toBe("JWT");
      });

      it("should detect Ethereum before Secp256k1 when both could match", () => {
        // This is a theoretical test - in practice they shouldn't overlap
        // But ensures priority order is maintained
        const ethAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0";

        expect(detectAuthenticatorType(ethAddress)).toBe("EthWallet");
      });
    });

    describe("Type assertion", () => {
      it("should return correct type for JWT", () => {
        const result: AuthenticatorType | null = detectAuthenticatorType(
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
        );

        expect(result).toBe("JWT");
      });

      it("should return correct type for Ethereum", () => {
        const result: AuthenticatorType | null = detectAuthenticatorType(
          "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
        );

        expect(result).toBe("EthWallet");
      });

      it("should return correct type for Secp256k1", () => {
        const result: AuthenticatorType | null = detectAuthenticatorType(
          "A1234567890123456789012345678901234567890123",
        );

        expect(result).toBe("Secp256K1");
      });

      it("should return null for invalid", () => {
        const result: AuthenticatorType | null =
          detectAuthenticatorType("invalid");

        expect(result).toBeNull();
      });
    });
  });
});
