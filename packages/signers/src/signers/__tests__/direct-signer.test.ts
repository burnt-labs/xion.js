import { describe, it, expect, vi, beforeEach } from "vitest";
import { AADirectSigner, SignArbitraryFn } from "../direct-signer";
import { SignDoc } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { OfflineDirectSigner } from "@cosmjs/proto-signing";
import { StdSignature } from "@cosmjs/amino";
import { AAAlgo } from "../../interfaces";

describe("direct-signer.ts - AADirectSigner", () => {
  // Mock data
  const mockAbstractAccount = "xion1test123abstractaccount456789";
  const mockAuthenticatorIndex = 1;
  const mockSignerAddress = "xion1signer123wallet456789";
  const mockChainId = "xion-testnet-1";
  const mockSignature = "mocksignature123base64encoded==";
  const mockPubkey = "mockpubkey123base64encoded==";

  // Helper to create a mock SignDoc
  const createMockSignDoc = (): SignDoc => ({
    bodyBytes: new Uint8Array([1, 2, 3, 4, 5]),
    authInfoBytes: new Uint8Array([6, 7, 8, 9, 10]),
    chainId: mockChainId,
    accountNumber: BigInt(123),
  });

  // Helper to create a mock signer
  const createMockSigner = (
    accountCount: number = 1,
  ): Pick<OfflineDirectSigner, "getAccounts"> => ({
    getAccounts: vi.fn().mockResolvedValue(
      Array.from({ length: accountCount }, (_, i) => ({
        address: i === 0 ? mockSignerAddress : `xion1signer${i}`,
        algo: "secp256k1" as const,
        pubkey: new Uint8Array([10, 20, 30, 40, 50]),
      })),
    ),
  });

  // Helper to create a mock signArbitrary function
  const createMockSignArbFn = (
    signature: string = mockSignature,
    pubkey: string = mockPubkey,
  ): SignArbitraryFn => {
    return vi.fn().mockResolvedValue({
      signature,
      pub_key: {
        type: "tendermint/PubKeySecp256k1",
        value: pubkey,
      },
    } as StdSignature);
  };

  describe("🔴 CRITICAL: Correct Signature Generation", () => {
    it("should generate correct signature using signArbitrary function", async () => {
      const mockSignArbFn = createMockSignArbFn();
      const mockSigner = createMockSigner();
      const signer = new AADirectSigner(
        mockSigner,
        mockAbstractAccount,
        mockAuthenticatorIndex,
        mockSignArbFn,
      );

      const signDoc = createMockSignDoc();
      const result = await signer.signDirect(mockAbstractAccount, signDoc);

      // Verify signArbFn was called with correct parameters
      expect(mockSignArbFn).toHaveBeenCalledTimes(1);
      expect(mockSignArbFn).toHaveBeenCalledWith(
        mockChainId,
        mockAbstractAccount,
        expect.any(Uint8Array), // signBytes
      );

      // Verify signature structure
      expect(result.signature.signature).toBe(mockSignature);
      expect(result.signature.pub_key.type).toBe("tendermint/PubKeySecp256k1");
      expect(result.signature.pub_key.value).toBe("");
      expect(result.signed).toBe(signDoc);
    });

    it("should pass correct signBytes to signArbitrary function", async () => {
      const mockSignArbFn = createMockSignArbFn();
      const mockSigner = createMockSigner();
      const signer = new AADirectSigner(
        mockSigner,
        mockAbstractAccount,
        mockAuthenticatorIndex,
        mockSignArbFn,
      );

      const signDoc = createMockSignDoc();
      await signer.signDirect(mockAbstractAccount, signDoc);

      // Extract the signBytes argument
      const callArgs = (mockSignArbFn as any).mock.calls[0];
      const signBytes = callArgs[2] as Uint8Array;

      // Verify signBytes is a Uint8Array and contains data
      expect(signBytes).toBeInstanceOf(Uint8Array);
      expect(signBytes.length).toBeGreaterThan(0);
    });

    it("should use chainId from SignDoc", async () => {
      const mockSignArbFn = createMockSignArbFn();
      const mockSigner = createMockSigner();
      const signer = new AADirectSigner(
        mockSigner,
        mockAbstractAccount,
        mockAuthenticatorIndex,
        mockSignArbFn,
      );

      const customChainId = "xion-mainnet-1";
      const signDoc = {
        ...createMockSignDoc(),
        chainId: customChainId,
      };

      await signer.signDirect(mockAbstractAccount, signDoc);

      expect(mockSignArbFn).toHaveBeenCalledWith(
        customChainId,
        expect.any(String),
        expect.any(Uint8Array),
      );
    });

    it("should preserve original SignDoc in response", async () => {
      const mockSignArbFn = createMockSignArbFn();
      const mockSigner = createMockSigner();
      const signer = new AADirectSigner(
        mockSigner,
        mockAbstractAccount,
        mockAuthenticatorIndex,
        mockSignArbFn,
      );

      const signDoc = createMockSignDoc();
      const result = await signer.signDirect(mockAbstractAccount, signDoc);

      // Verify SignDoc is returned unchanged
      expect(result.signed).toBe(signDoc);
      expect(result.signed.chainId).toBe(signDoc.chainId);
      expect(result.signed.accountNumber).toBe(signDoc.accountNumber);
    });

    it("should always set pub_key.value to empty string", async () => {
      const mockSignArbFn = createMockSignArbFn();
      const mockSigner = createMockSigner();
      const signer = new AADirectSigner(
        mockSigner,
        mockAbstractAccount,
        mockAuthenticatorIndex,
        mockSignArbFn,
      );

      const signDoc = createMockSignDoc();
      const result = await signer.signDirect(mockAbstractAccount, signDoc);

      // As per comment in implementation: "This doesn't matter. All we need is signature below"
      expect(result.signature.pub_key.value).toBe("");
    });
  });

  describe("🔴 CRITICAL: Account Data Structure Correctness", () => {
    it("should return correct account data structure", async () => {
      const mockSigner = createMockSigner();
      const signer = new AADirectSigner(
        mockSigner,
        mockAbstractAccount,
        mockAuthenticatorIndex,
        createMockSignArbFn(),
      );

      const accounts = await signer.getAccounts();

      expect(accounts).toHaveLength(1);
      const account = accounts[0];

      // Verify all required fields are present
      expect(account.address).toBe(mockAbstractAccount);
      expect(account.algo).toBe("secp256k1");
      expect(account.pubkey).toBeInstanceOf(Uint8Array);
      expect(account.pubkey.length).toBe(0); // Should be empty
      expect(account.authenticatorId).toBe(mockAuthenticatorIndex);
      expect(account.accountAddress).toBe(mockSignerAddress);
      expect(account.aaalgo).toBe(AAAlgo.Secp256K1);
    });

    it("should use abstract account address, not signer address", async () => {
      const mockSigner = createMockSigner();
      const signer = new AADirectSigner(
        mockSigner,
        mockAbstractAccount,
        mockAuthenticatorIndex,
        createMockSignArbFn(),
      );

      const accounts = await signer.getAccounts();

      // The account.address should be the abstract account, not the signer's wallet address
      expect(accounts[0].address).toBe(mockAbstractAccount);
      expect(accounts[0].address).not.toBe(mockSignerAddress);

      // But accountAddress should be the signer's wallet address
      expect(accounts[0].accountAddress).toBe(mockSignerAddress);
    });

    it("should return empty pubkey as per AA specification", async () => {
      const mockSigner = createMockSigner();
      const signer = new AADirectSigner(
        mockSigner,
        mockAbstractAccount,
        mockAuthenticatorIndex,
        createMockSignArbFn(),
      );

      const accounts = await signer.getAccounts();

      // As per AASigner interface: "pubKey should be set to an empty Uint8Array"
      expect(accounts[0].pubkey).toBeInstanceOf(Uint8Array);
      expect(accounts[0].pubkey.length).toBe(0);
    });

    it("should always set algo to secp256k1", async () => {
      const mockSigner = createMockSigner();
      const signer = new AADirectSigner(
        mockSigner,
        mockAbstractAccount,
        mockAuthenticatorIndex,
        createMockSignArbFn(),
      );

      const accounts = await signer.getAccounts();

      // As per comment: "we don't really care about this"
      expect(accounts[0].algo).toBe("secp256k1");
    });

    it("should correctly map AAAlgo.Secp256K1", async () => {
      const mockSigner = createMockSigner();
      const signer = new AADirectSigner(
        mockSigner,
        mockAbstractAccount,
        mockAuthenticatorIndex,
        createMockSignArbFn(),
      );

      const accounts = await signer.getAccounts();

      expect(accounts[0].aaalgo).toBe(AAAlgo.Secp256K1);
      // Verify enum mapping
      expect(AAAlgo.Secp256K1).toBe("secp256k1");
    });
  });

  describe("🔴 CRITICAL: Authenticator Index Handling", () => {
    it("should use provided authenticator index", async () => {
      const customIndex = 42;
      const mockSigner = createMockSigner();
      const signer = new AADirectSigner(
        mockSigner,
        mockAbstractAccount,
        customIndex,
        createMockSignArbFn(),
      );

      const accounts = await signer.getAccounts();

      expect(accounts[0].authenticatorId).toBe(customIndex);
    });

    it("should handle authenticator index 0", async () => {
      const mockSigner = createMockSigner();
      const signer = new AADirectSigner(
        mockSigner,
        mockAbstractAccount,
        0,
        createMockSignArbFn(),
      );

      const accounts = await signer.getAccounts();

      expect(accounts[0].authenticatorId).toBe(0);
    });

    it("should handle large authenticator index", async () => {
      const largeIndex = 999999;
      const mockSigner = createMockSigner();
      const signer = new AADirectSigner(
        mockSigner,
        mockAbstractAccount,
        largeIndex,
        createMockSignArbFn(),
      );

      const accounts = await signer.getAccounts();

      expect(accounts[0].authenticatorId).toBe(largeIndex);
    });

    it("should store authenticator index as public property", () => {
      const mockSigner = createMockSigner();
      const signer = new AADirectSigner(
        mockSigner,
        mockAbstractAccount,
        mockAuthenticatorIndex,
        createMockSignArbFn(),
      );

      expect(signer.accountAuthenticatorIndex).toBe(mockAuthenticatorIndex);
    });
  });

  describe("🔴 CRITICAL: Error Handling for Invalid Signers", () => {
    it("should throw error if abstractAccount is undefined", async () => {
      const mockSigner = createMockSigner();
      const signer = new AADirectSigner(
        mockSigner,
        undefined as any, // TypeScript bypass to test runtime behavior
        mockAuthenticatorIndex,
        createMockSignArbFn(),
      );

      await expect(signer.getAccounts()).rejects.toThrow(
        /Abstract account address is required but was undefined/,
      );
      expect(mockSigner.getAccounts).not.toHaveBeenCalled();
    });

    it("should throw error if signer returns no accounts", async () => {
      const mockSigner = createMockSigner(0); // No accounts
      const signer = new AADirectSigner(
        mockSigner,
        mockAbstractAccount,
        mockAuthenticatorIndex,
        createMockSignArbFn(),
      );

      await expect(signer.getAccounts()).rejects.toThrow(
        /Signer returned no accounts/,
      );
    });

    it("should handle signer getAccounts rejection", async () => {
      const mockSigner: Pick<OfflineDirectSigner, "getAccounts"> = {
        getAccounts: vi.fn().mockRejectedValue(new Error("Signer error")),
      };
      const signer = new AADirectSigner(
        mockSigner,
        mockAbstractAccount,
        mockAuthenticatorIndex,
        createMockSignArbFn(),
      );

      await expect(signer.getAccounts()).rejects.toThrow("Signer error");
    });

    it("should handle signArbitrary rejection during signing", async () => {
      const mockSignArbFn = vi
        .fn()
        .mockRejectedValue(new Error("Signing failed"));
      const mockSigner = createMockSigner();
      const signer = new AADirectSigner(
        mockSigner,
        mockAbstractAccount,
        mockAuthenticatorIndex,
        mockSignArbFn,
      );

      const signDoc = createMockSignDoc();

      await expect(
        signer.signDirect(mockAbstractAccount, signDoc),
      ).rejects.toThrow("Signing failed");
    });

    it("should handle empty signature from signArbitrary", async () => {
      const mockSignArbFn = createMockSignArbFn("", "");
      const mockSigner = createMockSigner();
      const signer = new AADirectSigner(
        mockSigner,
        mockAbstractAccount,
        mockAuthenticatorIndex,
        mockSignArbFn,
      );

      const signDoc = createMockSignDoc();
      const result = await signer.signDirect(mockAbstractAccount, signDoc);

      // Should not throw, but signature will be empty
      expect(result.signature.signature).toBe("");
    });

    it("should handle null bytes in SignDoc gracefully", async () => {
      const mockSignArbFn = createMockSignArbFn();
      const mockSigner = createMockSigner();
      const signer = new AADirectSigner(
        mockSigner,
        mockAbstractAccount,
        mockAuthenticatorIndex,
        mockSignArbFn,
      );

      // SignDoc with null bytes (makeSignBytes handles this without throwing)
      const signDocWithNulls = {
        bodyBytes: null,
        authInfoBytes: null,
        chainId: mockChainId,
        accountNumber: BigInt(0),
      } as any;

      // makeSignBytes in CosmJS handles null gracefully
      const result = await signer.signDirect(
        mockAbstractAccount,
        signDocWithNulls,
      );

      expect(result.signature.signature).toBe(mockSignature);
      expect(mockSignArbFn).toHaveBeenCalled();
    });
  });

  describe("🔴 CRITICAL: Multiple Account Handling (Edge Case)", () => {
    it("should throw error when signer returns multiple accounts", async () => {
      const mockSigner = createMockSigner(3); // 3 accounts
      const signer = new AADirectSigner(
        mockSigner,
        mockAbstractAccount,
        mockAuthenticatorIndex,
        createMockSignArbFn(),
      );

      await expect(signer.getAccounts()).rejects.toThrow(
        /Signer returned 3 accounts, but AADirectSigner expects exactly one account/,
      );
    });

    it("should throw error when multiple accounts exist (5 accounts)", async () => {
      const mockSigner = createMockSigner(5);
      const signer = new AADirectSigner(
        mockSigner,
        mockAbstractAccount,
        mockAuthenticatorIndex,
        createMockSignArbFn(),
      );

      await expect(signer.getAccounts()).rejects.toThrow(
        /Signer returned 5 accounts, but AADirectSigner expects exactly one account/,
      );
    });

    it("should throw error even with many accounts (10 accounts)", async () => {
      const mockSigner = createMockSigner(10);
      const signer = new AADirectSigner(
        mockSigner,
        mockAbstractAccount,
        mockAuthenticatorIndex,
        createMockSignArbFn(),
      );

      await expect(signer.getAccounts()).rejects.toThrow(
        /Signer returned 10 accounts, but AADirectSigner expects exactly one account/,
      );
    });
  });

  describe("🟡 HIGH: Constructor and Property Access", () => {
    it("should correctly initialize all properties", () => {
      const mockSigner = createMockSigner();
      const mockSignArbFn = createMockSignArbFn();
      const signer = new AADirectSigner(
        mockSigner,
        mockAbstractAccount,
        mockAuthenticatorIndex,
        mockSignArbFn,
      );

      expect(signer.signer).toBe(mockSigner);
      expect(signer.abstractAccount).toBe(mockAbstractAccount);
      expect(signer.accountAuthenticatorIndex).toBe(mockAuthenticatorIndex);
      expect(signer.signArbFn).toBe(mockSignArbFn);
    });

    it("should expose all properties as public", () => {
      const mockSigner = createMockSigner();
      const mockSignArbFn = createMockSignArbFn();
      const signer = new AADirectSigner(
        mockSigner,
        mockAbstractAccount,
        mockAuthenticatorIndex,
        mockSignArbFn,
      );

      // All properties should be accessible
      expect(signer.signer).toBeDefined();
      expect(signer.abstractAccount).toBeDefined();
      expect(signer.accountAuthenticatorIndex).toBeDefined();
      expect(signer.signArbFn).toBeDefined();
    });

    it("should inherit from AASigner base class", () => {
      const mockSigner = createMockSigner();
      const signer = new AADirectSigner(
        mockSigner,
        mockAbstractAccount,
        mockAuthenticatorIndex,
        createMockSignArbFn(),
      );

      // Should have abstract account from parent class
      expect(signer.abstractAccount).toBe(mockAbstractAccount);
    });
  });

  describe("🟡 HIGH: Edge Cases and Type Safety", () => {
    it("should handle empty SignDoc bytes", async () => {
      const mockSignArbFn = createMockSignArbFn();
      const mockSigner = createMockSigner();
      const signer = new AADirectSigner(
        mockSigner,
        mockAbstractAccount,
        mockAuthenticatorIndex,
        mockSignArbFn,
      );

      const signDoc: SignDoc = {
        bodyBytes: new Uint8Array([]),
        authInfoBytes: new Uint8Array([]),
        chainId: mockChainId,
        accountNumber: BigInt(0),
      };

      const result = await signer.signDirect(mockAbstractAccount, signDoc);

      expect(result.signature.signature).toBe(mockSignature);
      expect(mockSignArbFn).toHaveBeenCalledWith(
        mockChainId,
        mockAbstractAccount,
        expect.any(Uint8Array),
      );
    });

    it("should handle very large account numbers", async () => {
      const mockSignArbFn = createMockSignArbFn();
      const mockSigner = createMockSigner();
      const signer = new AADirectSigner(
        mockSigner,
        mockAbstractAccount,
        mockAuthenticatorIndex,
        mockSignArbFn,
      );

      const signDoc: SignDoc = {
        ...createMockSignDoc(),
        accountNumber: BigInt(Number.MAX_SAFE_INTEGER),
      };

      const result = await signer.signDirect(mockAbstractAccount, signDoc);

      expect(result.signed.accountNumber).toBe(BigInt(Number.MAX_SAFE_INTEGER));
    });

    it("should handle different chainId formats", async () => {
      const mockSignArbFn = createMockSignArbFn();
      const mockSigner = createMockSigner();
      const signer = new AADirectSigner(
        mockSigner,
        mockAbstractAccount,
        mockAuthenticatorIndex,
        mockSignArbFn,
      );

      const chainIds = [
        "xion-testnet-1",
        "xion-mainnet-1",
        "cosmos-hub-4",
        "osmosis-1",
        "",
      ];

      for (const chainId of chainIds) {
        const signDoc = { ...createMockSignDoc(), chainId };
        await signer.signDirect(mockAbstractAccount, signDoc);

        expect(mockSignArbFn).toHaveBeenCalledWith(
          chainId,
          expect.any(String),
          expect.any(Uint8Array),
        );
      }
    });

    it("should handle special characters in addresses", async () => {
      const specialAddresses = [
        "xion1" + "a".repeat(38),
        "xion1" + "0".repeat(38),
        "xion1abcdefghijklmnopqrstuvwxyz01234567890",
      ];

      for (const addr of specialAddresses) {
        const mockSigner = createMockSigner();
        const signer = new AADirectSigner(
          mockSigner,
          addr,
          mockAuthenticatorIndex,
          createMockSignArbFn(),
        );

        const accounts = await signer.getAccounts();
        expect(accounts[0].address).toBe(addr);
      }
    });
  });

  describe("🟢 MEDIUM: Integration with CosmJS DirectSecp256k1HdWallet", () => {
    it("should work with DirectSecp256k1HdWallet interface", async () => {
      // Mock a DirectSecp256k1HdWallet-like signer
      const mockWallet: Pick<OfflineDirectSigner, "getAccounts"> = {
        getAccounts: vi.fn().mockResolvedValue([
          {
            address: "xion1walletaddress",
            algo: "secp256k1" as const,
            pubkey: new Uint8Array([1, 2, 3, 4, 5]),
          },
        ]),
      };

      const signer = new AADirectSigner(
        mockWallet,
        mockAbstractAccount,
        mockAuthenticatorIndex,
        createMockSignArbFn(),
      );

      const accounts = await signer.getAccounts();

      expect(accounts[0].address).toBe(mockAbstractAccount);
      expect(accounts[0].accountAddress).toBe("xion1walletaddress");
    });

    it("should correctly interact with signer's getAccounts method", async () => {
      const getAccountsMock = vi.fn().mockResolvedValue([
        {
          address: mockSignerAddress,
          algo: "secp256k1" as const,
          pubkey: new Uint8Array([10, 20, 30]),
        },
      ]);

      const mockSigner: Pick<OfflineDirectSigner, "getAccounts"> = {
        getAccounts: getAccountsMock,
      };

      const signer = new AADirectSigner(
        mockSigner,
        mockAbstractAccount,
        mockAuthenticatorIndex,
        createMockSignArbFn(),
      );

      await signer.getAccounts();

      expect(getAccountsMock).toHaveBeenCalledTimes(1);
      expect(getAccountsMock).toHaveBeenCalledWith();
    });
  });

  describe("🔒 Security: Signature Verification", () => {
    it("should use abstract account address as signer in signArbitrary call", async () => {
      const mockSignArbFn = createMockSignArbFn();
      const mockSigner = createMockSigner();
      const signer = new AADirectSigner(
        mockSigner,
        mockAbstractAccount,
        mockAuthenticatorIndex,
        mockSignArbFn,
      );

      const signDoc = createMockSignDoc();
      await signer.signDirect(mockAbstractAccount, signDoc);

      // Second argument should be the abstract account (signer address)
      const signerAddressArg = (mockSignArbFn as any).mock.calls[0][1];
      expect(signerAddressArg).toBe(mockAbstractAccount);
    });

    it("should not leak signer wallet address in signature", async () => {
      const mockSignArbFn = createMockSignArbFn();
      const mockSigner = createMockSigner();
      const signer = new AADirectSigner(
        mockSigner,
        mockAbstractAccount,
        mockAuthenticatorIndex,
        mockSignArbFn,
      );

      const signDoc = createMockSignDoc();
      const result = await signer.signDirect(mockAbstractAccount, signDoc);

      // The pub_key should be empty (not the signer's actual pubkey)
      expect(result.signature.pub_key.value).toBe("");
    });

    it("should maintain signature integrity across multiple calls", async () => {
      const signatures = ["sig1==", "sig2==", "sig3=="];
      let callIndex = 0;

      const mockSignArbFn = vi.fn().mockImplementation(() => {
        return Promise.resolve({
          signature: signatures[callIndex++],
          pub_key: {
            type: "tendermint/PubKeySecp256k1",
            value: "pubkey",
          },
        });
      });

      const mockSigner = createMockSigner();
      const signer = new AADirectSigner(
        mockSigner,
        mockAbstractAccount,
        mockAuthenticatorIndex,
        mockSignArbFn,
      );

      const signDoc = createMockSignDoc();

      for (let i = 0; i < 3; i++) {
        const result = await signer.signDirect(mockAbstractAccount, signDoc);
        expect(result.signature.signature).toBe(signatures[i]);
      }
    });
  });

  describe("📝 Implementation Bugs/Issues Discovered", () => {
    it("POTENTIAL BUG: getAccounts does not validate abstractAccount format", async () => {
      // Invalid bech32 addresses are accepted without validation
      const invalidAddresses = [
        "invalid",
        "",
        "cosmos1invalid",
        "12345",
        "xion1",
      ];

      for (const invalidAddr of invalidAddresses) {
        const mockSigner = createMockSigner();
        const signer = new AADirectSigner(
          mockSigner,
          invalidAddr,
          mockAuthenticatorIndex,
          createMockSignArbFn(),
        );

        const accounts = await signer.getAccounts();

        // BUG: No validation occurs, invalid address is returned
        expect(accounts[0].address).toBe(invalidAddr);
      }
    });

    it("should throw error for multiple accounts (not implemented)", async () => {
      const mockSigner = createMockSigner(2);
      const signer = new AADirectSigner(
        mockSigner,
        mockAbstractAccount,
        mockAuthenticatorIndex,
        createMockSignArbFn(),
      );

      // Multiple accounts handling is not supported
      await expect(signer.getAccounts()).rejects.toThrow(
        /Signer returned 2 accounts, but AADirectSigner expects exactly one account/,
      );
    });

    it("DESIGN NOTE: pub_key.value intentionally empty", async () => {
      const mockSignArbFn = createMockSignArbFn();
      const mockSigner = createMockSigner();
      const signer = new AADirectSigner(
        mockSigner,
        mockAbstractAccount,
        mockAuthenticatorIndex,
        mockSignArbFn,
      );

      const signDoc = createMockSignDoc();
      const result = await signer.signDirect(mockAbstractAccount, signDoc);

      // This is intentional per comment: "This doesn't matter. All we need is signature below"
      expect(result.signature.pub_key.value).toBe("");
    });
  });
});
