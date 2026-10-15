/**
 * Unit tests for RpcAccountStrategy (deprecated adapter over AAApiAccountStrategy v2)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock CosmWasmClient so on-chain verification is driven by each test
vi.mock("@cosmjs/cosmwasm-stargate", async () => {
  const actual = await vi.importActual("@cosmjs/cosmwasm-stargate");
  return {
    ...actual,
    CosmWasmClient: {
      connect: vi.fn(),
    },
  };
});

import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { toBase64, toUtf8 } from "@cosmjs/encoding";
import {
  RpcAccountStrategy,
  RPC_ACCOUNT_STRATEGY_MIGRATION_ERROR,
} from "../account-rpc-strategy";
import { AAApiAccountStrategy } from "../account-aa-api-strategy";
import { AUTHENTICATOR_TYPE } from "@burnt-labs/signers";

const AA_API_URL = "https://aa-api.xion-testnet-2.burnt.com";
const RPC_URL = "https://rpc.xion-testnet-2.burnt.com:443";
const EVM = "0xc2e80cf7d5a108d4abc97b5c5a95b2515ef90cb5";
const ADDRESS =
  "xion1s7q6lptjw8j22peevhwese5rernvw0v83fsupxlccjx5a9rcy3ws90atef";
// Does not derive ADDRESS: proves the checksum plays no part in discovery
const STALE_CHECKSUM =
  "D27A379FF65EB47A9E538E3A3D46101DE2A6C0B86BA3D0BF014C0403849414E6";

describe("RpcAccountStrategy", () => {
  let mockClient: {
    getContract: ReturnType<typeof vi.fn>;
    queryContractSmart: ReturnType<typeof vi.fn>;
  };
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    originalFetch = global.fetch;
    global.fetch = vi.fn();
    mockClient = {
      getContract: vi
        .fn()
        .mockResolvedValue({ address: ADDRESS, codeId: 1880 }),
      queryContractSmart: vi.fn(async (_address: string, query: any) =>
        query.authenticator_i_ds
          ? [0]
          : toBase64(toUtf8(JSON.stringify({ EthWallet: { address: EVM } }))),
      ),
    };
    vi.mocked(CosmWasmClient.connect).mockResolvedValue(mockClient as any);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("migration", () => {
    it("throws an explicit migration error without aaApiUrl", () => {
      expect(
        () =>
          new RpcAccountStrategy({
            rpcUrl: RPC_URL,
            checksum: STALE_CHECKSUM,
            creator: "xion1creator",
            prefix: "xion",
            codeId: 1,
          }),
      ).toThrow(RPC_ACCOUNT_STRATEGY_MIGRATION_ERROR);
      expect(RPC_ACCOUNT_STRATEGY_MIGRATION_ERROR).toContain(
        "requires `aaApiUrl`",
      );
    });

    it("still accepts the deprecated checksum/creator/codeId fields", () => {
      expect(
        () =>
          new RpcAccountStrategy({
            rpcUrl: RPC_URL,
            aaApiUrl: AA_API_URL,
            checksum: STALE_CHECKSUM,
            creator: "xion1creator",
            prefix: "xion",
            codeId: 1,
          }),
      ).not.toThrow();
    });

    it("delegates to AAApiAccountStrategy v2", () => {
      const strategy = new RpcAccountStrategy({
        rpcUrl: RPC_URL,
        aaApiUrl: AA_API_URL,
        prefix: "xion",
      });

      const delegate = (strategy as any).delegate;
      expect(delegate).toBeInstanceOf(AAApiAccountStrategy);
      expect(delegate.config).toEqual({
        baseURL: AA_API_URL,
        version: "v2",
        rpcUrl: RPC_URL,
        addressPrefix: "xion",
      });
    });
  });

  describe("fetchSmartAccounts", () => {
    it("uses the aa-api address regardless of a stale checksum", async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            address: ADDRESS,
            codeId: 1880,
            authenticatorType: "EthWallet",
          }),
          { status: 200 },
        ),
      );
      const strategy = new RpcAccountStrategy({
        rpcUrl: RPC_URL,
        aaApiUrl: AA_API_URL,
        checksum: STALE_CHECKSUM,
        creator: "xion1creator",
        prefix: "xion",
        codeId: 1,
      });

      const result = await strategy.fetchSmartAccounts(
        EVM,
        AUTHENTICATOR_TYPE.EthWallet,
      );

      expect(vi.mocked(global.fetch).mock.calls[0][0]).toBe(
        `${AA_API_URL}/api/v2/account/check/ethwallet/${EVM}`,
      );
      expect(CosmWasmClient.connect).toHaveBeenCalledWith(RPC_URL);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(ADDRESS);
      // The chain's code ID, not the configured one
      expect(result[0].codeId).toBe(1880);
    });

    it("returns [] on an explicit aa-api 404", async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: "not found" } }), {
          status: 404,
        }),
      );
      const strategy = new RpcAccountStrategy({
        rpcUrl: RPC_URL,
        aaApiUrl: AA_API_URL,
        prefix: "xion",
      });

      await expect(
        strategy.fetchSmartAccounts(EVM, AUTHENTICATOR_TYPE.EthWallet),
      ).resolves.toEqual([]);
      expect(CosmWasmClient.connect).not.toHaveBeenCalled();
    });

    it("rejects when the reported contract is missing on chain", async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            address: ADDRESS,
            codeId: 1880,
            authenticatorType: "EthWallet",
          }),
          { status: 200 },
        ),
      );
      mockClient.getContract.mockRejectedValueOnce(
        new Error("contract: not found"),
      );
      const strategy = new RpcAccountStrategy({
        rpcUrl: RPC_URL,
        aaApiUrl: AA_API_URL,
        prefix: "xion",
      });

      await expect(
        strategy.fetchSmartAccounts(EVM, AUTHENTICATOR_TYPE.EthWallet),
      ).rejects.toThrow("on-chain verification failed: contract: not found");
    });

    it("rejects unsupported authenticator types", async () => {
      const strategy = new RpcAccountStrategy({
        rpcUrl: RPC_URL,
        aaApiUrl: AA_API_URL,
        prefix: "xion",
      });

      await expect(
        strategy.fetchSmartAccounts("aud.sub", AUTHENTICATOR_TYPE.JWT),
      ).rejects.toThrow(
        "AA-API v2 account discovery supports EthWallet and Secp256K1",
      );
    });
  });
});
