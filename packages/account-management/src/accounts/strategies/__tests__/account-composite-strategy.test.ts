/**
 * Unit tests for CompositeAccountStrategy
 */

import { describe, it, expect, vi } from "vitest";
import { CompositeAccountStrategy } from "../account-composite-strategy";
import { AUTHENTICATOR_TYPE } from "@burnt-labs/signers";
import type { IndexerStrategy } from "../../../types/indexer";

// Local mock data to avoid circular dependency with test-utils
const mockSmartAccounts = {
  withSecp256k1: {
    id: "xion1z70cvc08qv5764zeg3dykcyymj5z6nu4sqr7x8",
    codeId: 1,
    authenticators: [
      {
        id: "03a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5e5",
        type: AUTHENTICATOR_TYPE.Secp256K1,
        authenticatorIndex: 0,
      },
    ],
  },
};

describe("CompositeAccountStrategy", () => {
  // Helper to create a mock strategy
  const createMockStrategy = (
    name: string,
    behavior: "success" | "empty" | "error",
    accounts = [mockSmartAccounts.withSecp256k1],
  ): IndexerStrategy => {
    return {
      fetchSmartAccounts: vi.fn(async () => {
        if (behavior === "error") {
          throw new Error(`${name} failed`);
        }
        if (behavior === "empty") {
          return [];
        }
        return accounts;
      }),
      constructor: { name } as any,
    };
  };

  describe("constructor", () => {
    it("should throw error when no strategies provided", () => {
      expect(() => new CompositeAccountStrategy()).toThrow(
        "CompositeAccountStrategy requires at least one strategy",
      );
    });

    it("should accept single strategy", () => {
      const strategy = createMockStrategy("TestStrategy", "success");
      expect(() => new CompositeAccountStrategy(strategy)).not.toThrow();
    });

    it("should accept multiple strategies", () => {
      const strategy1 = createMockStrategy("Strategy1", "success");
      const strategy2 = createMockStrategy("Strategy2", "success");
      expect(
        () => new CompositeAccountStrategy(strategy1, strategy2),
      ).not.toThrow();
    });
  });

  describe("fetchSmartAccounts", () => {
    it("should return result from first successful strategy", async () => {
      const strategy1 = createMockStrategy("Strategy1", "success");
      const strategy2 = createMockStrategy("Strategy2", "success");
      const composite = new CompositeAccountStrategy(strategy1, strategy2);

      const result = await composite.fetchSmartAccounts(
        "test-auth",
        AUTHENTICATOR_TYPE.Secp256K1,
      );

      expect(result).toEqual([mockSmartAccounts.withSecp256k1]);
      expect(strategy1.fetchSmartAccounts).toHaveBeenCalledOnce();
      expect(strategy2.fetchSmartAccounts).not.toHaveBeenCalled();
    });

    it("should fallback to second strategy when first returns empty", async () => {
      const strategy1 = createMockStrategy("Strategy1", "empty");
      const strategy2 = createMockStrategy("Strategy2", "success");
      const composite = new CompositeAccountStrategy(strategy1, strategy2);

      const result = await composite.fetchSmartAccounts(
        "test-auth",
        AUTHENTICATOR_TYPE.Secp256K1,
      );

      expect(result).toEqual([mockSmartAccounts.withSecp256k1]);
      expect(strategy1.fetchSmartAccounts).toHaveBeenCalledOnce();
      expect(strategy2.fetchSmartAccounts).toHaveBeenCalledOnce();
    });

    it("should fallback to second strategy when first throws error", async () => {
      const strategy1 = createMockStrategy("Strategy1", "error");
      const strategy2 = createMockStrategy("Strategy2", "success");
      const composite = new CompositeAccountStrategy(strategy1, strategy2);

      const result = await composite.fetchSmartAccounts(
        "test-auth",
        AUTHENTICATOR_TYPE.Secp256K1,
      );

      expect(result).toEqual([mockSmartAccounts.withSecp256k1]);
      expect(strategy1.fetchSmartAccounts).toHaveBeenCalledOnce();
      expect(strategy2.fetchSmartAccounts).toHaveBeenCalledOnce();
    });

    it("should return empty array when all strategies return empty", async () => {
      const strategy1 = createMockStrategy("Strategy1", "empty");
      const strategy2 = createMockStrategy("Strategy2", "empty");
      const composite = new CompositeAccountStrategy(strategy1, strategy2);

      const result = await composite.fetchSmartAccounts(
        "test-auth",
        AUTHENTICATOR_TYPE.Secp256K1,
      );

      expect(result).toEqual([]);
      expect(strategy1.fetchSmartAccounts).toHaveBeenCalledOnce();
      expect(strategy2.fetchSmartAccounts).toHaveBeenCalledOnce();
    });

    it("should throw aggregated error when all strategies fail", async () => {
      const strategy1 = createMockStrategy("Strategy1", "error");
      const strategy2 = createMockStrategy("Strategy2", "error");
      const composite = new CompositeAccountStrategy(strategy1, strategy2);

      await expect(
        composite.fetchSmartAccounts("test-auth", AUTHENTICATOR_TYPE.Secp256K1),
      ).rejects.toThrow("All account discovery strategies failed");

      await expect(
        composite.fetchSmartAccounts("test-auth", AUTHENTICATOR_TYPE.Secp256K1),
      ).rejects.toThrow("Strategy1 failed");

      await expect(
        composite.fetchSmartAccounts("test-auth", AUTHENTICATOR_TYPE.Secp256K1),
      ).rejects.toThrow("Strategy2 failed");
    });

    it("should try all strategies in sequence", async () => {
      const strategy1 = createMockStrategy("Strategy1", "empty");
      const strategy2 = createMockStrategy("Strategy2", "error");
      const strategy3 = createMockStrategy("Strategy3", "success");
      const composite = new CompositeAccountStrategy(
        strategy1,
        strategy2,
        strategy3,
      );

      const result = await composite.fetchSmartAccounts(
        "test-auth",
        AUTHENTICATOR_TYPE.Secp256K1,
      );

      expect(result).toEqual([mockSmartAccounts.withSecp256k1]);
      expect(strategy1.fetchSmartAccounts).toHaveBeenCalledOnce();
      expect(strategy2.fetchSmartAccounts).toHaveBeenCalledOnce();
      expect(strategy3.fetchSmartAccounts).toHaveBeenCalledOnce();
    });

    it("should pass authenticator type to all strategies", async () => {
      const strategy1 = createMockStrategy("Strategy1", "empty");
      const strategy2 = createMockStrategy("Strategy2", "success");
      const composite = new CompositeAccountStrategy(strategy1, strategy2);

      await composite.fetchSmartAccounts(
        "test-auth",
        AUTHENTICATOR_TYPE.EthWallet,
      );

      expect(strategy1.fetchSmartAccounts).toHaveBeenCalledWith(
        "test-auth",
        AUTHENTICATOR_TYPE.EthWallet,
      );
      expect(strategy2.fetchSmartAccounts).toHaveBeenCalledWith(
        "test-auth",
        AUTHENTICATOR_TYPE.EthWallet,
      );
    });

    it("should handle mixed success/error/empty scenarios", async () => {
      const strategy1 = createMockStrategy("Strategy1", "error");
      const strategy2 = createMockStrategy("Strategy2", "empty");
      const strategy3 = createMockStrategy("Strategy3", "error");
      const strategy4 = createMockStrategy("Strategy4", "success");
      const composite = new CompositeAccountStrategy(
        strategy1,
        strategy2,
        strategy3,
        strategy4,
      );

      const result = await composite.fetchSmartAccounts(
        "test-auth",
        AUTHENTICATOR_TYPE.Secp256K1,
      );

      expect(result).toEqual([mockSmartAccounts.withSecp256k1]);
    });

    it("should short-circuit on first success", async () => {
      const strategy1 = createMockStrategy("Strategy1", "success");
      const strategy2 = createMockStrategy("Strategy2", "success");
      const strategy3 = createMockStrategy("Strategy3", "success");
      const composite = new CompositeAccountStrategy(
        strategy1,
        strategy2,
        strategy3,
      );

      await composite.fetchSmartAccounts(
        "test-auth",
        AUTHENTICATOR_TYPE.Secp256K1,
      );

      expect(strategy1.fetchSmartAccounts).toHaveBeenCalledOnce();
      expect(strategy2.fetchSmartAccounts).not.toHaveBeenCalled();
      expect(strategy3.fetchSmartAccounts).not.toHaveBeenCalled();
    });

    it("should handle non-Error exceptions", async () => {
      const strategy: IndexerStrategy = {
        fetchSmartAccounts: vi.fn(async () => {
          throw "string error"; // Non-Error exception
        }),
        constructor: { name: "TestStrategy" } as any,
      };
      const fallback = createMockStrategy("Fallback", "success");
      const composite = new CompositeAccountStrategy(strategy, fallback);

      const result = await composite.fetchSmartAccounts(
        "test-auth",
        AUTHENTICATOR_TYPE.Secp256K1,
      );

      expect(result).toEqual([mockSmartAccounts.withSecp256k1]);
    });
  });
});
