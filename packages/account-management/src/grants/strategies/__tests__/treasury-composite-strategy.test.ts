import { describe, it, expect, vi } from "vitest";

import { CompositeTreasuryStrategy } from "../treasury-composite-strategy";
import type { TreasuryStrategy } from "../../../types/treasury";

// Local mock data to avoid circular dependency
const mockTreasuryConfigs = {
  basic: {
    redirect_url: "https://dashboard.burnt.com",
    icon_url: "https://dashboard.burnt.com/icon.png",
    metadata: '{"name": "Test Treasury"}', // metadata is a JSON string
  },
};

describe("CompositeTreasuryStrategy", () => {
  // Helper to create a mock strategy
  const createMockStrategy = (
    name: string,
    behavior: "success" | "null" | "error",
    config = mockTreasuryConfigs.basic,
  ): TreasuryStrategy => {
    return {
      fetchTreasuryConfig: vi.fn(async () => {
        if (behavior === "error") {
          throw new Error(`${name} failed`);
        }
        if (behavior === "null") {
          return null;
        }
        return config;
      }),
      constructor: { name } as any,
    };
  };

  describe("constructor", () => {
    it("should throw error when no strategies provided", () => {
      expect(() => new CompositeTreasuryStrategy()).toThrow(
        "CompositeTreasuryStrategy requires at least one strategy",
      );
    });

    it("should accept single strategy", () => {
      const strategy = createMockStrategy("TestStrategy", "success");
      expect(() => new CompositeTreasuryStrategy(strategy)).not.toThrow();
    });

    it("should accept multiple strategies", () => {
      const strategy1 = createMockStrategy("Strategy1", "success");
      const strategy2 = createMockStrategy("Strategy2", "success");
      expect(
        () => new CompositeTreasuryStrategy(strategy1, strategy2),
      ).not.toThrow();
    });
  });

  describe("fetchTreasuryConfig", () => {
    const mockClient = {};

    it("should return result from first successful strategy", async () => {
      const strategy1 = createMockStrategy("Strategy1", "success");
      const strategy2 = createMockStrategy("Strategy2", "success");
      const composite = new CompositeTreasuryStrategy(strategy1, strategy2);

      const result = await composite.fetchTreasuryConfig(
        "xion1treasury",
        mockClient,
      );

      expect(result).toEqual(mockTreasuryConfigs.basic);
      expect(strategy1.fetchTreasuryConfig).toHaveBeenCalledOnce();
      expect(strategy2.fetchTreasuryConfig).not.toHaveBeenCalled();
    });

    it("should fallback to second strategy when first returns null", async () => {
      const strategy1 = createMockStrategy("Strategy1", "null");
      const strategy2 = createMockStrategy("Strategy2", "success");
      const composite = new CompositeTreasuryStrategy(strategy1, strategy2);

      const result = await composite.fetchTreasuryConfig(
        "xion1treasury",
        mockClient,
      );

      expect(result).toEqual(mockTreasuryConfigs.basic);
      expect(strategy1.fetchTreasuryConfig).toHaveBeenCalledOnce();
      expect(strategy2.fetchTreasuryConfig).toHaveBeenCalledOnce();
    });

    it("should fallback to second strategy when first throws error", async () => {
      const strategy1 = createMockStrategy("Strategy1", "error");
      const strategy2 = createMockStrategy("Strategy2", "success");
      const composite = new CompositeTreasuryStrategy(strategy1, strategy2);

      const result = await composite.fetchTreasuryConfig(
        "xion1treasury",
        mockClient,
      );

      expect(result).toEqual(mockTreasuryConfigs.basic);
      expect(strategy1.fetchTreasuryConfig).toHaveBeenCalledOnce();
      expect(strategy2.fetchTreasuryConfig).toHaveBeenCalledOnce();
    });

    it("should return null when all strategies return null", async () => {
      const strategy1 = createMockStrategy("Strategy1", "null");
      const strategy2 = createMockStrategy("Strategy2", "null");
      const composite = new CompositeTreasuryStrategy(strategy1, strategy2);

      const result = await composite.fetchTreasuryConfig(
        "xion1treasury",
        mockClient,
      );

      expect(result).toBeNull();
      expect(strategy1.fetchTreasuryConfig).toHaveBeenCalledOnce();
      expect(strategy2.fetchTreasuryConfig).toHaveBeenCalledOnce();
    });

    it("should throw aggregated error when all strategies fail", async () => {
      const strategy1 = createMockStrategy("Strategy1", "error");
      const strategy2 = createMockStrategy("Strategy2", "error");
      const composite = new CompositeTreasuryStrategy(strategy1, strategy2);

      await expect(
        composite.fetchTreasuryConfig("xion1treasury", mockClient),
      ).rejects.toThrow("All treasury strategies failed");

      await expect(
        composite.fetchTreasuryConfig("xion1treasury", mockClient),
      ).rejects.toThrow("Strategy1 failed");

      await expect(
        composite.fetchTreasuryConfig("xion1treasury", mockClient),
      ).rejects.toThrow("Strategy2 failed");
    });

    it("should include treasury address in error message", async () => {
      const strategy = createMockStrategy("TestStrategy", "error");
      const composite = new CompositeTreasuryStrategy(strategy);

      await expect(
        composite.fetchTreasuryConfig("xion1custom", mockClient),
      ).rejects.toThrow("xion1custom");
    });

    it("should try all strategies in sequence", async () => {
      const strategy1 = createMockStrategy("Strategy1", "null");
      const strategy2 = createMockStrategy("Strategy2", "error");
      const strategy3 = createMockStrategy("Strategy3", "success");
      const composite = new CompositeTreasuryStrategy(
        strategy1,
        strategy2,
        strategy3,
      );

      const result = await composite.fetchTreasuryConfig(
        "xion1treasury",
        mockClient,
      );

      expect(result).toEqual(mockTreasuryConfigs.basic);
      expect(strategy1.fetchTreasuryConfig).toHaveBeenCalledOnce();
      expect(strategy2.fetchTreasuryConfig).toHaveBeenCalledOnce();
      expect(strategy3.fetchTreasuryConfig).toHaveBeenCalledOnce();
    });

    it("should pass treasury address and client to all strategies", async () => {
      const strategy1 = createMockStrategy("Strategy1", "null");
      const strategy2 = createMockStrategy("Strategy2", "success");
      const composite = new CompositeTreasuryStrategy(strategy1, strategy2);

      await composite.fetchTreasuryConfig("xion1treasury", mockClient);

      expect(strategy1.fetchTreasuryConfig).toHaveBeenCalledWith(
        "xion1treasury",
        mockClient,
      );
      expect(strategy2.fetchTreasuryConfig).toHaveBeenCalledWith(
        "xion1treasury",
        mockClient,
      );
    });

    it("should short-circuit on first success", async () => {
      const strategy1 = createMockStrategy("Strategy1", "success");
      const strategy2 = createMockStrategy("Strategy2", "success");
      const strategy3 = createMockStrategy("Strategy3", "success");
      const composite = new CompositeTreasuryStrategy(
        strategy1,
        strategy2,
        strategy3,
      );

      await composite.fetchTreasuryConfig("xion1treasury", mockClient);

      expect(strategy1.fetchTreasuryConfig).toHaveBeenCalledOnce();
      expect(strategy2.fetchTreasuryConfig).not.toHaveBeenCalled();
      expect(strategy3.fetchTreasuryConfig).not.toHaveBeenCalled();
    });

    it("should handle mixed success/error/null scenarios", async () => {
      const strategy1 = createMockStrategy("Strategy1", "error");
      const strategy2 = createMockStrategy("Strategy2", "null");
      const strategy3 = createMockStrategy("Strategy3", "error");
      const strategy4 = createMockStrategy("Strategy4", "success");
      const composite = new CompositeTreasuryStrategy(
        strategy1,
        strategy2,
        strategy3,
        strategy4,
      );

      const result = await composite.fetchTreasuryConfig(
        "xion1treasury",
        mockClient,
      );

      expect(result).toEqual(mockTreasuryConfigs.basic);
    });

    it("should handle non-Error exceptions", async () => {
      const strategy: TreasuryStrategy = {
        fetchTreasuryConfig: vi.fn(async () => {
          throw "string error";
        }),
        constructor: { name: "TestStrategy" } as any,
      };
      const fallback = createMockStrategy("Fallback", "success");
      const composite = new CompositeTreasuryStrategy(strategy, fallback);

      const result = await composite.fetchTreasuryConfig(
        "xion1treasury",
        mockClient,
      );

      expect(result).toEqual(mockTreasuryConfigs.basic);
    });
  });
});
