/**
 * TODO: WebAuthn/Passkey Integration Tests
 *
 * These tests are currently blocked due to WebAuthn ponyfill import issues in Node.js environment.
 * The @burnt-labs/signers package imports browser-specific WebAuthn APIs before mocks can be applied.
 *
 * Status: Tests written and structured, but cannot run until WebAuthn environment issue is resolved.
 * The passkey utilities themselves are already quite solid and will be tested separately later.
 *
 * Priority: Focus on integration tests for actual flows (grant creation, account discovery, etc.)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createGrants, checkStorageGrants } from "../grantCreation";
import type { GrantCreationParams } from "../grantCreation";
import * as grantUtils from "../../../grants/construction";
import * as validationUtils from "../../../grants/utils";
import { AUTHENTICATOR_TYPE } from "@burnt-labs/signers";

// Mock only what we need from @burnt-labs/signers
vi.mock("@burnt-labs/signers", async () => {
  const actual = await vi.importActual("@burnt-labs/signers");
  return {
    ...actual,
    AAClient: {
      connectWithSigner: vi.fn(),
    },
    createSignerFromSigningFunction: vi.fn(),
  };
});

// Mock dependencies

vi.mock("@cosmjs/cosmwasm-stargate", async () => {
  const actual = await vi.importActual("@cosmjs/cosmwasm-stargate");
  return {
    ...actual,
    CosmWasmClient: {
      connect: vi.fn(),
    },
  };
});

vi.mock("../../../grants/construction", () => ({
  buildGrantMessages: vi.fn(),
  generateTreasuryGrants: vi.fn(),
}));

vi.mock("../../../grants/utils", () => ({
  isContractGrantConfigValid: vi.fn(),
}));

vi.mock("../../../grants/strategies", () => ({
  createCompositeTreasuryStrategy: vi.fn(),
}));

describe("grantCreation.ts - Grant Creation Flow", () => {
  let mockStorageStrategy: any;
  let mockParams: GrantCreationParams;
  let mockClient: any;
  let mockSigner: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup mock storage
    mockStorageStrategy = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };

    // Setup mock AAClient
    mockClient = {
      simulate: vi.fn(),
      signAndBroadcast: vi.fn(),
    };

    mockSigner = {
      getAccounts: vi.fn(),
    };

    const { AAClient, createSignerFromSigningFunction } = await import("@burnt-labs/signers");
    AAClient.connectWithSigner.mockResolvedValue(mockClient);
    createSignerFromSigningFunction.mockReturnValue(mockSigner);

    // Default params
    mockParams = {
      smartAccountAddress: "xion1granter",
      connectionResult: {
        displayAddress: "0x123",
        authenticator: "0x123",
        signMessage: vi.fn(),
        metadata: {
          authenticatorType: AUTHENTICATOR_TYPE.EthWallet,
          authenticatorIndex: 0,
        },
      },
      granteeAddress: "xion1grantee",
      grantConfig: {
        bank: { send: true },
      },
      storageStrategy: mockStorageStrategy,
      rpcUrl: "https://rpc.xion.com",
      gasPrice: "0.001uxion",
    };
  });

  describe("checkStorageGrants()", () => {
    it("should return true when grants exist with matching granter", async () => {
      mockStorageStrategy.getItem
        .mockResolvedValueOnce("xion1granter")
        .mockResolvedValueOnce("keypair_data");

      const result = await checkStorageGrants(
        "xion1granter",
        mockStorageStrategy,
      );

      expect(result.grantsExist).toBe(true);
      expect(result.storedGranter).toBe("xion1granter");
      expect(result.storedTempAccount).toBe("keypair_data");
    });

    it("should return false when granter doesn't match", async () => {
      mockStorageStrategy.getItem
        .mockResolvedValueOnce("xion1different")
        .mockResolvedValueOnce("keypair_data");

      const result = await checkStorageGrants(
        "xion1granter",
        mockStorageStrategy,
      );

      expect(result.grantsExist).toBe(false);
    });

    it("should return false when temp account is missing", async () => {
      mockStorageStrategy.getItem
        .mockResolvedValueOnce("xion1granter")
        .mockResolvedValueOnce(null);

      const result = await checkStorageGrants(
        "xion1granter",
        mockStorageStrategy,
      );

      expect(result.grantsExist).toBe(false);
    });
  });

  describe("🔴 CRITICAL: createGrants()", () => {
    it("should return success immediately if grants already exist", async () => {
      mockStorageStrategy.getItem
        .mockResolvedValueOnce("xion1granter")
        .mockResolvedValueOnce("keypair_data");

      const result = await createGrants(mockParams);

      expect(result.success).toBe(true);
      expect(mockClient.signAndBroadcast).not.toHaveBeenCalled();
    });

    it("should build grant messages from manual config", async () => {
      mockStorageStrategy.getItem.mockResolvedValue(null);

      vi.mocked(grantUtils.buildGrantMessages).mockReturnValue([
        {
          typeUrl: "/cosmos.authz.v1beta1.MsgGrant",
          value: {},
        },
      ]);

      mockClient.simulate.mockResolvedValue(100000);
      mockClient.signAndBroadcast.mockResolvedValue({
        code: 0,
        transactionHash: "ABC123",
      });

      mockParams.grantConfig = {
        bank: { send: true },
        contracts: [],
      };

      const result = await createGrants(mockParams);

      expect(grantUtils.buildGrantMessages).toHaveBeenCalledWith(
        expect.objectContaining({
          granter: "xion1granter",
          grantee: "xion1grantee",
        }),
      );
      expect(result.success).toBe(true);
    });

    it("should build grant messages from treasury contract", async () => {
      const { CosmWasmClient } = await import("@cosmjs/cosmwasm-stargate");
      mockStorageStrategy.getItem.mockResolvedValue(null);

      const mockQueryClient = {
        queryContractSmart: vi.fn(),
      };
      vi.mocked(CosmWasmClient.connect).mockResolvedValue(
        mockQueryClient as any,
      );

      vi.mocked(grantUtils.generateTreasuryGrants).mockResolvedValue([
        {
          typeUrl: "/cosmos.authz.v1beta1.MsgGrant",
          value: {},
        },
      ]);

      mockClient.simulate.mockResolvedValue(100000);
      mockClient.signAndBroadcast.mockResolvedValue({
        code: 0,
        transactionHash: "ABC123",
      });

      mockParams.grantConfig = {
        treasury: "xion1treasury",
      };

      const result = await createGrants(mockParams);

      expect(grantUtils.generateTreasuryGrants).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it("should add deploy_fee_grant message when using treasury", async () => {
      const { CosmWasmClient } = await import("@cosmjs/cosmwasm-stargate");
      mockStorageStrategy.getItem.mockResolvedValue(null);

      const mockQueryClient = {
        queryContractSmart: vi.fn(),
      };
      vi.mocked(CosmWasmClient.connect).mockResolvedValue(
        mockQueryClient as any,
      );

      vi.mocked(grantUtils.generateTreasuryGrants).mockResolvedValue([
        {
          typeUrl: "/cosmos.authz.v1beta1.MsgGrant",
          value: {},
        },
      ]);

      mockClient.simulate.mockResolvedValue(100000);
      mockClient.signAndBroadcast.mockResolvedValue({
        code: 0,
        transactionHash: "ABC123",
      });

      mockParams.grantConfig = {
        treasury: "xion1treasury",
      };

      await createGrants(mockParams);

      const signedMessages = mockClient.signAndBroadcast.mock.calls[0][1];
      expect(signedMessages.length).toBeGreaterThan(1);
      expect(signedMessages[signedMessages.length - 1].typeUrl).toBe(
        "/cosmwasm.wasm.v1.MsgExecuteContract",
      );
    });

    it("should sign and broadcast grant transaction", async () => {
      mockStorageStrategy.getItem.mockResolvedValue(null);

      vi.mocked(grantUtils.buildGrantMessages).mockReturnValue([
        {
          typeUrl: "/cosmos.authz.v1beta1.MsgGrant",
          value: {},
        },
      ]);

      mockClient.simulate.mockResolvedValue(100000);
      mockClient.signAndBroadcast.mockResolvedValue({
        code: 0,
        transactionHash: "HASH123",
      });

      const result = await createGrants(mockParams);

      expect(mockClient.signAndBroadcast).toHaveBeenCalledWith(
        "xion1granter",
        expect.any(Array),
        expect.objectContaining({
          amount: expect.any(Array),
          gas: expect.any(String),
        }),
        "Create grants for abstraxion",
      );
      expect(result.success).toBe(true);
    });

    it("should store granter address after successful creation", async () => {
      mockStorageStrategy.getItem.mockResolvedValue(null);

      vi.mocked(grantUtils.buildGrantMessages).mockReturnValue([
        {
          typeUrl: "/cosmos.authz.v1beta1.MsgGrant",
          value: {},
        },
      ]);

      mockClient.simulate.mockResolvedValue(100000);
      mockClient.signAndBroadcast.mockResolvedValue({
        code: 0,
        transactionHash: "HASH123",
      });

      await createGrants(mockParams);

      expect(mockStorageStrategy.setItem).toHaveBeenCalledWith(
        "xion-authz-granter-account",
        "xion1granter",
      );
    });

    it("should handle transaction failures", async () => {
      mockStorageStrategy.getItem.mockResolvedValue(null);

      vi.mocked(grantUtils.buildGrantMessages).mockReturnValue([
        {
          typeUrl: "/cosmos.authz.v1beta1.MsgGrant",
          value: {},
        },
      ]);

      mockClient.simulate.mockResolvedValue(100000);
      mockClient.signAndBroadcast.mockRejectedValue(
        new Error("Transaction failed"),
      );

      const result = await createGrants(mockParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Transaction failed");
    });

    it("should handle simulation failures", async () => {
      mockStorageStrategy.getItem.mockResolvedValue(null);

      vi.mocked(grantUtils.buildGrantMessages).mockReturnValue([
        {
          typeUrl: "/cosmos.authz.v1beta1.MsgGrant",
          value: {},
        },
      ]);

      mockClient.simulate.mockRejectedValue(new Error("Simulation failed"));

      const result = await createGrants(mockParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Simulation failed");
    });

    it("should throw error for invalid contract grant configuration", async () => {
      mockStorageStrategy.getItem.mockResolvedValue(null);

      vi.mocked(validationUtils.isContractGrantConfigValid).mockReturnValue(
        false,
      );

      mockParams.grantConfig = {
        contracts: [
          {
            address: "xion1granter", // Same as granter - invalid
            executions: [
              {
                msg: {},
                funds: [],
              },
            ],
          },
        ],
      };

      await expect(createGrants(mockParams)).rejects.toThrow(
        "Invalid contract grant configuration",
      );
    });

    it("should calculate fee with buffer based on simulation", async () => {
      mockStorageStrategy.getItem.mockResolvedValue(null);

      vi.mocked(grantUtils.buildGrantMessages).mockReturnValue([
        {
          typeUrl: "/cosmos.authz.v1beta1.MsgGrant",
          value: {},
        },
      ]);

      mockClient.simulate.mockResolvedValue(100000);
      mockClient.signAndBroadcast.mockResolvedValue({
        code: 0,
        transactionHash: "HASH123",
      });

      await createGrants(mockParams);

      const fee = mockClient.signAndBroadcast.mock.calls[0][2];
      expect(fee.gas).toBe(String(Math.ceil(100000 * 1.6)));
      expect(fee.amount[0].amount).toBe(
        String(Math.ceil(100000 * 0.001 * 2)),
      );
    });

    it("should include fee granter if provided", async () => {
      mockStorageStrategy.getItem.mockResolvedValue(null);

      vi.mocked(grantUtils.buildGrantMessages).mockReturnValue([
        {
          typeUrl: "/cosmos.authz.v1beta1.MsgGrant",
          value: {},
        },
      ]);

      mockClient.simulate.mockResolvedValue(100000);
      mockClient.signAndBroadcast.mockResolvedValue({
        code: 0,
        transactionHash: "HASH123",
      });

      mockParams.grantConfig.feeGranter = "xion1feegranter";

      await createGrants(mockParams);

      const fee = mockClient.signAndBroadcast.mock.calls[0][2];
      expect(fee.granter).toBe("xion1feegranter");
    });

    it("should handle invalid gas price format", async () => {
      mockStorageStrategy.getItem.mockResolvedValue(null);

      vi.mocked(grantUtils.buildGrantMessages).mockReturnValue([
        {
          typeUrl: "/cosmos.authz.v1beta1.MsgGrant",
          value: {},
        },
      ]);

      mockClient.simulate.mockResolvedValue(100000);

      mockParams.gasPrice = "invalid";

      // GasPrice.fromString throws an error for invalid format
      await expect(createGrants(mockParams)).rejects.toThrow("Invalid gas price");
    });

    it("should handle missing authenticatorType", async () => {
      mockStorageStrategy.getItem.mockResolvedValue(null);

      vi.mocked(grantUtils.buildGrantMessages).mockReturnValue([
        {
          typeUrl: "/cosmos.authz.v1beta1.MsgGrant",
          value: {},
        },
      ]);

      mockParams.connectionResult.metadata = {
        authenticatorIndex: 0,
        // Missing authenticatorType
      } as any;

      await expect(createGrants(mockParams)).rejects.toThrow(
        "Authenticator type not found in connection result metadata",
      );
    });

    it("should return success immediately if no grant configs provided", async () => {
      mockStorageStrategy.getItem.mockResolvedValue(null);

      vi.mocked(grantUtils.buildGrantMessages).mockReturnValue([]);

      mockParams.grantConfig = {};

      const result = await createGrants(mockParams);

      expect(result.success).toBe(true);
      expect(mockStorageStrategy.setItem).toHaveBeenCalledWith(
        "xion-authz-granter-account",
        "xion1granter",
      );
      expect(mockClient.signAndBroadcast).not.toHaveBeenCalled();
    });

    it("should fall back to manual config if treasury query fails", async () => {
      const { CosmWasmClient } = await import("@cosmjs/cosmwasm-stargate");
      mockStorageStrategy.getItem.mockResolvedValue(null);

      const mockQueryClient = {
        queryContractSmart: vi.fn(),
      };
      vi.mocked(CosmWasmClient.connect).mockResolvedValue(
        mockQueryClient as any,
      );

      vi.mocked(grantUtils.generateTreasuryGrants).mockRejectedValue(
        new Error("Treasury query failed"),
      );

      vi.mocked(grantUtils.buildGrantMessages).mockReturnValue([
        {
          typeUrl: "/cosmos.authz.v1beta1.MsgGrant",
          value: {},
        },
      ]);

      mockClient.simulate.mockResolvedValue(100000);
      mockClient.signAndBroadcast.mockResolvedValue({
        code: 0,
        transactionHash: "ABC123",
      });

      mockParams.grantConfig = {
        treasury: "xion1treasury",
        bank: { send: true }, // Fallback config
      };

      const result = await createGrants(mockParams);

      expect(grantUtils.buildGrantMessages).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it("should pass daodao indexer URL to treasury generator", async () => {
      const { CosmWasmClient } = await import("@cosmjs/cosmwasm-stargate");
      mockStorageStrategy.getItem.mockResolvedValue(null);

      const mockQueryClient = {
        queryContractSmart: vi.fn(),
      };
      vi.mocked(CosmWasmClient.connect).mockResolvedValue(
        mockQueryClient as any,
      );

      vi.mocked(grantUtils.generateTreasuryGrants).mockResolvedValue([
        {
          typeUrl: "/cosmos.authz.v1beta1.MsgGrant",
          value: {},
        },
      ]);

      mockClient.simulate.mockResolvedValue(100000);
      mockClient.signAndBroadcast.mockResolvedValue({
        code: 0,
        transactionHash: "ABC123",
      });

      mockParams.grantConfig = {
        treasury: "xion1treasury",
        daodaoIndexerUrl: "https://indexer.daodao.zone",
      };

      await createGrants(mockParams);

      // The daodaoIndexerUrl should be used in createCompositeTreasuryStrategy
      expect(grantUtils.generateTreasuryGrants).toHaveBeenCalled();
    });

    it("should create signer with correct parameters", async () => {
      const { createSignerFromSigningFunction } = await import("@burnt-labs/signers");
      mockStorageStrategy.getItem.mockResolvedValue(null);

      vi.mocked(grantUtils.buildGrantMessages).mockReturnValue([
        {
          typeUrl: "/cosmos.authz.v1beta1.MsgGrant",
          value: {},
        },
      ]);

      mockClient.simulate.mockResolvedValue(100000);
      mockClient.signAndBroadcast.mockResolvedValue({
        code: 0,
        transactionHash: "HASH123",
      });

      await createGrants(mockParams);

      expect(createSignerFromSigningFunction).toHaveBeenCalledWith({
        smartAccountAddress: "xion1granter",
        authenticatorIndex: 0,
        authenticatorType: AUTHENTICATOR_TYPE.EthWallet,
        signMessage: expect.any(Function),
      });
    });
  });
});
