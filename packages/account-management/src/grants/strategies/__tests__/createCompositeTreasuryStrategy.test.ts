/**
 * Unit tests for createCompositeTreasuryStrategy factory function
 */

import { describe, it, expect } from "vitest";
import { createCompositeTreasuryStrategy } from "../createCompositeTreasuryStrategy";
import { CompositeTreasuryStrategy } from "../treasury-composite-strategy";
import { DaoDaoTreasuryStrategy } from "../treasury-daodao-strategy";
import { DirectQueryTreasuryStrategy } from "../treasury-direct-query-strategy";

describe("createCompositeTreasuryStrategy", () => {
  describe("strategy composition", () => {
    it("should create strategy with only DirectQueryTreasuryStrategy by default", () => {
      const strategy = createCompositeTreasuryStrategy();

      expect(strategy).toBeInstanceOf(CompositeTreasuryStrategy);
      const strategies = (strategy as any).strategies;
      expect(strategies).toHaveLength(1);
      expect(strategies[0]).toBeInstanceOf(DirectQueryTreasuryStrategy);
    });

    it("should include DaoDaoTreasuryStrategy when daodao config provided", () => {
      const strategy = createCompositeTreasuryStrategy({
        daodao: {
          indexerUrl: "https://daodao.example.com",
        },
      });

      const strategies = (strategy as any).strategies;
      expect(strategies).toHaveLength(2);
      expect(strategies[0]).toBeInstanceOf(DaoDaoTreasuryStrategy);
      expect(strategies[1]).toBeInstanceOf(DirectQueryTreasuryStrategy);
    });

    it("should exclude DirectQueryTreasuryStrategy when includeDirectQuery is false", () => {
      const strategy = createCompositeTreasuryStrategy({
        daodao: {
          indexerUrl: "https://daodao.example.com",
        },
        includeDirectQuery: false,
      });

      const strategies = (strategy as any).strategies;
      expect(strategies).toHaveLength(1);
      expect(strategies[0]).toBeInstanceOf(DaoDaoTreasuryStrategy);
    });

    it("should throw error when no strategies are enabled", () => {
      expect(() =>
        createCompositeTreasuryStrategy({
          includeDirectQuery: false,
        }),
      ).toThrow("At least one strategy must be enabled");
    });

    it("should pass indexerUrl to DaoDaoTreasuryStrategy", () => {
      const strategy = createCompositeTreasuryStrategy({
        daodao: {
          indexerUrl: "https://custom.indexer.com",
        },
      });

      const strategies = (strategy as any).strategies;
      const daodaoStrategy = strategies[0] as DaoDaoTreasuryStrategy;
      expect((daodaoStrategy as any).config.indexerUrl).toBe(
        "https://custom.indexer.com",
      );
    });

    it("should include DirectQueryTreasuryStrategy when includeDirectQuery is true", () => {
      const strategy = createCompositeTreasuryStrategy({
        includeDirectQuery: true,
      });

      const strategies = (strategy as any).strategies;
      expect(strategies[0]).toBeInstanceOf(DirectQueryTreasuryStrategy);
    });

    it("should create full fallback chain: DaoDao -> DirectQuery", () => {
      const strategy = createCompositeTreasuryStrategy({
        daodao: {
          indexerUrl: "https://daodao.example.com",
        },
        includeDirectQuery: true,
      });

      const strategies = (strategy as any).strategies;
      expect(strategies).toHaveLength(2);
      expect(strategies[0]).toBeInstanceOf(DaoDaoTreasuryStrategy);
      expect(strategies[1]).toBeInstanceOf(DirectQueryTreasuryStrategy);
    });

    it("should handle empty config object", () => {
      const strategy = createCompositeTreasuryStrategy({});

      const strategies = (strategy as any).strategies;
      expect(strategies).toHaveLength(1);
      expect(strategies[0]).toBeInstanceOf(DirectQueryTreasuryStrategy);
    });

    it("should handle undefined config", () => {
      const strategy = createCompositeTreasuryStrategy(undefined);

      const strategies = (strategy as any).strategies;
      expect(strategies).toHaveLength(1);
      expect(strategies[0]).toBeInstanceOf(DirectQueryTreasuryStrategy);
    });
  });

  describe("configuration validation", () => {
    it("should handle undefined daodao", () => {
      const strategy = createCompositeTreasuryStrategy({
        daodao: undefined,
      });

      const strategies = (strategy as any).strategies;
      expect(strategies).toHaveLength(1);
      expect(strategies[0]).toBeInstanceOf(DirectQueryTreasuryStrategy);
    });

    it("should throw error when both strategies are disabled", () => {
      expect(() =>
        createCompositeTreasuryStrategy({
          daodao: undefined,
          includeDirectQuery: false,
        }),
      ).toThrow("At least one strategy must be enabled");
    });

    it("should default includeDirectQuery to true", () => {
      const strategy = createCompositeTreasuryStrategy({});

      const strategies = (strategy as any).strategies;
      expect(
        strategies.some((s: any) => s instanceof DirectQueryTreasuryStrategy),
      ).toBe(true);
    });
  });

  describe("strategy order", () => {
    it("should place DaoDaoTreasuryStrategy first when configured", () => {
      const strategy = createCompositeTreasuryStrategy({
        daodao: {
          indexerUrl: "https://daodao.example.com",
        },
      });

      const strategies = (strategy as any).strategies;
      expect(strategies[0]).toBeInstanceOf(DaoDaoTreasuryStrategy);
    });

    it("should place DirectQueryTreasuryStrategy last", () => {
      const strategy = createCompositeTreasuryStrategy({
        daodao: {
          indexerUrl: "https://daodao.example.com",
        },
      });

      const strategies = (strategy as any).strategies;
      expect(strategies[strategies.length - 1]).toBeInstanceOf(
        DirectQueryTreasuryStrategy,
      );
    });
  });
});
