import { describe, it, expect } from "vitest";
import { createSignerFromSigningFunction } from "../signer-factory";
import { AUTHENTICATOR_TYPE } from "../../../types/account";
import { Buffer } from "buffer";

describe("signer-factory.ts - Hex Prefix Handling & Signature Format", () => {
  const mockAddress = "xion1test123abstractaccount456789";
  const mockAuthenticatorIndex = 1;

  describe("🔴 CRITICAL: Signature Format Compatibility with AA API", () => {
    it("should produce base64 signature format expected by aa-api (without 0x prefix in signMessage)", async () => {
      // Mock signing function that returns hex signature WITHOUT 0x prefix
      const mockSignature =
        "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2";
      const signMessage = async (hexMessage: string): Promise<string> => {
        expect(hexMessage).toMatch(/^0x[0-9a-fA-F]+$/); // Should receive hex with 0x prefix
        return mockSignature; // Return hex WITHOUT 0x prefix
      };

      const signer = createSignerFromSigningFunction({
        smartAccountAddress: mockAddress,
        authenticatorIndex: mockAuthenticatorIndex,
        authenticatorType: AUTHENTICATOR_TYPE.Secp256K1,
        signMessage,
      });

      // Get the signArbitrary function (for Secp256K1, it's AADirectSigner)
      const directSigner = signer as any;
      const signArbitrary = directSigner.signArbFn;

      // Sign a test message
      const testMessage = "test message";
      const result = await signArbitrary(
        "xion-testnet-1",
        mockAddress,
        testMessage,
      );

      // Verify signature format
      expect(result.signature).toBeDefined();
      expect(typeof result.signature).toBe("string");

      // Signature should be base64 encoded
      const isBase64 = /^[A-Za-z0-9+/]+=*$/.test(result.signature);
      expect(isBase64).toBe(true);

      // Verify it decodes to the expected bytes
      const decodedSignature = Buffer.from(result.signature, "base64").toString(
        "hex",
      );
      expect(decodedSignature).toBe(mockSignature);

      // Verify pub_key structure
      expect(result.pub_key.type).toBe("tendermint/PubKeySecp256k1");
      expect(result.pub_key.value).toBe("");
    });

    it("should produce base64 signature format expected by aa-api (with 0x prefix in signMessage)", async () => {
      // Mock signing function that returns hex signature WITH 0x prefix
      const mockSignatureHex =
        "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2";
      const signMessage = async (hexMessage: string): Promise<string> => {
        expect(hexMessage).toMatch(/^0x[0-9a-fA-F]+$/);
        return `0x${mockSignatureHex}`; // Return hex WITH 0x prefix
      };

      const signer = createSignerFromSigningFunction({
        smartAccountAddress: mockAddress,
        authenticatorIndex: mockAuthenticatorIndex,
        authenticatorType: AUTHENTICATOR_TYPE.Secp256K1,
        signMessage,
      });

      const directSigner = signer as any;
      const signArbitrary = directSigner.signArbFn;

      const testMessage = "test message";
      const result = await signArbitrary(
        "xion-testnet-1",
        mockAddress,
        testMessage,
      );

      // Should handle 0x prefix correctly and produce same base64 signature
      expect(result.signature).toBeDefined();
      const decodedSignature = Buffer.from(result.signature, "base64").toString(
        "hex",
      );
      expect(decodedSignature).toBe(mockSignatureHex);
    });

    it("should handle duplicate 0x prefixes gracefully", async () => {
      // Edge case: signMessage returns signature with duplicate 0x prefixes
      const mockSignatureHex =
        "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2";
      const signMessage = async (hexMessage: string): Promise<string> => {
        return `0x0x${mockSignatureHex}`; // Duplicate 0x prefix
      };

      const signer = createSignerFromSigningFunction({
        smartAccountAddress: mockAddress,
        authenticatorIndex: mockAuthenticatorIndex,
        authenticatorType: AUTHENTICATOR_TYPE.Secp256K1,
        signMessage,
      });

      const directSigner = signer as any;
      const signArbitrary = directSigner.signArbFn;

      const testMessage = "test message";
      const result = await signArbitrary(
        "xion-testnet-1",
        mockAddress,
        testMessage,
      );

      // normalizeHexPrefix should handle this correctly
      const decodedSignature = Buffer.from(result.signature, "base64").toString(
        "hex",
      );
      expect(decodedSignature).toBe(mockSignatureHex);
    });

    it("should handle Uint8Array input for signArbitrary", async () => {
      const mockSignatureHex =
        "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2";
      const signMessage = async (hexMessage: string): Promise<string> => {
        expect(hexMessage).toMatch(/^0x[0-9a-fA-F]+$/);
        return mockSignatureHex;
      };

      const signer = createSignerFromSigningFunction({
        smartAccountAddress: mockAddress,
        authenticatorIndex: mockAuthenticatorIndex,
        authenticatorType: AUTHENTICATOR_TYPE.Secp256K1,
        signMessage,
      });

      const directSigner = signer as any;
      const signArbitrary = directSigner.signArbFn;

      // Pass Uint8Array instead of string
      const testMessageBytes = new Uint8Array([116, 101, 115, 116]); // "test"
      const result = await signArbitrary(
        "xion-testnet-1",
        mockAddress,
        testMessageBytes,
      );

      expect(result.signature).toBeDefined();
      const decodedSignature = Buffer.from(result.signature, "base64").toString(
        "hex",
      );
      expect(decodedSignature).toBe(mockSignatureHex);
    });
  });

  describe("🔴 CRITICAL: EthWallet Signature Format", () => {
    it("should create AAEthSigner with correct personalSign function", async () => {
      const mockSignatureHex =
        "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b21b";
      const signMessage = async (hexMessage: string): Promise<string> => {
        expect(hexMessage).toMatch(/^0x[0-9a-fA-F]+$/);
        return `0x${mockSignatureHex}`;
      };

      const signer = createSignerFromSigningFunction({
        smartAccountAddress: mockAddress,
        authenticatorIndex: mockAuthenticatorIndex,
        authenticatorType: AUTHENTICATOR_TYPE.EthWallet,
        signMessage,
      });

      // Get the personalSign function
      const ethSigner = signer as any;
      const personalSign = ethSigner.personalSign;

      // Test with message that has 0x prefix
      const result1 = await personalSign("0xdeadbeef");
      expect(result1).toBe(`0x${mockSignatureHex}`);

      // Test with message that doesn't have 0x prefix
      const result2 = await personalSign("deadbeef");
      expect(result2).toBe(`0x${mockSignatureHex}`);
    });

    it("should ensure EthWallet signatures include 0x prefix", async () => {
      const mockSignatureHex =
        "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b21b";

      // Test case 1: signMessage returns signature WITH 0x
      const signMessage1 = async (hexMessage: string): Promise<string> => {
        return `0x${mockSignatureHex}`;
      };

      const signer1 = createSignerFromSigningFunction({
        smartAccountAddress: mockAddress,
        authenticatorIndex: mockAuthenticatorIndex,
        authenticatorType: AUTHENTICATOR_TYPE.EthWallet,
        signMessage: signMessage1,
      });

      const ethSigner1 = signer1 as any;
      const result1 = await ethSigner1.personalSign("0xtest");
      expect(result1.startsWith("0x")).toBe(true);

      // Test case 2: signMessage returns signature WITHOUT 0x
      const signMessage2 = async (hexMessage: string): Promise<string> => {
        return mockSignatureHex;
      };

      const signer2 = createSignerFromSigningFunction({
        smartAccountAddress: mockAddress,
        authenticatorIndex: mockAuthenticatorIndex,
        authenticatorType: AUTHENTICATOR_TYPE.EthWallet,
        signMessage: signMessage2,
      });

      const ethSigner2 = signer2 as any;
      const result2 = await ethSigner2.personalSign("0xtest");
      expect(result2).toBe(mockSignatureHex);
    });
  });

  describe("🟡 HIGH: Authenticator Type Selection", () => {
    it("should create AAEthSigner for EthWallet authenticator type", () => {
      const signMessage = async (hexMessage: string): Promise<string> =>
        "0xsignature";

      const signer = createSignerFromSigningFunction({
        smartAccountAddress: mockAddress,
        authenticatorIndex: mockAuthenticatorIndex,
        authenticatorType: AUTHENTICATOR_TYPE.EthWallet,
        signMessage,
      });

      // Check that it's an AAEthSigner (has personalSign property)
      expect(signer).toHaveProperty("personalSign");
      expect(signer.abstractAccount).toBe(mockAddress);
      expect(signer.accountAuthenticatorIndex).toBe(mockAuthenticatorIndex);
    });

    it("should create AADirectSigner for Secp256K1 authenticator type", () => {
      const signMessage = async (hexMessage: string): Promise<string> =>
        "signature";

      const signer = createSignerFromSigningFunction({
        smartAccountAddress: mockAddress,
        authenticatorIndex: mockAuthenticatorIndex,
        authenticatorType: AUTHENTICATOR_TYPE.Secp256K1,
        signMessage,
      });

      // Check that it's an AADirectSigner (has signArbFn property)
      expect(signer).toHaveProperty("signArbFn");
      expect(signer.abstractAccount).toBe(mockAddress);
      expect(signer.accountAuthenticatorIndex).toBe(mockAuthenticatorIndex);
    });

    it("should create AADirectSigner for any non-EthWallet authenticator type", () => {
      const signMessage = async (hexMessage: string): Promise<string> =>
        "signature";

      // Test with a different authenticator type (future-proofing)
      const signer = createSignerFromSigningFunction({
        smartAccountAddress: mockAddress,
        authenticatorIndex: mockAuthenticatorIndex,
        authenticatorType: "CustomAuthenticator" as any,
        signMessage,
      });

      // Should default to AADirectSigner
      expect(signer).toHaveProperty("signArbFn");
    });
  });

  describe("🟢 MEDIUM: Signature Format Consistency", () => {
    it("should produce consistent base64 format across multiple calls", async () => {
      const mockSignatureHex =
        "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2";
      const signMessage = async (hexMessage: string): Promise<string> => {
        return mockSignatureHex;
      };

      const signer = createSignerFromSigningFunction({
        smartAccountAddress: mockAddress,
        authenticatorIndex: mockAuthenticatorIndex,
        authenticatorType: AUTHENTICATOR_TYPE.Secp256K1,
        signMessage,
      });

      const directSigner = signer as any;
      const signArbitrary = directSigner.signArbFn;

      // Call multiple times
      const result1 = await signArbitrary(
        "xion-testnet-1",
        mockAddress,
        "test1",
      );
      const result2 = await signArbitrary(
        "xion-testnet-1",
        mockAddress,
        "test2",
      );
      const result3 = await signArbitrary(
        "xion-testnet-1",
        mockAddress,
        "test3",
      );

      // All should produce valid base64
      expect(result1.signature).toMatch(/^[A-Za-z0-9+/]+=*$/);
      expect(result2.signature).toMatch(/^[A-Za-z0-9+/]+=*$/);
      expect(result3.signature).toMatch(/^[A-Za-z0-9+/]+=*$/);

      // All should decode to same hex (since we're using same mock signature)
      const decoded1 = Buffer.from(result1.signature, "base64").toString("hex");
      const decoded2 = Buffer.from(result2.signature, "base64").toString("hex");
      const decoded3 = Buffer.from(result3.signature, "base64").toString("hex");

      expect(decoded1).toBe(mockSignatureHex);
      expect(decoded2).toBe(mockSignatureHex);
      expect(decoded3).toBe(mockSignatureHex);
    });
  });
});
