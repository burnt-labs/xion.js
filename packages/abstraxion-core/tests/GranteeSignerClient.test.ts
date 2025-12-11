/**
 * Minimal edge case tests for GranteeSignerClient (legacy code)
 *
 * Note: This is old legacy code with simple logic
 * These tests focus on constructor validation and basic edge cases only
 */

import { describe, it, expect, vi } from "vitest";
import { GranteeSignerClient } from "../src/GranteeSignerClient";
import type { OfflineSigner } from "@cosmjs/proto-signing";
import type { CometClient } from "@cosmjs/tendermint-rpc";

describe("GranteeSignerClient - Edge Cases", () => {
  const mockSigner: OfflineSigner = {
    getAccounts: vi.fn().mockResolvedValue([
      {
        address: "xion1grantee",
        pubkey: new Uint8Array([1, 2, 3]),
        algo: "secp256k1" as const,
      },
    ]),
  };

  const mockCometClient = {
    status: vi.fn(),
    disconnect: vi.fn(),
  } as unknown as CometClient;

  describe("Constructor Validation", () => {
    it("should throw if granterAddress is undefined", () => {
      expect(() => {
        GranteeSignerClient.createWithSigner(mockCometClient, mockSigner, {
          granterAddress: undefined as any,
          granteeAddress: "xion1grantee",
        });
      }).toThrow("granterAddress is required");
    });

    it("should throw if granteeAddress is undefined", () => {
      expect(() => {
        GranteeSignerClient.createWithSigner(mockCometClient, mockSigner, {
          granterAddress: "xion1granter",
          granteeAddress: undefined as any,
        });
      }).toThrow("granteeAddress is required");
    });

    it("should accept valid granter and grantee addresses", () => {
      expect(() => {
        GranteeSignerClient.createWithSigner(mockCometClient, mockSigner, {
          granterAddress: "xion1granter",
          granteeAddress: "xion1grantee",
        });
      }).not.toThrow();
    });
  });

  describe("Getter Methods", () => {
    it("should return correct granteeAddress", () => {
      const client = GranteeSignerClient.createWithSigner(
        mockCometClient,
        mockSigner,
        {
          granterAddress: "xion1granter",
          granteeAddress: "xion1grantee",
        },
      );

      expect(client.granteeAddress).toBe("xion1grantee");
    });

    it("should return grantee account data from signer", async () => {
      const client = GranteeSignerClient.createWithSigner(
        mockCometClient,
        mockSigner,
        {
          granterAddress: "xion1granter",
          granteeAddress: "xion1grantee",
        },
      );

      const accountData = await client.getGranteeAccountData();

      expect(accountData).toBeDefined();
      expect(accountData?.address).toBe("xion1grantee");
    });

    it("should return undefined if grantee not found in signer accounts", async () => {
      const signerWithoutMatch: OfflineSigner = {
        getAccounts: vi.fn().mockResolvedValue([
          {
            address: "xion1different",
            pubkey: new Uint8Array([1, 2, 3]),
            algo: "secp256k1" as const,
          },
        ]),
      };

      const client = GranteeSignerClient.createWithSigner(
        mockCometClient,
        signerWithoutMatch,
        {
          granterAddress: "xion1granter",
          granteeAddress: "xion1grantee",
        },
      );

      const accountData = await client.getGranteeAccountData();

      expect(accountData).toBeUndefined();
    });
  });
});
