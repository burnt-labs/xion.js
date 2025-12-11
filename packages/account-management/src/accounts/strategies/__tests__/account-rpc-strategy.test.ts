/**
 * Unit tests for RpcAccountStrategy
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock webauthn-json to avoid module resolution issues
vi.mock("@github/webauthn-json/browser-ponyfill", () => ({
  create: vi.fn(),
  get: vi.fn(),
  supported: vi.fn(() => false),
}));

// Mock CosmWasmClient
vi.mock("@cosmjs/cosmwasm-stargate", async () => {
  const actual = await vi.importActual("@cosmjs/cosmwasm-stargate");
  return {
    ...actual,
    CosmWasmClient: {
      connect: vi.fn(),
    },
  };
});

// Mock address calculation functions
vi.mock("@burnt-labs/signers", async () => {
  const actual = await vi.importActual("@burnt-labs/signers");
  return {
    ...actual,
    calculateSalt: vi.fn(() => "mock-salt"),
    calculateSmartAccountAddress: vi.fn(
      () => "xion1z70cvc08qv5764zeg3dykcyymj5z6nu4sqr7x8",
    ),
  };
});

import { RpcAccountStrategy } from "../account-rpc-strategy";
import {
  AUTHENTICATOR_TYPE,
  calculateSalt,
  calculateSmartAccountAddress,
} from "@burnt-labs/signers";
import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";

// Local mock data to avoid circular dependency
const mockAuthenticators = {
  secp256k1: {
    id: "03a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5e5",
    type: AUTHENTICATOR_TYPE.Secp256K1,
    authenticatorIndex: 0,
  },
  ethWallet: {
    id: "0x742d35cc6634c0532925a3b844bc9e7595f0beb0",
    type: AUTHENTICATOR_TYPE.EthWallet,
    authenticatorIndex: 1,
  },
  jwt: {
    id: "google-oauth2|1234567890",
    type: AUTHENTICATOR_TYPE.JWT,
    authenticatorIndex: 3,
  },
};

describe("RpcAccountStrategy", () => {
  let strategy: RpcAccountStrategy;
  let mockClient: any;

  const config = {
    rpcUrl: "https://rpc.xion-testnet-1.burnt.com:443",
    checksum: "0".repeat(64),
    creator: "xion1creator",
    prefix: "xion",
    codeId: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock client
    mockClient = {
      queryContractSmart: vi.fn(),
    };

    // Configure the mocked CosmWasmClient.connect
    vi.mocked(CosmWasmClient.connect).mockResolvedValue(mockClient);

    strategy = new RpcAccountStrategy(config);
  });

  describe("fetchSmartAccounts", () => {
    it("should return accounts when found via RPC", async () => {
      // Mock successful query responses
      mockClient.queryContractSmart
        .mockResolvedValueOnce([0]) // authenticator_i_ds response
        .mockResolvedValueOnce(
          // authenticator_by_i_d response
          Buffer.from(
            JSON.stringify({
              Secp256K1: {
                pubkey: mockAuthenticators.secp256k1.id,
              },
            }),
          ).toString("base64"),
        );

      const result = await strategy.fetchSmartAccounts(
        mockAuthenticators.secp256k1.id,
        AUTHENTICATOR_TYPE.Secp256K1,
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("xion1z70cvc08qv5764zeg3dykcyymj5z6nu4sqr7x8");
      expect(result[0].codeId).toBe(1);
      expect(result[0].authenticators).toHaveLength(1);
    });

    it("should return empty array when account not found", async () => {
      // Mock empty authenticator IDs response
      mockClient.queryContractSmart.mockResolvedValueOnce([]);

      const result = await strategy.fetchSmartAccounts(
        mockAuthenticators.secp256k1.id,
        AUTHENTICATOR_TYPE.Secp256K1,
      );

      expect(result).toEqual([]);
    });

    it("should handle RPC connection errors", async () => {
      // Use the mocked CosmWasmClient imported at top
      vi.mocked(CosmWasmClient.connect).mockRejectedValueOnce(
        new Error("RPC connection failed"),
      );

      await expect(
        strategy.fetchSmartAccounts(
          mockAuthenticators.secp256k1.id,
          AUTHENTICATOR_TYPE.Secp256K1,
        ),
      ).rejects.toThrow("RPC account strategy failed");
    });

    it("should handle contract query errors", async () => {
      mockClient.queryContractSmart.mockRejectedValueOnce(
        new Error("contract: not found"),
      );

      // queryAuthenticators catches errors and returns empty array
      // This is normal for addresses that haven't been instantiated yet
      const result = await strategy.fetchSmartAccounts(
        mockAuthenticators.secp256k1.id,
        AUTHENTICATOR_TYPE.Secp256K1,
      );

      expect(result).toEqual([]);
    });

    it("should parse EthWallet authenticator correctly", async () => {
      mockClient.queryContractSmart
        .mockResolvedValueOnce([0])
        .mockResolvedValueOnce(
          Buffer.from(
            JSON.stringify({
              EthWallet: {
                address: mockAuthenticators.ethWallet.id,
              },
            }),
          ).toString("base64"),
        );

      const result = await strategy.fetchSmartAccounts(
        mockAuthenticators.ethWallet.id,
        AUTHENTICATOR_TYPE.EthWallet,
      );

      expect(result).toHaveLength(1);
      expect(result[0].authenticators[0].type).toBe(
        AUTHENTICATOR_TYPE.EthWallet,
      );
    });

    it("should parse JWT authenticator correctly", async () => {
      mockClient.queryContractSmart
        .mockResolvedValueOnce([0])
        .mockResolvedValueOnce(
          Buffer.from(
            JSON.stringify({
              JWT: {
                aud_and_sub: "test-project|user123",
              },
            }),
          ).toString("base64"),
        );

      const result = await strategy.fetchSmartAccounts(
        mockAuthenticators.jwt.id,
        AUTHENTICATOR_TYPE.JWT,
      );

      expect(result).toHaveLength(1);
      expect(result[0].authenticators[0].type).toBe(AUTHENTICATOR_TYPE.JWT);
    });

    it("should handle multiple authenticators", async () => {
      mockClient.queryContractSmart
        .mockResolvedValueOnce([0, 1]) // Two authenticator IDs
        .mockResolvedValueOnce(
          // First authenticator
          Buffer.from(
            JSON.stringify({
              Secp256K1: { pubkey: mockAuthenticators.secp256k1.id },
            }),
          ).toString("base64"),
        )
        .mockResolvedValueOnce(
          // Second authenticator
          Buffer.from(
            JSON.stringify({
              EthWallet: { address: mockAuthenticators.ethWallet.id },
            }),
          ).toString("base64"),
        );

      const result = await strategy.fetchSmartAccounts(
        mockAuthenticators.secp256k1.id,
        AUTHENTICATOR_TYPE.Secp256K1,
      );

      expect(result).toHaveLength(1);
      expect(result[0].authenticators).toHaveLength(2);
    });

    it("should use provided authenticator type for calculations", async () => {
      // calculateSalt is already mocked via vi.mock

      mockClient.queryContractSmart
        .mockResolvedValueOnce([0])
        .mockResolvedValueOnce(
          Buffer.from(
            JSON.stringify({
              Secp256K1: { pubkey: "test-pubkey" },
            }),
          ).toString("base64"),
        );

      await strategy.fetchSmartAccounts(
        "test-auth",
        AUTHENTICATOR_TYPE.Passkey,
      );

      expect(calculateSalt).toHaveBeenCalledWith(
        AUTHENTICATOR_TYPE.Passkey,
        "test-auth",
      );
    });
  });

  describe("configuration", () => {
    it("should use provided config for address calculation", async () => {
      // calculateSmartAccountAddress is already mocked via vi.mock

      mockClient.queryContractSmart.mockResolvedValueOnce([]);

      await strategy.fetchSmartAccounts(
        "test-auth",
        AUTHENTICATOR_TYPE.Secp256K1,
      );

      expect(calculateSmartAccountAddress).toHaveBeenCalledWith({
        checksum: config.checksum,
        creator: config.creator,
        salt: "mock-salt",
        prefix: config.prefix,
      });
    });

    it("should return configured codeId in results", async () => {
      mockClient.queryContractSmart
        .mockResolvedValueOnce([0])
        .mockResolvedValueOnce(
          Buffer.from(
            JSON.stringify({
              Secp256K1: { pubkey: "test-pubkey" },
            }),
          ).toString("base64"),
        );

      const result = await strategy.fetchSmartAccounts(
        "test-auth",
        AUTHENTICATOR_TYPE.Secp256K1,
      );

      expect(result[0].codeId).toBe(config.codeId);
    });
  });
});
