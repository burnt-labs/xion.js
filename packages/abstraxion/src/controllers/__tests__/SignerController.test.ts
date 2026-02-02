/**
 * Unit tests for SignerController direct signing (signWithMetaAccount)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the external dependencies
vi.mock("@burnt-labs/signers", () => ({
  AAClient: {
    connectWithSigner: vi.fn(),
  },
  createSignerFromSigningFunction: vi.fn(),
  AUTHENTICATOR_TYPE: {
    EthWallet: "EthWallet",
    Secp256K1: "Secp256K1",
    Passkey: "Passkey",
    JWT: "JWT",
  },
}));

vi.mock("@cosmjs/stargate", () => ({
  GasPrice: {
    fromString: vi.fn((str: string) => ({ toString: () => str })),
  },
}));

vi.mock("@burnt-labs/account-management", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@burnt-labs/account-management")>();
  return {
    ...actual,
    ConnectionOrchestrator: vi.fn().mockImplementation(() => ({
      restoreSession: vi.fn().mockResolvedValue({ restored: false }),
      connectAndSetup: vi.fn(),
    })),
    isSessionRestorationError: vi.fn().mockReturnValue(false),
    isSessionRestored: vi.fn().mockReturnValue(false),
    getAccountInfoFromRestored: vi.fn(),
  };
});

import { SignerController } from "../SignerController";
import type { SignerControllerConfig } from "../SignerController";
import type { ConnectorConnectionResult } from "@burnt-labs/abstraxion-core";
import {
  AAClient,
  createSignerFromSigningFunction,
} from "@burnt-labs/signers";

describe("SignerController", () => {
  const mockSessionManager = {
    getLocalKeypair: vi.fn().mockResolvedValue(undefined),
    generateAndStoreTempAccount: vi.fn(),
    getGranter: vi.fn(),
    setGranter: vi.fn(),
    authenticate: vi.fn(),
    logout: vi.fn(),
  };

  const mockStorageStrategy = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  };

  const mockAccountStrategy = {
    findAccount: vi.fn(),
    strategies: [],
  };

  const createController = (): SignerController => {
    const config: SignerControllerConfig = {
      chainId: "xion-testnet-1",
      rpcUrl: "https://rpc.xion-testnet-1.burnt.com",
      gasPrice: "0.001uxion",
      signer: {
        type: "signer",
        aaApiUrl: "https://aa-api.burnt.com",
        getSignerConfig: vi.fn(),
        smartAccountContract: {
          codeId: 1,
          checksum: "test-checksum",
          addressPrefix: "xion",
        },
      },
      accountStrategy: mockAccountStrategy,
      sessionManager: mockSessionManager,
      storageStrategy: mockStorageStrategy,
    };

    return new SignerController(config);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("signWithMetaAccount", () => {
    it("should throw error when connectionInfo is not available", async () => {
      const controller = createController();

      await expect(
        controller.signWithMetaAccount(
          "xion1abc123",
          [{ typeUrl: "/cosmos.bank.v1beta1.MsgSend", value: {} }],
          "auto",
        ),
      ).rejects.toThrow(
        "No authenticator available for direct signing. Please reconnect your wallet.",
      );
    });

    it("should throw error when authenticatorType is missing from connectionInfo", async () => {
      const controller = createController();

      // Simulate a connection by setting connectionInfo without authenticatorType
      // Access private property for testing
      (controller as unknown as { connectionInfo: ConnectorConnectionResult }).connectionInfo = {
        authenticator: "0x1234567890abcdef",
        signMessage: vi.fn(),
        metadata: {
          authenticatorIndex: 0,
          // authenticatorType is intentionally missing
        },
      };

      await expect(
        controller.signWithMetaAccount(
          "xion1abc123",
          [{ typeUrl: "/cosmos.bank.v1beta1.MsgSend", value: {} }],
          "auto",
        ),
      ).rejects.toThrow(
        "Authenticator type not found in connection metadata. Please reconnect your wallet.",
      );
    });

    it("should create AAClient and sign transaction when connectionInfo is valid", async () => {
      const controller = createController();

      // Mock signAndBroadcast
      const mockSignAndBroadcast = vi.fn().mockResolvedValue({
        code: 0,
        transactionHash: "0xabc123",
      });

      // Mock AAClient.connectWithSigner
      (AAClient.connectWithSigner as ReturnType<typeof vi.fn>).mockResolvedValue({
        signAndBroadcast: mockSignAndBroadcast,
      });

      // Mock createSignerFromSigningFunction
      const mockSigner = { type: "mock-signer" };
      (createSignerFromSigningFunction as ReturnType<typeof vi.fn>).mockReturnValue(mockSigner);

      // Set up valid connectionInfo
      const mockSignMessage = vi.fn().mockResolvedValue("0xsignature");
      (controller as unknown as { connectionInfo: ConnectorConnectionResult }).connectionInfo = {
        authenticator: "0x1234567890abcdef",
        signMessage: mockSignMessage,
        metadata: {
          authenticatorIndex: 1,
          authenticatorType: "EthWallet",
        },
      };

      const messages = [
        { typeUrl: "/cosmos.bank.v1beta1.MsgSend", value: {} },
      ];
      const fee = { amount: [{ denom: "uxion", amount: "1000" }], gas: "200000" };
      const memo = "Test memo";

      const result = await controller.signWithMetaAccount(
        "xion1abc123",
        messages,
        fee,
        memo,
      );

      // Verify createSignerFromSigningFunction was called with correct params
      expect(createSignerFromSigningFunction).toHaveBeenCalledWith({
        smartAccountAddress: "xion1abc123",
        authenticatorIndex: 1,
        authenticatorType: "EthWallet",
        signMessage: mockSignMessage,
      });

      // Verify AAClient.connectWithSigner was called
      expect(AAClient.connectWithSigner).toHaveBeenCalledWith(
        "https://rpc.xion-testnet-1.burnt.com",
        mockSigner,
        expect.objectContaining({
          gasPrice: expect.anything(),
        }),
      );

      // Verify signAndBroadcast was called with correct params
      expect(mockSignAndBroadcast).toHaveBeenCalledWith(
        "xion1abc123",
        messages,
        fee,
        memo,
      );

      // Verify result
      expect(result).toEqual({
        code: 0,
        transactionHash: "0xabc123",
      });
    });

    it("should use default authenticatorIndex of 0 when not provided", async () => {
      const controller = createController();

      const mockSignAndBroadcast = vi.fn().mockResolvedValue({
        code: 0,
        transactionHash: "0xabc123",
      });

      (AAClient.connectWithSigner as ReturnType<typeof vi.fn>).mockResolvedValue({
        signAndBroadcast: mockSignAndBroadcast,
      });

      const mockSigner = { type: "mock-signer" };
      (createSignerFromSigningFunction as ReturnType<typeof vi.fn>).mockReturnValue(mockSigner);

      // Set up connectionInfo without authenticatorIndex
      const mockSignMessage = vi.fn().mockResolvedValue("0xsignature");
      (controller as unknown as { connectionInfo: ConnectorConnectionResult }).connectionInfo = {
        authenticator: "base64pubkey",
        signMessage: mockSignMessage,
        metadata: {
          authenticatorType: "Secp256K1",
          // authenticatorIndex not provided
        },
      };

      await controller.signWithMetaAccount(
        "xion1abc123",
        [{ typeUrl: "/cosmos.bank.v1beta1.MsgSend", value: {} }],
        "auto",
      );

      // Verify authenticatorIndex defaults to 0
      expect(createSignerFromSigningFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          authenticatorIndex: 0,
        }),
      );
    });
  });

  describe("connectionInfo lifecycle", () => {
    it("should clear connectionInfo on disconnect", async () => {
      const controller = createController();

      // Set up connectionInfo
      (controller as unknown as { connectionInfo: ConnectorConnectionResult }).connectionInfo = {
        authenticator: "0x1234567890abcdef",
        signMessage: vi.fn(),
        metadata: {
          authenticatorIndex: 0,
          authenticatorType: "EthWallet",
        },
      };

      // Disconnect
      await controller.disconnect();

      // Verify connectionInfo is cleared
      await expect(
        controller.signWithMetaAccount(
          "xion1abc123",
          [{ typeUrl: "/cosmos.bank.v1beta1.MsgSend", value: {} }],
          "auto",
        ),
      ).rejects.toThrow(
        "No authenticator available for direct signing. Please reconnect your wallet.",
      );
    });
  });
});
