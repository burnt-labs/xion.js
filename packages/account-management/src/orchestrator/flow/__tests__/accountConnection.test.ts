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
import { connectAccount } from "../accountConnection";
import type { AccountConnectionParams } from "../accountConnection";
import * as accountDiscovery from "../../../accounts/discovery";
import { AUTHENTICATOR_TYPE } from "@burnt-labs/signers";

// Mock dependencies
vi.mock("../../../accounts/discovery", () => ({
  checkAccountExists: vi.fn(),
}));

vi.mock("@burnt-labs/abstraxion-core", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@burnt-labs/abstraxion-core")>();
  return {
    ...actual,
    createEthWalletAccount: vi.fn(),
    createSecp256k1Account: vi.fn(),
  };
});

describe("accountConnection.ts - Account Connection Flow", () => {
  let mockConnector: any;
  let mockSessionManager: any;
  let mockAccountStrategy: any;
  let mockParams: AccountConnectionParams;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock connector
    mockConnector = {
      connect: vi.fn(),
    };

    // Setup mock session manager
    mockSessionManager = {
      getLocalKeypair: vi.fn(),
      generateAndStoreTempAccount: vi.fn(),
      getGranter: vi.fn(),
      setGranter: vi.fn(),
      authenticate: vi.fn(),
      logout: vi.fn(),
    };

    // Setup mock account strategy
    mockAccountStrategy = {
      findAccount: vi.fn(),
    };

    // Default params
    mockParams = {
      connector: mockConnector,
      chainId: "xion-testnet-1",
      rpcUrl: "https://rpc.xion-testnet-1.burnt.com",
      accountStrategy: mockAccountStrategy,
      sessionManager: mockSessionManager,
    };
  });

  describe("🔴 CRITICAL: connectAccount()", () => {
    it("should connect connector and get metadata", async () => {
      const mockKeypair = {
        getAccounts: vi.fn().mockResolvedValue([{ address: "xion1grantee" }]),
      };

      mockConnector.connect.mockResolvedValue({
        displayAddress: "0x123",
        authenticator: "0x123",
        signMessage: vi.fn(),
        metadata: {
          authenticatorType: AUTHENTICATOR_TYPE.EthWallet,
          authenticatorIndex: 0,
        },
      });

      vi.mocked(accountDiscovery.checkAccountExists).mockResolvedValue({
        exists: true,
        smartAccountAddress: "xion1smartaccount",
        authenticatorIndex: 0,
        codeId: 123,
      });

      mockSessionManager.getLocalKeypair.mockResolvedValue(mockKeypair);

      const result = await connectAccount(mockParams);

      expect(mockConnector.connect).toHaveBeenCalledWith("xion-testnet-1");
      expect(result.smartAccountAddress).toBe("xion1smartaccount");
      expect(result.connectionInfo).toBeDefined();
      expect(result.sessionKeypair).toBeDefined();
      expect(result.granteeAddress).toBe("xion1grantee");
    });

    it("should discover existing account", async () => {
      const mockKeypair = {
        getAccounts: vi.fn().mockResolvedValue([{ address: "xion1grantee" }]),
      };

      mockConnector.connect.mockResolvedValue({
        displayAddress: "0x123",
        authenticator: "0x123",
        signMessage: vi.fn(),
        metadata: {
          authenticatorType: AUTHENTICATOR_TYPE.EthWallet,
        },
      });

      vi.mocked(accountDiscovery.checkAccountExists).mockResolvedValue({
        exists: true,
        smartAccountAddress: "xion1existingaccount",
        authenticatorIndex: 1,
        codeId: 456,
      });

      mockSessionManager.getLocalKeypair.mockResolvedValue(mockKeypair);

      const result = await connectAccount(mockParams);

      expect(accountDiscovery.checkAccountExists).toHaveBeenCalledWith(
        mockAccountStrategy,
        "0x123",
        AUTHENTICATOR_TYPE.EthWallet,
      );
      expect(result.smartAccountAddress).toBe("xion1existingaccount");
      expect(result.connectionInfo.metadata?.authenticatorIndex).toBe(1);
      expect(result.connectionInfo.metadata?.codeId).toBe(456);
    });

    it("should handle account creation for EthWallet when not exists", async () => {
      const { createEthWalletAccount } = await import(
        "@burnt-labs/abstraxion-core"
      );
      const mockKeypair = {
        getAccounts: vi.fn().mockResolvedValue([{ address: "xion1grantee" }]),
      };

      mockConnector.connect.mockResolvedValue({
        displayAddress: "0x123",
        authenticator: "0x123abc",
        signMessage: vi.fn().mockResolvedValue("signature"),
        metadata: {
          authenticatorType: AUTHENTICATOR_TYPE.EthWallet,
        },
      });

      vi.mocked(accountDiscovery.checkAccountExists).mockResolvedValue({
        exists: false,
      });

      vi.mocked(createEthWalletAccount).mockResolvedValue({
        account_address: "xion1newaccount",
        code_id: 789,
      });

      mockSessionManager.getLocalKeypair.mockResolvedValue(mockKeypair);

      mockParams.accountCreationConfig = {
        aaApiUrl: "https://aa-api.xion.com",
        smartAccountContract: {
          checksum: "abc123",
          addressPrefix: "xion",
        },
        feeGranter: "xion1feegranter",
      };

      const result = await connectAccount(mockParams);

      expect(createEthWalletAccount).toHaveBeenCalledWith(
        "https://aa-api.xion.com",
        "0x123abc",
        expect.any(Function),
        "abc123",
        "xion1feegranter",
        "xion",
        "https://rpc.xion-testnet-1.burnt.com",
      );
      expect(result.smartAccountAddress).toBe("xion1newaccount");
      expect(result.connectionInfo.metadata?.codeId).toBe(789);
    });

    it("should handle account creation for Secp256K1 when not exists", async () => {
      const { createSecp256k1Account } = await import(
        "@burnt-labs/abstraxion-core"
      );
      const mockKeypair = {
        getAccounts: vi.fn().mockResolvedValue([{ address: "xion1grantee" }]),
      };

      mockConnector.connect.mockResolvedValue({
        displayAddress: "xion1wallet",
        authenticator: "publickey123",
        signMessage: vi.fn().mockResolvedValue("signature"),
        metadata: {
          authenticatorType: AUTHENTICATOR_TYPE.Secp256K1,
          pubkey: "publickey456",
        },
      });

      vi.mocked(accountDiscovery.checkAccountExists).mockResolvedValue({
        exists: false,
      });

      vi.mocked(createSecp256k1Account).mockResolvedValue({
        account_address: "xion1newcosmosaccount",
        code_id: 999,
      });

      mockSessionManager.getLocalKeypair.mockResolvedValue(mockKeypair);

      mockParams.accountCreationConfig = {
        aaApiUrl: "https://aa-api.xion.com",
        smartAccountContract: {
          checksum: "def456",
          addressPrefix: "xion",
        },
        feeGranter: "xion1feegranter",
      };

      const result = await connectAccount(mockParams);

      expect(createSecp256k1Account).toHaveBeenCalledWith(
        "https://aa-api.xion.com",
        "publickey456",
        expect.any(Function),
        "def456",
        "xion1feegranter",
        "xion",
        "https://rpc.xion-testnet-1.burnt.com",
      );
      expect(result.smartAccountAddress).toBe("xion1newcosmosaccount");
    });

    it("should generate keypair for grantee when none exists", async () => {
      const mockNewKeypair = {
        getAccounts: vi
          .fn()
          .mockResolvedValue([{ address: "xion1newgrantee" }]),
      };

      mockConnector.connect.mockResolvedValue({
        displayAddress: "0x123",
        authenticator: "0x123",
        signMessage: vi.fn(),
        metadata: {
          authenticatorType: AUTHENTICATOR_TYPE.EthWallet,
        },
      });

      vi.mocked(accountDiscovery.checkAccountExists).mockResolvedValue({
        exists: true,
        smartAccountAddress: "xion1smartaccount",
        authenticatorIndex: 0,
      });

      mockSessionManager.getLocalKeypair.mockResolvedValue(undefined);
      mockSessionManager.generateAndStoreTempAccount.mockResolvedValue(
        mockNewKeypair,
      );

      const result = await connectAccount(mockParams);

      expect(mockSessionManager.getLocalKeypair).toHaveBeenCalled();
      expect(mockSessionManager.generateAndStoreTempAccount).toHaveBeenCalled();
      expect(result.sessionKeypair).toBe(mockNewKeypair);
      expect(result.granteeAddress).toBe("xion1newgrantee");
    });

    it("should use existing keypair if available", async () => {
      const mockExistingKeypair = {
        getAccounts: vi
          .fn()
          .mockResolvedValue([{ address: "xion1existinggrantee" }]),
      };

      mockConnector.connect.mockResolvedValue({
        displayAddress: "0x123",
        authenticator: "0x123",
        signMessage: vi.fn(),
        metadata: {
          authenticatorType: AUTHENTICATOR_TYPE.EthWallet,
        },
      });

      vi.mocked(accountDiscovery.checkAccountExists).mockResolvedValue({
        exists: true,
        smartAccountAddress: "xion1smartaccount",
        authenticatorIndex: 0,
      });

      mockSessionManager.getLocalKeypair.mockResolvedValue(mockExistingKeypair);

      const result = await connectAccount(mockParams);

      expect(mockSessionManager.getLocalKeypair).toHaveBeenCalled();
      expect(
        mockSessionManager.generateAndStoreTempAccount,
      ).not.toHaveBeenCalled();
      expect(result.sessionKeypair).toBe(mockExistingKeypair);
      expect(result.granteeAddress).toBe("xion1existinggrantee");
    });

    it("should use provided authenticator if given", async () => {
      const mockKeypair = {
        getAccounts: vi.fn().mockResolvedValue([{ address: "xion1grantee" }]),
      };

      mockConnector.connect.mockResolvedValue({
        displayAddress: "0x123",
        authenticator: "0x456",
        signMessage: vi.fn(),
        metadata: {
          authenticatorType: AUTHENTICATOR_TYPE.EthWallet,
        },
      });

      vi.mocked(accountDiscovery.checkAccountExists).mockResolvedValue({
        exists: true,
        smartAccountAddress: "xion1smartaccount",
        authenticatorIndex: 0,
      });

      mockSessionManager.getLocalKeypair.mockResolvedValue(mockKeypair);

      mockParams.authenticator = "0x789custom";

      await connectAccount(mockParams);

      expect(accountDiscovery.checkAccountExists).toHaveBeenCalledWith(
        mockAccountStrategy,
        "0x789custom",
        AUTHENTICATOR_TYPE.EthWallet,
      );
    });

    it("should handle connector connection errors", async () => {
      mockConnector.connect.mockRejectedValue(
        new Error("User rejected connection"),
      );

      await expect(connectAccount(mockParams)).rejects.toThrow(
        "User rejected connection",
      );
    });

    it("should throw error if authenticatorType is missing", async () => {
      mockConnector.connect.mockResolvedValue({
        displayAddress: "0x123",
        authenticator: "0x123",
        signMessage: vi.fn(),
        metadata: {
          // Missing authenticatorType
        },
      });

      await expect(connectAccount(mockParams)).rejects.toThrow(
        "Authenticator type not found in connection result metadata",
      );
    });

    it("should throw error if account creation config is missing when needed", async () => {
      mockConnector.connect.mockResolvedValue({
        displayAddress: "0x123",
        authenticator: "0x123",
        signMessage: vi.fn(),
        metadata: {
          authenticatorType: AUTHENTICATOR_TYPE.EthWallet,
        },
      });

      vi.mocked(accountDiscovery.checkAccountExists).mockResolvedValue({
        exists: false,
      });

      // No accountCreationConfig provided
      await expect(connectAccount(mockParams)).rejects.toThrow(
        "Account creation config is required but not provided",
      );
    });

    it("should throw error for unsupported authenticator type", async () => {
      const mockKeypair = {
        getAccounts: vi.fn().mockResolvedValue([{ address: "xion1grantee" }]),
      };

      mockConnector.connect.mockResolvedValue({
        displayAddress: "passkey123",
        authenticator: "passkey123",
        signMessage: vi.fn(),
        metadata: {
          authenticatorType: "Passkey" as any,
        },
      });

      vi.mocked(accountDiscovery.checkAccountExists).mockResolvedValue({
        exists: false,
      });

      mockSessionManager.getLocalKeypair.mockResolvedValue(mockKeypair);

      mockParams.accountCreationConfig = {
        aaApiUrl: "https://aa-api.xion.com",
        smartAccountContract: {
          checksum: "abc123",
          addressPrefix: "xion",
        },
        feeGranter: "xion1feegranter",
      };

      await expect(connectAccount(mockParams)).rejects.toThrow(
        "Account creation for Passkey authenticator type is not yet supported",
      );
    });

    it("should preserve all connection metadata", async () => {
      const mockKeypair = {
        getAccounts: vi.fn().mockResolvedValue([{ address: "xion1grantee" }]),
      };

      mockConnector.connect.mockResolvedValue({
        displayAddress: "0x123",
        authenticator: "0x123",
        signMessage: vi.fn(),
        metadata: {
          authenticatorType: AUTHENTICATOR_TYPE.EthWallet,
          customField: "customValue",
        },
      });

      vi.mocked(accountDiscovery.checkAccountExists).mockResolvedValue({
        exists: true,
        smartAccountAddress: "xion1smartaccount",
        authenticatorIndex: 2,
        codeId: 555,
      });

      mockSessionManager.getLocalKeypair.mockResolvedValue(mockKeypair);

      const result = await connectAccount(mockParams);

      expect(result.connectionInfo.metadata?.authenticatorType).toBe(
        AUTHENTICATOR_TYPE.EthWallet,
      );
      expect(result.connectionInfo.metadata?.authenticatorIndex).toBe(2);
      expect(result.connectionInfo.metadata?.codeId).toBe(555);
      expect((result.connectionInfo.metadata as any)?.customField).toBe(
        "customValue",
      );
    });
  });
});
