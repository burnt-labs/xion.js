/**
 * Unit tests for AAApiAccountStrategy
 * Validates integration with account-abstraction-api and prevents type regressions
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
import { AAApiAccountStrategy } from "../account-aa-api-strategy";
import { AUTHENTICATOR_TYPE } from "@burnt-labs/signers";

describe("AAApiAccountStrategy", () => {
  let strategy: AAApiAccountStrategy;
  const baseURL = "https://aa-api.xion-testnet-2.burnt.com";

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("V1 API", () => {
    beforeEach(() => {
      strategy = new AAApiAccountStrategy({ baseURL, version: "v1" });
    });

    it("should fetch accounts with correct API contract", async () => {
      const mockResponse = {
        id: "xion1z70cvc08qv5764zeg3dykcyymj5z6nu4sqr7x8",
        codeId: 1,
        authenticators: [
          {
            id: "xion1z70cvc08qv5764zeg3dykcyymj5z6nu4sqr7x8-0",
            type: "Jwt",
            authenticator: "test-project.user-123",
            authenticatorIndex: 0,
          },
        ],
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      const result = await strategy.fetchSmartAccounts("test-project.user-123");

      // Validate API call structure
      expect(global.fetch).toHaveBeenCalledWith(
        `${baseURL}/api/v1/jwt-accounts/test-project/user-123`,
      );

      // Validate response type contract (matches account-abstraction-api/src/api/v1/accounts/authenticator.ts:20-22)
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: expect.any(String),
        codeId: expect.any(Number),
        authenticators: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            type: expect.any(String),
            authenticator: expect.any(String),
            authenticatorIndex: expect.any(Number),
          }),
        ]),
      });
    });

    it("should handle 404 as empty array", async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      } as Response);

      const result = await strategy.fetchSmartAccounts(
        "test-project.nonexistent",
      );

      expect(result).toEqual([]);
    });

    it("should throw on non-404 errors", async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 502,
        statusText: "Bad Gateway",
      } as Response);

      await expect(
        strategy.fetchSmartAccounts("test-project.user-123"),
      ).rejects.toThrow("AA-API returned 502: Bad Gateway");
    });

    it("should validate authenticator format", async () => {
      await expect(
        strategy.fetchSmartAccounts("invalid-format"),
      ).rejects.toThrow(
        'Invalid authenticator format for AA-API v1: expected "aud.sub"',
      );
    });

    it("should handle authenticators with dots in sub", async () => {
      const mockResponse = {
        id: "xion1test",
        codeId: 1,
        authenticators: [],
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      await strategy.fetchSmartAccounts("project.user.with.dots");

      expect(global.fetch).toHaveBeenCalledWith(
        `${baseURL}/api/v1/jwt-accounts/project/user.with.dots`,
      );
    });

    it("should handle array responses", async () => {
      const mockResponse = [
        {
          id: "xion1test1",
          codeId: 1,
          authenticators: [],
        },
        {
          id: "xion1test2",
          codeId: 1,
          authenticators: [],
        },
      ];

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      const result = await strategy.fetchSmartAccounts("test-project.user-123");

      expect(result).toHaveLength(2);
    });

    it("should filter out invalid response objects", async () => {
      const mockResponse = [
        {
          id: "xion1valid",
          codeId: 1,
          authenticators: [],
        },
        {
          id: "xion1missing-code-id",
          // Missing codeId
          authenticators: [],
        },
        {
          id: 123, // Invalid type
          codeId: 1,
          authenticators: [],
        },
        null,
      ];

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      const result = await strategy.fetchSmartAccounts("test-project.user-123");

      // Only the first valid object should remain
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("xion1valid");
    });

    it("should handle network errors", async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(
        new TypeError("Failed to fetch"),
      );

      await expect(
        strategy.fetchSmartAccounts("test-project.user-123"),
      ).rejects.toThrow("Network error while fetching from AA-API");
    });

    it("should URL-encode authenticator parts", async () => {
      const mockResponse = {
        id: "xion1test",
        codeId: 1,
        authenticators: [],
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      await strategy.fetchSmartAccounts("test@project.user/123");

      // Verify URL encoding
      expect(global.fetch).toHaveBeenCalledWith(
        `${baseURL}/api/v1/jwt-accounts/test%40project/user%2F123`,
      );
    });
  });

  describe("V2 API (aa-api /check + on-chain verification)", () => {
    // Sanitized read-only evidence captured from xion-testnet-2 (2026-10-05):
    //   GET {aa-api}/api/v2/account/check/ethwallet/<EVM>      → 200 CHECK_BODY
    //   GET {rest}/cosmwasm/wasm/v1/contract/<address>          → code_id "1880"
    //   smart {"authenticator_i_ds":{}}                         → [0]
    //   smart {"authenticator_by_i_d":{"id":0}}                 → base64(AUTH_0)
    //   GET {aa-api}/api/v2/account/check/ethwallet/0x…dead     → 404
    const EVM = "0xc2e80cf7d5a108d4abc97b5c5a95b2515ef90cb5";
    const ADDRESS =
      "xion1s7q6lptjw8j22peevhwese5rernvw0v83fsupxlccjx5a9rcy3ws90atef";
    const CHECK_BODY = {
      address: ADDRESS,
      codeId: 1880,
      authenticatorType: "EthWallet",
    };
    const AUTH_0 = { EthWallet: { address: EVM } };
    const RPC_URL = "https://rpc.xion-testnet-2.burnt.com:443";

    const SECP_PUBKEY_BASE64 = "AiGkW+2imN152OGq4dMyJS/J4OyGGrjtpXFXjMVASz2p";
    const SECP_PUBKEY_HEX =
      "0221a45beda298dd79d8e1aae1d332252fc9e0ec861ab8eda571578cc5404b3da9";
    const OTHER_SECP_BASE64 = "AsCnyF4VdNxtN+4Fr8RFzy1Tvu1OXB5s13ZfMrEAP5t5";

    const encodeAuthenticator = (value: unknown) =>
      toBase64(toUtf8(JSON.stringify(value)));

    let mockClient: {
      getContract: ReturnType<typeof vi.fn>;
      queryContractSmart: ReturnType<typeof vi.fn>;
    };

    function mockCheck(body: unknown, status = 200) {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(body), { status }),
      );
    }

    function mockChain(
      authenticators: Record<number, unknown>,
      codeId = 1880,
      address = ADDRESS,
    ) {
      mockClient.getContract.mockResolvedValueOnce({
        address,
        codeId,
        creator: "xion1xrqz2wpt4rw8rtdvrc4n4yn5h54jm0nn4evn2x",
        admin: address,
        label: "abstractaccount/18998",
      });
      mockClient.queryContractSmart.mockImplementation(
        async (_address: string, query: any) => {
          if (query.authenticator_i_ds) {
            return Object.keys(authenticators).map(Number);
          }
          return encodeAuthenticator(
            authenticators[query.authenticator_by_i_d.id],
          );
        },
      );
    }

    beforeEach(() => {
      mockClient = {
        getContract: vi.fn(),
        queryContractSmart: vi.fn(),
      };
      vi.mocked(CosmWasmClient.connect).mockReset();
      vi.mocked(CosmWasmClient.connect).mockResolvedValue(mockClient as any);
      strategy = new AAApiAccountStrategy({
        baseURL,
        version: "v2",
        rpcUrl: RPC_URL,
        addressPrefix: "xion",
      });
    });

    it("returns the existing testnet fixture verified on chain", async () => {
      mockCheck(CHECK_BODY);
      mockChain({ 0: AUTH_0 });

      const result = await strategy.fetchSmartAccounts(
        EVM,
        AUTHENTICATOR_TYPE.EthWallet,
      );

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(vi.mocked(global.fetch).mock.calls[0][0]).toBe(
        `${baseURL}/api/v2/account/check/ethwallet/${EVM}`,
      );
      expect(CosmWasmClient.connect).toHaveBeenCalledWith(RPC_URL);
      expect(mockClient.getContract).toHaveBeenCalledWith(ADDRESS);
      expect(result).toEqual([
        {
          id: ADDRESS,
          codeId: 1880,
          authenticators: [
            {
              id: `${ADDRESS}-0`,
              type: AUTHENTICATOR_TYPE.EthWallet,
              authenticator: EVM,
              authenticatorIndex: 0,
            },
          ],
        },
      ]);
    });

    it("reports the chain's code ID and real authenticator indexes", async () => {
      // /check reports a different codeId than the contract actually has
      mockCheck({ ...CHECK_BODY, codeId: 5 });
      mockChain(
        {
          0: { Secp256K1: { pubkey: OTHER_SECP_BASE64 } },
          3: { EthWallet: { address: EVM.toUpperCase().replace("0X", "0x") } },
        },
        1234,
      );

      const result = await strategy.fetchSmartAccounts(
        EVM,
        AUTHENTICATOR_TYPE.EthWallet,
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(ADDRESS);
      expect(result[0].codeId).toBe(1234);
      expect(result[0].authenticators.map((a) => a.authenticatorIndex)).toEqual(
        [0, 3],
      );
      expect(result[0].authenticators[1]).toMatchObject({
        type: AUTHENTICATOR_TYPE.EthWallet,
        authenticatorIndex: 3,
      });
    });

    it("verifies a Secp256K1 login given as hex against the base64 on-chain key", async () => {
      mockCheck({ ...CHECK_BODY, authenticatorType: "Secp256K1" });
      mockChain({ 2: { Secp256K1: { pubkey: SECP_PUBKEY_BASE64 } } });

      const result = await strategy.fetchSmartAccounts(
        SECP_PUBKEY_HEX,
        AUTHENTICATOR_TYPE.Secp256K1,
      );

      expect(vi.mocked(global.fetch).mock.calls[0][0]).toBe(
        `${baseURL}/api/v2/account/check/secp256k1/AiGkW%2B2imN152OGq4dMyJS%2FJ4OyGGrjtpXFXjMVASz2p`,
      );
      expect(result[0].authenticators[0].authenticatorIndex).toBe(2);
    });

    it("does not match a Secp256K1 key that differs only by base64 case", async () => {
      mockCheck({ ...CHECK_BODY, authenticatorType: "Secp256K1" });
      mockChain({
        0: { Secp256K1: { pubkey: SECP_PUBKEY_BASE64.toLowerCase() } },
      });

      await expect(
        strategy.fetchSmartAccounts(
          SECP_PUBKEY_BASE64,
          AUTHENTICATOR_TYPE.Secp256K1,
        ),
      ).rejects.toThrow(
        "no on-chain Secp256K1 authenticator matches the login authenticator",
      );
    });

    it("returns [] only for an explicit /check 404, without touching the chain", async () => {
      mockCheck({ error: { message: "Account not found" } }, 404);

      const result = await strategy.fetchSmartAccounts(
        "0x000000000000000000000000000000000000dead",
        AUTHENTICATOR_TYPE.EthWallet,
      );

      expect(result).toEqual([]);
      expect(CosmWasmClient.connect).not.toHaveBeenCalled();
    });

    const apiFailures: Array<{
      name: string;
      mock: () => void;
      error: string;
    }> = [
      {
        name: "/check 500",
        mock: () => mockCheck({ error: { message: "indexer down" } }, 500),
        error: "indexer down",
      },
      {
        name: "/check 502 mentioning ACCOUNT_NOT_FOUND",
        mock: () => mockCheck({ error: { message: "ACCOUNT_NOT_FOUND" } }, 502),
        error: "ACCOUNT_NOT_FOUND",
      },
      {
        name: "network failure",
        mock: () =>
          vi
            .mocked(global.fetch)
            .mockRejectedValueOnce(new TypeError("Failed to fetch")),
        error: "Failed to fetch",
      },
      {
        name: "malformed /check body",
        mock: () => mockCheck({ address: ADDRESS }),
        error: "returned authenticatorType",
      },
      {
        name: "/check address with the wrong prefix",
        mock: () =>
          mockCheck({
            ...CHECK_BODY,
            address:
              "cosmos1s7q6lptjw8j22peevhwese5rernvw0v83fsupxlccjx5a9rcy3wsl6w8qj",
          }),
        error: 'with prefix "cosmos"',
      },
    ];

    it.each(apiFailures)("rejects on $name", async ({ mock, error }) => {
      mock();

      await expect(
        strategy.fetchSmartAccounts(EVM, AUTHENTICATOR_TYPE.EthWallet),
      ).rejects.toThrow(error);
      expect(CosmWasmClient.connect).not.toHaveBeenCalled();
    });

    const chainFailures: Array<{
      name: string;
      mock: () => void;
      error: string;
    }> = [
      {
        name: "RPC connection failure",
        mock: () =>
          vi
            .mocked(CosmWasmClient.connect)
            .mockRejectedValueOnce(new Error("socket hang up")),
        error: "socket hang up",
      },
      {
        name: "/check 200 but no contract on chain",
        mock: () =>
          mockClient.getContract.mockRejectedValueOnce(
            new Error(`No contract found at address "${ADDRESS}"`),
          ),
        error: "No contract found",
      },
      {
        name: "protobuf decode error from contract info",
        mock: () =>
          mockClient.getContract.mockRejectedValueOnce(
            new Error("invalid wire type 7 at offset 12"),
          ),
        error: "invalid wire type",
      },
      {
        name: "contract info for another address",
        mock: () =>
          mockChain(
            { 0: AUTH_0 },
            1880,
            "xion15k0lncpkc93p79sl9fjfs0hwn7hjajsvclnv5k3xeguwe08yme9sttujm4",
          ),
        error: "chain returned contract info for",
      },
      {
        name: "invalid code ID",
        mock: () => mockChain({ 0: AUTH_0 }, 0),
        error: 'invalid code ID "0"',
      },
      {
        name: "authenticator query error",
        mock: () => {
          mockChain({ 0: AUTH_0 });
          mockClient.queryContractSmart.mockRejectedValueOnce(
            new Error("query wasm contract failed"),
          );
        },
        error: "query wasm contract failed",
      },
      {
        name: "malformed authenticator_i_ds",
        mock: () => {
          mockChain({ 0: AUTH_0 });
          mockClient.queryContractSmart.mockResolvedValueOnce({ ids: [0] });
        },
        error: "malformed authenticator_i_ds response",
      },
      {
        name: "undecodable authenticator",
        mock: () => {
          mockChain({ 0: AUTH_0 });
          mockClient.queryContractSmart.mockImplementation(
            async (_a: string, query: any) =>
              query.authenticator_i_ds ? [0] : "%%%not-base64%%%",
          );
        },
        error: "malformed authenticator 0",
      },
      {
        name: "no matching authenticator",
        mock: () =>
          mockChain({
            0: {
              EthWallet: {
                address: "0x1111111111111111111111111111111111111111",
              },
            },
          }),
        error:
          "no on-chain EthWallet authenticator matches the login authenticator",
      },
      {
        name: "matching identifier of the wrong type",
        mock: () => mockChain({ 0: { JWT: { aud_and_sub: EVM } } }),
        error: "no on-chain EthWallet authenticator matches",
      },
    ];

    it.each(chainFailures)(
      "rejects after /check 200 on $name",
      async ({ mock, error }) => {
        mockCheck(CHECK_BODY);
        mock();

        const failure = await strategy
          .fetchSmartAccounts(EVM, AUTHENTICATOR_TYPE.EthWallet)
          .catch((e: unknown) => e);

        expect(failure).toBeInstanceOf(Error);
        expect((failure as Error).message).toContain(
          `AA-API reported smart account ${ADDRESS} but on-chain verification failed`,
        );
        expect((failure as Error).message).toContain(error);
      },
    );

    it.each([AUTHENTICATOR_TYPE.JWT, AUTHENTICATOR_TYPE.Passkey, undefined])(
      "rejects unsupported authenticator type %s without a request",
      async (type) => {
        await expect(
          strategy.fetchSmartAccounts("aud.sub", type as any),
        ).rejects.toThrow(
          "AA-API v2 account discovery supports EthWallet and Secp256K1",
        );
        expect(global.fetch).not.toHaveBeenCalled();
      },
    );

    it("constructs without rpcUrl (SSR) and rejects on discovery before any request", async () => {
      const ssrStrategy = new AAApiAccountStrategy({
        baseURL,
        version: "v2",
        rpcUrl: "",
        addressPrefix: "xion",
      });

      await expect(
        ssrStrategy.fetchSmartAccounts(EVM, AUTHENTICATOR_TYPE.EthWallet),
      ).rejects.toThrow("AA-API v2 strategy requires rpcUrl");
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("requires addressPrefix", () => {
      expect(
        () =>
          new AAApiAccountStrategy({
            baseURL,
            version: "v2",
            rpcUrl: RPC_URL,
          } as any),
      ).toThrow("AA-API v2 strategy requires addressPrefix");
    });
  });

  describe("Configuration", () => {
    it("should default to v1 when version not specified", () => {
      strategy = new AAApiAccountStrategy({ baseURL });
      expect(strategy["config"].version).toBe("v1");
    });
  });
});
