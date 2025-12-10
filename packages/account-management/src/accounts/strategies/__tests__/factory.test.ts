/**
 * Unit tests for createCompositeAccountStrategy factory function
 */

import { describe, it, expect } from "vitest";
import { createCompositeAccountStrategy } from "../factory";
import { CompositeAccountStrategy } from "../account-composite-strategy";
import { NumiaAccountStrategy } from "../account-numia-strategy";
import { SubqueryAccountStrategy } from "../account-subquery-strategy";
import { RpcAccountStrategy } from "../account-rpc-strategy";
import { EmptyAccountStrategy } from "../account-empty-strategy";

describe("createCompositeAccountStrategy", () => {
  describe("strategy composition", () => {
    it("should create strategy with only EmptyAccountStrategy when no config provided", () => {
      const strategy = createCompositeAccountStrategy({});

      expect(strategy).toBeInstanceOf(CompositeAccountStrategy);
      const strategies = (strategy as any).strategies;
      expect(strategies).toHaveLength(1);
      expect(strategies[0]).toBeInstanceOf(EmptyAccountStrategy);
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

    it("should always include EmptyAccountStrategy as last fallback", () => {
      const configs = [
        {},
        { indexer: { type: "numia" as const, url: "https://test.com" } },
        {
          rpc: {
            rpcUrl: "https://rpc.com",
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

    it("should handle undefined rpc", () => {
      const strategy = createCompositeAccountStrategy({ rpc: undefined });
      const strategies = (strategy as any).strategies;
      expect(strategies).toHaveLength(1);
      expect(strategies[0]).toBeInstanceOf(EmptyAccountStrategy);
    });
  });
});
