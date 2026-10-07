/**
 * Unit tests for createCompositeAccountStrategy factory function
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createCompositeAccountStrategy } from "../factory";
import { CompositeAccountStrategy } from "../account-composite-strategy";
import { DaoDaoAccountStrategy } from "../account-daodao-strategy";
import { NumiaAccountStrategy } from "../account-numia-strategy";
import { SubqueryAccountStrategy } from "../account-subquery-strategy";
import { RpcAccountStrategy } from "../account-rpc-strategy";
import { AAApiAccountStrategy } from "../account-aa-api-strategy";
import { EmptyAccountStrategy } from "../account-empty-strategy";
import { checkAccountExists } from "../../discovery";

describe("createCompositeAccountStrategy", () => {
  describe("strategy composition", () => {
    it("should create strategy with only EmptyAccountStrategy when no config provided", () => {
      const strategy = createCompositeAccountStrategy({});

      expect(strategy).toBeInstanceOf(CompositeAccountStrategy);
      const strategies = (strategy as any).strategies;
      expect(strategies).toHaveLength(1);
      expect(strategies[0]).toBeInstanceOf(EmptyAccountStrategy);
    });

    it("should include DaoDaoAccountStrategy when the DaoDao indexer is configured", () => {
      const strategy = createCompositeAccountStrategy({
        indexer: {
          type: "daodao",
          url: "https://daodaoindexer.burnt.com",
          chainId: "xion-testnet-2",
        },
      });

      const strategies = (strategy as any).strategies;
      expect(strategies[0]).toBeInstanceOf(DaoDaoAccountStrategy);
      expect((strategies[0] as any).baseURL).toBe(
        "https://daodaoindexer.burnt.com/xion-testnet-2",
      );
      expect((strategies[0] as any).timeoutMs).toBe(30000);
      expect(strategies[strategies.length - 1]).toBeInstanceOf(
        EmptyAccountStrategy,
      );
    });

    it("should pass a configured DaoDao timeout to the strategy", () => {
      const strategy = createCompositeAccountStrategy({
        indexer: {
          type: "daodao",
          url: "https://daodaoindexer.burnt.com",
          chainId: "xion-testnet-2",
          timeout: 5000,
        },
      });

      const strategies = (strategy as any).strategies;
      expect((strategies[0] as any).timeoutMs).toBe(5000);
    });

    it("should include NumiaAccountStrategy when Numia indexer configured", () => {
      const strategy = createCompositeAccountStrategy({
        indexer: {
          type: "numia",
          url: "https://indexer.example.com",
        },
      });

      const strategies = (strategy as any).strategies;
      expect(strategies[0]).toBeInstanceOf(NumiaAccountStrategy);
      expect(strategies[strategies.length - 1]).toBeInstanceOf(
        EmptyAccountStrategy,
      );
    });

    it("should include SubqueryAccountStrategy when Subquery indexer configured", () => {
      const strategy = createCompositeAccountStrategy({
        indexer: {
          type: "subquery",
          url: "https://subquery.example.com",
          codeId: 1,
        },
      });

      const strategies = (strategy as any).strategies;
      expect(strategies[0]).toBeInstanceOf(SubqueryAccountStrategy);
    });

    it("should default to Numia when type not specified", () => {
      const strategy = createCompositeAccountStrategy({
        indexer: {
          url: "https://indexer.example.com",
        } as any,
      });

      const strategies = (strategy as any).strategies;
      expect(strategies[0]).toBeInstanceOf(NumiaAccountStrategy);
    });

    it("should include RpcAccountStrategy when RPC config provided", () => {
      const strategy = createCompositeAccountStrategy({
        rpc: {
          rpcUrl: "https://rpc.example.com",
          aaApiUrl: "https://aa-api.example.com",
          checksum: "0".repeat(64),
          creator: "xion1creator",
          prefix: "xion",
          codeId: 1,
        },
      });

      const strategies = (strategy as any).strategies;
      expect(strategies[0]).toBeInstanceOf(RpcAccountStrategy);
      expect(strategies[1]).toBeInstanceOf(EmptyAccountStrategy);
    });

    it("should create full fallback chain: Indexer -> RPC -> Empty", () => {
      const strategy = createCompositeAccountStrategy({
        indexer: {
          type: "numia",
          url: "https://indexer.example.com",
        },
        rpc: {
          rpcUrl: "https://rpc.example.com",
          aaApiUrl: "https://aa-api.example.com",
          checksum: "0".repeat(64),
          creator: "xion1creator",
          prefix: "xion",
          codeId: 1,
        },
      });

      const strategies = (strategy as any).strategies;
      expect(strategies).toHaveLength(3);
      expect(strategies[0]).toBeInstanceOf(NumiaAccountStrategy);
      expect(strategies[1]).toBeInstanceOf(RpcAccountStrategy);
      expect(strategies[2]).toBeInstanceOf(EmptyAccountStrategy);
    });

    it("should pass auth token to NumiaAccountStrategy", () => {
      const strategy = createCompositeAccountStrategy({
        indexer: {
          type: "numia",
          url: "https://indexer.example.com",
          authToken: "test-token",
        },
      });

      const strategies = (strategy as any).strategies;
      const numiaStrategy = strategies[0] as NumiaAccountStrategy;
      expect((numiaStrategy as any).authToken).toBe("test-token");
    });

    it("should pass codeId to SubqueryAccountStrategy", () => {
      const strategy = createCompositeAccountStrategy({
        indexer: {
          type: "subquery",
          url: "https://subquery.example.com",
          codeId: 42,
        },
      });

      const strategies = (strategy as any).strategies;
      const subqueryStrategy = strategies[0] as SubqueryAccountStrategy;
      expect((subqueryStrategy as any).codeId).toBe(42);
    });

    it("should include AAApiAccountStrategy when aaApi configured", () => {
      const strategy = createCompositeAccountStrategy({
        aaApi: {
          baseURL: "https://aa-api.example.com",
        },
      });

      const strategies = (strategy as any).strategies;
      expect(strategies[0]).toBeInstanceOf(AAApiAccountStrategy);
      expect(strategies[1]).toBeInstanceOf(EmptyAccountStrategy);
    });

    it("should pass baseURL to AAApiAccountStrategy", () => {
      const strategy = createCompositeAccountStrategy({
        aaApi: {
          baseURL: "https://aa-api.example.com",
        },
      });

      const strategies = (strategy as any).strategies;
      const aaApiStrategy = strategies[0] as AAApiAccountStrategy;
      expect((aaApiStrategy as any).config.baseURL).toBe(
        "https://aa-api.example.com",
      );
    });

    it("should pass version to AAApiAccountStrategy", () => {
      const strategy = createCompositeAccountStrategy({
        aaApi: {
          baseURL: "https://aa-api.example.com",
          version: "v2",
          rpcUrl: "https://rpc.example.com",
          addressPrefix: "xion",
        },
      });

      const strategies = (strategy as any).strategies;
      const aaApiStrategy = strategies[0] as AAApiAccountStrategy;
      expect((aaApiStrategy as any).config.version).toBe("v2");
    });

    it("should default to v1 when version not specified", () => {
      const strategy = createCompositeAccountStrategy({
        aaApi: {
          baseURL: "https://aa-api.example.com",
        },
      });

      const strategies = (strategy as any).strategies;
      const aaApiStrategy = strategies[0] as AAApiAccountStrategy;
      expect((aaApiStrategy as any).config.version).toBe("v1");
    });

    it("should create fallback chain: Indexer -> AA-API -> Empty", () => {
      const strategy = createCompositeAccountStrategy({
        indexer: {
          type: "numia",
          url: "https://indexer.example.com",
        },
        aaApi: {
          baseURL: "https://aa-api.example.com",
        },
      });

      const strategies = (strategy as any).strategies;
      expect(strategies).toHaveLength(3);
      expect(strategies[0]).toBeInstanceOf(NumiaAccountStrategy);
      expect(strategies[1]).toBeInstanceOf(AAApiAccountStrategy);
      expect(strategies[2]).toBeInstanceOf(EmptyAccountStrategy);
    });

    it("should create fallback chain: AA-API -> RPC -> Empty", () => {
      const strategy = createCompositeAccountStrategy({
        aaApi: {
          baseURL: "https://aa-api.example.com",
        },
        rpc: {
          rpcUrl: "https://rpc.example.com",
          aaApiUrl: "https://aa-api.example.com",
          checksum: "0".repeat(64),
          creator: "xion1creator",
          prefix: "xion",
          codeId: 1,
        },
      });

      const strategies = (strategy as any).strategies;
      expect(strategies).toHaveLength(3);
      expect(strategies[0]).toBeInstanceOf(AAApiAccountStrategy);
      expect(strategies[1]).toBeInstanceOf(RpcAccountStrategy);
      expect(strategies[2]).toBeInstanceOf(EmptyAccountStrategy);
    });

    it("should create full fallback chain: Indexer -> AA-API -> RPC -> Empty", () => {
      const strategy = createCompositeAccountStrategy({
        indexer: {
          type: "numia",
          url: "https://indexer.example.com",
        },
        aaApi: {
          baseURL: "https://aa-api.example.com",
          version: "v1",
        },
        rpc: {
          rpcUrl: "https://rpc.example.com",
          aaApiUrl: "https://aa-api.example.com",
          checksum: "0".repeat(64),
          creator: "xion1creator",
          prefix: "xion",
          codeId: 1,
        },
      });

      const strategies = (strategy as any).strategies;
      expect(strategies).toHaveLength(4);
      expect(strategies[0]).toBeInstanceOf(NumiaAccountStrategy);
      expect(strategies[1]).toBeInstanceOf(AAApiAccountStrategy);
      expect(strategies[2]).toBeInstanceOf(RpcAccountStrategy);
      expect(strategies[3]).toBeInstanceOf(EmptyAccountStrategy);
    });

    it("should always include EmptyAccountStrategy as last fallback", () => {
      const configs = [
        {},
        { indexer: { type: "numia" as const, url: "https://test.com" } },
        { aaApi: { baseURL: "https://aa-api.example.com" } },
        {
          rpc: {
            rpcUrl: "https://rpc.com",
            aaApiUrl: "https://aa-api.example.com",
            checksum: "0",
            creator: "x",
            prefix: "x",
            codeId: 1,
          },
        },
        {
          indexer: { type: "numia" as const, url: "https://test.com" },
          rpc: {
            rpcUrl: "https://rpc.com",
            aaApiUrl: "https://aa-api.example.com",
            checksum: "0",
            creator: "x",
            prefix: "x",
            codeId: 1,
          },
        },
        {
          indexer: { type: "numia" as const, url: "https://test.com" },
          aaApi: { baseURL: "https://aa-api.example.com" },
          rpc: {
            rpcUrl: "https://rpc.com",
            aaApiUrl: "https://aa-api.example.com",
            checksum: "0",
            creator: "x",
            prefix: "x",
            codeId: 1,
          },
        },
      ];

      configs.forEach((config) => {
        const strategy = createCompositeAccountStrategy(config);
        const strategies = (strategy as any).strategies;
        expect(strategies[strategies.length - 1]).toBeInstanceOf(
          EmptyAccountStrategy,
        );
      });
    });
  });

  describe("aa-api v2 (canonical address source)", () => {
    const v2 = {
      baseURL: "https://aa-api.example.com",
      version: "v2" as const,
      rpcUrl: "https://rpc.example.com",
      addressPrefix: "xion",
    };
    const EVM = "0xc2e80cf7d5a108d4abc97b5c5a95b2515ef90cb5";
    let originalFetch: typeof global.fetch;

    beforeEach(() => {
      originalFetch = global.fetch;
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it("contains only the v2 AA API strategy", () => {
      const strategy = createCompositeAccountStrategy({ aaApi: v2 });

      const strategies = (strategy as any).strategies;
      expect(strategies).toHaveLength(1);
      expect(strategies[0]).toBeInstanceOf(AAApiAccountStrategy);
      expect(strategies[0].config).toEqual(v2);
    });

    it("never adds indexer, RPC or empty fallbacks next to v2", () => {
      const strategy = createCompositeAccountStrategy({
        aaApi: v2,
        indexer: { type: "numia", url: "https://indexer.example.com" },
        rpc: {
          rpcUrl: "https://rpc.example.com",
          aaApiUrl: "https://aa-api.example.com",
          prefix: "xion",
        },
      });

      const strategies = (strategy as any).strategies;
      expect(strategies).toHaveLength(1);
      expect(strategies[0]).toBeInstanceOf(AAApiAccountStrategy);
      for (const forbidden of [
        EmptyAccountStrategy,
        RpcAccountStrategy,
        NumiaAccountStrategy,
        SubqueryAccountStrategy,
      ]) {
        expect(strategies.some((s: unknown) => s instanceof forbidden)).toBe(
          false,
        );
      }
    });

    it.each([
      [
        "API failure",
        () => Promise.resolve(new Response("upstream down", { status: 503 })),
      ],
      ["network failure", () => Promise.reject(new TypeError("fetch failed"))],
    ])(
      "surfaces an aa-api %s as accountCheck.error, not as 'no account'",
      async (_name, response) => {
        global.fetch = vi.fn().mockImplementation(response);
        const strategy = createCompositeAccountStrategy({ aaApi: v2 });

        const result = await checkAccountExists(strategy, EVM, "EthWallet");

        expect(result).toEqual({
          exists: false,
          accounts: [],
          error: expect.any(String),
        });
        expect(result.error).toContain("AAApiAccountStrategy");
      },
    );

    it("reports a clean 'no account' only for an explicit 404", async () => {
      global.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { message: "nope" } }), {
          status: 404,
        }),
      );
      const strategy = createCompositeAccountStrategy({ aaApi: v2 });

      const result = await checkAccountExists(strategy, EVM, "EthWallet");

      expect(result).toEqual({ exists: false, accounts: [] });
    });
  });

  describe("configuration validation", () => {
    it("should handle empty config object", () => {
      expect(() => createCompositeAccountStrategy({})).not.toThrow();
    });

    it("should handle undefined indexer", () => {
      const strategy = createCompositeAccountStrategy({ indexer: undefined });
      const strategies = (strategy as any).strategies;
      expect(strategies).toHaveLength(1);
      expect(strategies[0]).toBeInstanceOf(EmptyAccountStrategy);
    });

    it("should handle undefined aaApi", () => {
      const strategy = createCompositeAccountStrategy({ aaApi: undefined });
      const strategies = (strategy as any).strategies;
      expect(strategies).toHaveLength(1);
      expect(strategies[0]).toBeInstanceOf(EmptyAccountStrategy);
    });

    it("should handle undefined rpc", () => {
      const strategy = createCompositeAccountStrategy({ rpc: undefined });
      const strategies = (strategy as any).strategies;
      expect(strategies).toHaveLength(1);
      expect(strategies[0]).toBeInstanceOf(EmptyAccountStrategy);
    });
  });
});
