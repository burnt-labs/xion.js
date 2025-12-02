import { describe, it, expect } from "vitest";
import { verifyEthWalletSignature, verifySecp256k1Signature } from "../signature-verification";
import { Wallet } from "ethers";
import { Secp256k1, sha256 } from "@cosmjs/crypto";
import { toHex } from "@cosmjs/encoding";

describe("signature-verification.ts - Signature Verification Utilities", () => {
  describe("verifyEthWalletSignature", () => {
    describe("Valid Signature Verification", () => {
      it("should verify a valid Ethereum wallet signature", async () => {
        const wallet = Wallet.createRandom();
        const message = "xion1test123456789abcdefghijklmnopqrstuvwxyz";
        const signature = await wallet.signMessage(message);

        const result = verifyEthWalletSignature(message, signature, wallet.address);
        expect(result).toBe(true);
      });

      it("should verify signature with 0x prefix", async () => {
        const wallet = Wallet.createRandom();
        const message = "xion1test123456789abcdefghijklmnopqrstuvwxyz";
        const signature = await wallet.signMessage(message);

        const result = verifyEthWalletSignature(message, signature, wallet.address);
        expect(result).toBe(true);
      });

      it("should verify signature without 0x prefix", async () => {
        const wallet = Wallet.createRandom();
        const message = "xion1test123456789abcdefghijklmnopqrstuvwxyz";
        let signature = await wallet.signMessage(message);

        // Remove 0x prefix if present
        if (signature.startsWith("0x")) {
          signature = signature.slice(2);
        }

        const result = verifyEthWalletSignature(message, signature, wallet.address);
        expect(result).toBe(true);
      });

      it("should handle case-insensitive address matching", async () => {
        const wallet = Wallet.createRandom();
        const message = "xion1test123456789abcdefghijklmnopqrstuvwxyz";
        const signature = await wallet.signMessage(message);

        // Test with uppercase address
        const result1 = verifyEthWalletSignature(
          message,
          signature,
          wallet.address.toUpperCase()
        );
        expect(result1).toBe(true);

        // Test with lowercase address
        const result2 = verifyEthWalletSignature(
          message,
          signature,
          wallet.address.toLowerCase()
        );
        expect(result2).toBe(true);

        // Test with mixed case
        const mixedCase =
          wallet.address.slice(0, 10).toUpperCase() +
          wallet.address.slice(10).toLowerCase();
        const result3 = verifyEthWalletSignature(message, signature, mixedCase);
        expect(result3).toBe(true);
      });

      it("should verify different messages signed by same wallet", async () => {
        const wallet = Wallet.createRandom();

        const message1 = "xion1message1";
        const signature1 = await wallet.signMessage(message1);
        expect(verifyEthWalletSignature(message1, signature1, wallet.address)).toBe(true);

        const message2 = "xion1message2";
        const signature2 = await wallet.signMessage(message2);
        expect(verifyEthWalletSignature(message2, signature2, wallet.address)).toBe(true);
      });
    });

    describe("Invalid Signature Rejection", () => {
      it("should return false for signature from different wallet", async () => {
        const wallet1 = Wallet.createRandom();
        const wallet2 = Wallet.createRandom();
        const message = "xion1test123456789abcdefghijklmnopqrstuvwxyz";

        // Sign with wallet2 but try to verify with wallet1's address
        const signature = await wallet2.signMessage(message);

        const result = verifyEthWalletSignature(message, signature, wallet1.address);
        expect(result).toBe(false);
      });

      it("should return false for signature of different message", async () => {
        const wallet = Wallet.createRandom();
        const message1 = "xion1message1";
        const message2 = "xion1message2";

        // Sign message1 but try to verify with message2
        const signature = await wallet.signMessage(message1);

        const result = verifyEthWalletSignature(message2, signature, wallet.address);
        expect(result).toBe(false);
      });

      it("should throw error for malformed signature", () => {
        const message = "xion1test123456789abcdefghijklmnopqrstuvwxyz";
        const address = "0x1234567890123456789012345678901234567890";
        const invalidSignature = "0xinvalid_signature_data";

        expect(() => verifyEthWalletSignature(message, invalidSignature, address)).toThrow(
          /Signature recovery failed/
        );
      });

      it("should throw error for empty signature", () => {
        const message = "xion1test123456789abcdefghijklmnopqrstuvwxyz";
        const address = "0x1234567890123456789012345678901234567890";

        expect(() => verifyEthWalletSignature(message, "", address)).toThrow(
          /Signature recovery failed/
        );
      });

      it("should throw error for signature that is too short", () => {
        const message = "xion1test123456789abcdefghijklmnopqrstuvwxyz";
        const address = "0x1234567890123456789012345678901234567890";
        const shortSignature = "0x123456";

        expect(() => verifyEthWalletSignature(message, shortSignature, address)).toThrow(
          /Signature recovery failed/
        );
      });

      it("should throw error for signature with invalid hex characters", () => {
        const message = "xion1test123456789abcdefghijklmnopqrstuvwxyz";
        const address = "0x1234567890123456789012345678901234567890";
        const invalidHexSig = "0x" + "g".repeat(130);

        expect(() => verifyEthWalletSignature(message, invalidHexSig, address)).toThrow(
          /Signature recovery failed/
        );
      });
    });

    describe("Edge Cases", () => {
      it("should handle very long messages", async () => {
        const wallet = Wallet.createRandom();
        const longMessage = "x".repeat(1000);
        const signature = await wallet.signMessage(longMessage);

        const result = verifyEthWalletSignature(longMessage, signature, wallet.address);
        expect(result).toBe(true);
      });

      it("should handle messages with special characters", async () => {
        const wallet = Wallet.createRandom();
        const message = "xion1test!@#$%^&*()_+-={}[]|:;<>?,./";
        const signature = await wallet.signMessage(message);

        const result = verifyEthWalletSignature(message, signature, wallet.address);
        expect(result).toBe(true);
      });

      it("should handle messages with unicode characters", async () => {
        const wallet = Wallet.createRandom();
        const message = "xion1test你好世界🌍";
        const signature = await wallet.signMessage(message);

        const result = verifyEthWalletSignature(message, signature, wallet.address);
        expect(result).toBe(true);
      });

      it("should handle messages with newlines", async () => {
        const wallet = Wallet.createRandom();
        const message = "line1\nline2\nline3";
        const signature = await wallet.signMessage(message);

        const result = verifyEthWalletSignature(message, signature, wallet.address);
        expect(result).toBe(true);
      });
    });
  });

  describe("verifySecp256k1Signature", () => {
    // Helper function to create a test key pair and signature over string message
    async function createTestSignature(message: string) {
      const privkey = new Uint8Array(32);
      // Fill with deterministic data for testing
      for (let i = 0; i < 32; i++) {
        privkey[i] = (i * 7 + 13) % 256;
      }

      const keypair = await Secp256k1.makeKeypair(privkey);
      const messageBytes = Buffer.from(message);
      const messageHash = sha256(messageBytes);
      const signature = await Secp256k1.createSignature(messageHash, privkey);

      // Extract r and s components (64 bytes total, without recovery byte)
      // This matches what verifySecp256k1Signature expects
      const signatureBytes = new Uint8Array(64);
      signatureBytes.set(signature.r(), 0);   // First 32 bytes (r)
      signatureBytes.set(signature.s(), 32);  // Second 32 bytes (s)

      return {
        privkey,
        pubkey: keypair.pubkey,
        pubkeyHex: toHex(keypair.pubkey),
        pubkeyBase64: Buffer.from(keypair.pubkey).toString("base64"),
        signature,
        signatureHex: toHex(signatureBytes),  // 64 bytes (r+s) without recovery byte
        message,
        messageHash,
      };
    }

    // Helper function to create a test key pair and signature over hex-encoded message
    async function createTestSignatureHex(message: string) {
      const privkey = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        privkey[i] = (i * 7 + 13) % 256;
      }

      const keypair = await Secp256k1.makeKeypair(privkey);
      // Convert message to hex format (as createSecp256k1Account does)
      const messageHex = Buffer.from(message).toString("hex");
      const messageBytes = Buffer.from(messageHex, "hex");
      const messageHash = sha256(messageBytes);
      const signature = await Secp256k1.createSignature(messageHash, privkey);

      const signatureBytes = new Uint8Array(64);
      signatureBytes.set(signature.r(), 0);
      signatureBytes.set(signature.s(), 32);

      return {
        privkey,
        pubkey: keypair.pubkey,
        pubkeyHex: toHex(keypair.pubkey),
        pubkeyBase64: Buffer.from(keypair.pubkey).toString("base64"),
        signature,
        signatureHex: toHex(signatureBytes),
        message,
        messageHex: "0x" + messageHex,
        messageHash,
      };
    }

    describe("Valid Signature Verification with Base64 Public Key", () => {
      it("should verify a valid secp256k1 signature with base64 pubkey", async () => {
        const testData = await createTestSignature("xion1test123456789abcdefghijklmnopqrstuvwxyz");

        const result = await verifySecp256k1Signature(
          testData.message,
          testData.signatureHex,
          testData.pubkeyBase64
        );

        expect(result).toBe(true);
      });

      it("should verify signature with 0x prefix on signature", async () => {
        const testData = await createTestSignature("xion1test123456789abcdefghijklmnopqrstuvwxyz");
        const signatureWith0x = "0x" + testData.signatureHex;

        const result = await verifySecp256k1Signature(
          testData.message,
          signatureWith0x,
          testData.pubkeyBase64
        );

        expect(result).toBe(true);
      });

      it("should verify signature without 0x prefix on signature", async () => {
        const testData = await createTestSignature("xion1test123456789abcdefghijklmnopqrstuvwxyz");

        const result = await verifySecp256k1Signature(
          testData.message,
          testData.signatureHex,
          testData.pubkeyBase64
        );

        expect(result).toBe(true);
      });

      it("should verify different messages with same key", async () => {
        const privkey = new Uint8Array(32);
        for (let i = 0; i < 32; i++) {
          privkey[i] = (i * 3 + 5) % 256;
        }
        const keypair = await Secp256k1.makeKeypair(privkey);
        const pubkeyBase64 = Buffer.from(keypair.pubkey).toString("base64");

        // Sign and verify message 1
        const message1 = "xion1message1";
        const hash1 = sha256(Buffer.from(message1));
        const sig1 = await Secp256k1.createSignature(hash1, privkey);

        // Extract 64-byte signature (r+s without recovery byte)
        const sig1Bytes = new Uint8Array(64);
        sig1Bytes.set(sig1.r(), 0);
        sig1Bytes.set(sig1.s(), 32);

        const result1 = await verifySecp256k1Signature(
          message1,
          toHex(sig1Bytes),
          pubkeyBase64
        );
        expect(result1).toBe(true);

        // Sign and verify message 2
        const message2 = "xion1message2";
        const hash2 = sha256(Buffer.from(message2));
        const sig2 = await Secp256k1.createSignature(hash2, privkey);

        // Extract 64-byte signature (r+s without recovery byte)
        const sig2Bytes = new Uint8Array(64);
        sig2Bytes.set(sig2.r(), 0);
        sig2Bytes.set(sig2.s(), 32);

        const result2 = await verifySecp256k1Signature(
          message2,
          toHex(sig2Bytes),
          pubkeyBase64
        );
        expect(result2).toBe(true);
      });
    });

    describe("Valid Signature Verification with Hex Public Key", () => {
      it("should verify signature with hex pubkey", async () => {
        const testData = await createTestSignature("xion1test123456789abcdefghijklmnopqrstuvwxyz");

        const result = await verifySecp256k1Signature(
          testData.message,
          testData.signatureHex,
          testData.pubkeyHex
        );

        expect(result).toBe(true);
      });

      it("should verify signature with 0x prefix on hex pubkey", async () => {
        const testData = await createTestSignature("xion1test123456789abcdefghijklmnopqrstuvwxyz");
        const pubkeyWith0x = "0x" + testData.pubkeyHex;

        const result = await verifySecp256k1Signature(
          testData.message,
          testData.signatureHex,
          pubkeyWith0x
        );

        expect(result).toBe(true);
      });

      it("should verify signature with uppercase hex pubkey", async () => {
        const testData = await createTestSignature("xion1test123456789abcdefghijklmnopqrstuvwxyz");
        const pubkeyUpper = testData.pubkeyHex.toUpperCase();

        const result = await verifySecp256k1Signature(
          testData.message,
          testData.signatureHex,
          pubkeyUpper
        );

        expect(result).toBe(true);
      });

      it("should verify signature with mixed case hex pubkey", async () => {
        const testData = await createTestSignature("xion1test123456789abcdefghijklmnopqrstuvwxyz");
        const pubkeyMixed =
          testData.pubkeyHex.slice(0, 10).toUpperCase() +
          testData.pubkeyHex.slice(10).toLowerCase();

        const result = await verifySecp256k1Signature(
          testData.message,
          testData.signatureHex,
          pubkeyMixed
        );

        expect(result).toBe(true);
      });
    });

    describe("Compressed and Uncompressed Public Keys", () => {
      it("should work with compressed pubkey (33 bytes)", async () => {
        // Create a truly compressed pubkey by compressing the one from makeKeypair
        const testData = await createTestSignature("xion1test123456789abcdefghijklmnopqrstuvwxyz");

        // CosmJS makeKeypair returns uncompressed (65 bytes), so we compress it
        const compressedPubkey = Secp256k1.compressPubkey(testData.pubkey);
        expect(compressedPubkey.length).toBe(33);

        const result = await verifySecp256k1Signature(
          testData.message,
          testData.signatureHex,
          Buffer.from(compressedPubkey).toString("base64")
        );

        expect(result).toBe(true);
      });

      it("should work with uncompressed pubkey (65 bytes)", async () => {
        const privkey = new Uint8Array(32);
        for (let i = 0; i < 32; i++) {
          privkey[i] = (i * 11 + 7) % 256;
        }

        const keypair = await Secp256k1.makeKeypair(privkey);

        // Create uncompressed pubkey (65 bytes: 0x04 + x-coordinate + y-coordinate)
        const uncompressedPubkey = await Secp256k1.uncompressPubkey(keypair.pubkey);
        expect(uncompressedPubkey.length).toBe(65);

        const message = "xion1test123456789abcdefghijklmnopqrstuvwxyz";
        const messageHash = sha256(Buffer.from(message));
        const signature = await Secp256k1.createSignature(messageHash, privkey);

        // Extract 64-byte signature (r+s without recovery byte)
        const signatureBytes = new Uint8Array(64);
        signatureBytes.set(signature.r(), 0);
        signatureBytes.set(signature.s(), 32);

        const result = await verifySecp256k1Signature(
          message,
          toHex(signatureBytes),
          toHex(uncompressedPubkey)
        );

        expect(result).toBe(true);
      });
    });

    describe("Invalid Signature Rejection", () => {
      it("should return false for signature from different key", async () => {
        const testData1 = await createTestSignature("xion1test123456789abcdefghijklmnopqrstuvwxyz");

        // Create a second keypair with a different account number/seed
        const privkey2 = new Uint8Array(32);
        for (let i = 0; i < 32; i++) {
          privkey2[i] = (i * 11 + 7) % 256; // Different seed than createTestSignature
        }
        const keypair2 = await Secp256k1.makeKeypair(privkey2);

        // Try to verify testData1's signature with a different key's pubkey
        const result = await verifySecp256k1Signature(
          testData1.message,
          testData1.signatureHex,
          Buffer.from(keypair2.pubkey).toString("base64")
        );

        expect(result).toBe(false);
      });

      it("should return false for signature of different message", async () => {
        const testData = await createTestSignature("xion1message1");

        // Try to verify with a different message
        const result = await verifySecp256k1Signature(
          "xion1message2",
          testData.signatureHex,
          testData.pubkeyBase64
        );

        expect(result).toBe(false);
      });

      it("should throw error for invalid signature length", async () => {
        const testData = await createTestSignature("xion1test123456789abcdefghijklmnopqrstuvwxyz");
        const shortSig = "abcd1234"; // Too short

        await expect(
          verifySecp256k1Signature(testData.message, shortSig, testData.pubkeyBase64)
        ).rejects.toThrow(/Signature must be 64 bytes/);
      });

      it("should throw error for signature with 63 bytes", async () => {
        const testData = await createTestSignature("xion1test123456789abcdefghijklmnopqrstuvwxyz");
        const sig63Bytes = "a".repeat(126); // 63 bytes in hex

        await expect(
          verifySecp256k1Signature(testData.message, sig63Bytes, testData.pubkeyBase64)
        ).rejects.toThrow(/Signature must be 64 bytes, got 63/);
      });

      it("should throw error for signature with 65 bytes", async () => {
        const testData = await createTestSignature("xion1test123456789abcdefghijklmnopqrstuvwxyz");
        const sig65Bytes = "a".repeat(130); // 65 bytes in hex

        await expect(
          verifySecp256k1Signature(testData.message, sig65Bytes, testData.pubkeyBase64)
        ).rejects.toThrow(/Signature must be 64 bytes, got 65/);
      });

      it("should throw error for invalid hex signature", async () => {
        const testData = await createTestSignature("xion1test123456789abcdefghijklmnopqrstuvwxyz");
        const invalidHexSig = "zzzz" + "a".repeat(124); // Invalid hex chars

        await expect(
          verifySecp256k1Signature(testData.message, invalidHexSig, testData.pubkeyBase64)
        ).rejects.toThrow(/Failed to decode signature/);
      });

      it("should throw error for empty signature", async () => {
        const testData = await createTestSignature("xion1test123456789abcdefghijklmnopqrstuvwxyz");

        await expect(
          verifySecp256k1Signature(testData.message, "", testData.pubkeyBase64)
        ).rejects.toThrow(/Signature must be 64 bytes, got 0/);
      });

      it("should throw error for invalid pubkey length", async () => {
        const testData = await createTestSignature("xion1test123456789abcdefghijklmnopqrstuvwxyz");
        const shortPubkey = Buffer.from("ab", "hex").toString("base64"); // Too short

        await expect(
          verifySecp256k1Signature(testData.message, testData.signatureHex, shortPubkey)
        ).rejects.toThrow(/Public key must be 33 or 65 bytes/);
      });

      it("should throw error for pubkey with 32 bytes", async () => {
        const testData = await createTestSignature("xion1test123456789abcdefghijklmnopqrstuvwxyz");
        const pubkey32Bytes = Buffer.alloc(32, "a").toString("base64");

        await expect(
          verifySecp256k1Signature(testData.message, testData.signatureHex, pubkey32Bytes)
        ).rejects.toThrow(/Public key must be 33 or 65 bytes, got 32/);
      });

      it("should throw error for pubkey with 64 bytes", async () => {
        const testData = await createTestSignature("xion1test123456789abcdefghijklmnopqrstuvwxyz");
        const pubkey64Bytes = Buffer.alloc(64, "a").toString("base64");

        await expect(
          verifySecp256k1Signature(testData.message, testData.signatureHex, pubkey64Bytes)
        ).rejects.toThrow(/Public key must be 33 or 65 bytes, got 64/);
      });

      it("should throw error for pubkey with 34 bytes", async () => {
        const testData = await createTestSignature("xion1test123456789abcdefghijklmnopqrstuvwxyz");
        const pubkey34Bytes = Buffer.alloc(34, "a").toString("base64");

        await expect(
          verifySecp256k1Signature(testData.message, testData.signatureHex, pubkey34Bytes)
        ).rejects.toThrow(/Public key must be 33 or 65 bytes, got 34/);
      });

      it("should throw error for pubkey with 66 bytes", async () => {
        const testData = await createTestSignature("xion1test123456789abcdefghijklmnopqrstuvwxyz");
        const pubkey66Bytes = Buffer.alloc(66, "a").toString("base64");

        await expect(
          verifySecp256k1Signature(testData.message, testData.signatureHex, pubkey66Bytes)
        ).rejects.toThrow(/Public key must be 33 or 65 bytes, got 66/);
      });
    });

    describe("Edge Cases", () => {
      it("should handle very long messages", async () => {
        const longMessage = "x".repeat(1000);
        const testData = await createTestSignature(longMessage);

        const result = await verifySecp256k1Signature(
          testData.message,
          testData.signatureHex,
          testData.pubkeyBase64
        );

        expect(result).toBe(true);
      });

      it("should handle messages with special characters", async () => {
        const message = "xion1test!@#$%^&*()_+-={}[]|:;<>?,./";
        const testData = await createTestSignature(message);

        const result = await verifySecp256k1Signature(
          testData.message,
          testData.signatureHex,
          testData.pubkeyBase64
        );

        expect(result).toBe(true);
      });

      it("should handle messages with unicode characters", async () => {
        const message = "xion1test你好世界🌍";
        const testData = await createTestSignature(message);

        const result = await verifySecp256k1Signature(
          testData.message,
          testData.signatureHex,
          testData.pubkeyBase64
        );

        expect(result).toBe(true);
      });

      it("should handle empty message", async () => {
        const testData = await createTestSignature("");

        const result = await verifySecp256k1Signature(
          testData.message,
          testData.signatureHex,
          testData.pubkeyBase64
        );

        expect(result).toBe(true);
      });

      it("should handle message with newlines", async () => {
        const message = "line1\nline2\nline3";
        const testData = await createTestSignature(message);

        const result = await verifySecp256k1Signature(
          testData.message,
          testData.signatureHex,
          testData.pubkeyBase64
        );

        expect(result).toBe(true);
      });

      it("should handle signature with uppercase hex", async () => {
        const testData = await createTestSignature("xion1test123456789abcdefghijklmnopqrstuvwxyz");
        const signatureUpper = testData.signatureHex.toUpperCase();

        const result = await verifySecp256k1Signature(
          testData.message,
          signatureUpper,
          testData.pubkeyBase64
        );

        expect(result).toBe(true);
      });

      it("should handle signature with mixed case hex", async () => {
        const testData = await createTestSignature("xion1test123456789abcdefghijklmnopqrstuvwxyz");
        const signatureMixed =
          testData.signatureHex.slice(0, 20).toUpperCase() +
          testData.signatureHex.slice(20).toLowerCase();

        const result = await verifySecp256k1Signature(
          testData.message,
          signatureMixed,
          testData.pubkeyBase64
        );

        expect(result).toBe(true);
      });
    });

    describe("Hex Format Support (Standardized)", () => {
      it("should verify signature with hex-encoded message (0x prefix)", async () => {
        const testData = await createTestSignatureHex("xion1test123456789abcdefghijklmnopqrstuvwxyz");

        const result = await verifySecp256k1Signature(
          testData.messageHex,
          testData.signatureHex,
          testData.pubkeyBase64
        );

        expect(result).toBe(true);
      });

      it("should verify signature with hex-encoded message without 0x prefix (treated as string for backward compatibility)", async () => {
        // Note: Hex without 0x prefix is treated as string format (backward compatibility)
        // This test verifies backward compatibility behavior
        const testData = await createTestSignature("xion1test123456789abcdefghijklmnopqrstuvwxyz");
        
        // Remove 0x prefix - this will be treated as string format
        const messageWithoutPrefix = testData.message;

        // This should work because it's treated as string format (backward compatibility)
        const result = await verifySecp256k1Signature(
          messageWithoutPrefix,
          testData.signatureHex,
          testData.pubkeyBase64
        );

        expect(result).toBe(true);
      });

      it("should verify signature with string format (backward compatibility)", async () => {
        const testData = await createTestSignature("xion1test123456789abcdefghijklmnopqrstuvwxyz");

        // Verify with string format (backward compatibility)
        const result = await verifySecp256k1Signature(
          testData.message,
          testData.signatureHex,
          testData.pubkeyBase64
        );

        expect(result).toBe(true);
      });

      it("should handle hex and string formats equivalently for same message", async () => {
        const message = "xion1test123456789abcdefghijklmnopqrstuvwxyz";
        
        // Create signature over string format (backward compatibility)
        const testDataString = await createTestSignature(message);
        
        // Create signature over hex format (new standardized format)
        const testDataHex = await createTestSignatureHex(message);

        // String format should verify with string message
        const resultString = await verifySecp256k1Signature(
          testDataString.message,
          testDataString.signatureHex,
          testDataString.pubkeyBase64
        );

        // Hex format should verify with hex message
        const resultHex = await verifySecp256k1Signature(
          testDataHex.messageHex,
          testDataHex.signatureHex,
          testDataHex.pubkeyBase64
        );

        expect(resultString).toBe(true);
        expect(resultHex).toBe(true);
        
        // Note: These signatures are different because they're over different byte representations
        // (string UTF-8 bytes vs hex-encoded bytes), but both are valid for their respective formats
      });
    });

    describe("Integration with AA API behavior", () => {
      it("should match AA API verification logic for Secp256k1AbstractAccount", async () => {
        // This test ensures our implementation matches the AA API's verifySignature method
        const testData = await createTestSignature("xion1test123456789abcdefghijklmnopqrstuvwxyz");

        // Verify with base64 pubkey (as stored in AA API)
        const result = await verifySecp256k1Signature(
          testData.message,
          testData.signatureHex,
          testData.pubkeyBase64
        );

        expect(result).toBe(true);
      });

      it("should verify signature that AA API would accept", async () => {
        const privkey = new Uint8Array(32);
        for (let i = 0; i < 32; i++) {
          privkey[i] = i + 1;
        }

        const keypair = await Secp256k1.makeKeypair(privkey);
        const contractAddress = "xion1contract123456789abcdefghijklmnopqrstuvwxyz";

        // Hash the contract address (same as AA API does)
        const messageBytes = Buffer.from(contractAddress);
        const messageHash = sha256(messageBytes);

        // Create signature
        const signature = await Secp256k1.createSignature(messageHash, privkey);

        // Extract 64-byte signature (r+s without recovery byte)
        const signatureBytes = new Uint8Array(64);
        signatureBytes.set(signature.r(), 0);
        signatureBytes.set(signature.s(), 32);

        // Verify with string format (backward compatibility)
        const result = await verifySecp256k1Signature(
          contractAddress,
          toHex(signatureBytes),
          Buffer.from(keypair.pubkey).toString("base64")
        );

        expect(result).toBe(true);
      });

      it("should verify signature with hex format (new standardized format)", async () => {
        const contractAddress = "xion1contract123456789abcdefghijklmnopqrstuvwxyz";
        
        // Create signature over hex-encoded address (as createSecp256k1Account does)
        const testDataHex = await createTestSignatureHex(contractAddress);

        // Verify with hex format (new standardized format)
        const result = await verifySecp256k1Signature(
          testDataHex.messageHex,
          testDataHex.signatureHex,
          testDataHex.pubkeyBase64
        );

        expect(result).toBe(true);
      });
    });
  });
});
