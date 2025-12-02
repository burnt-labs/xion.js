/**
 * Unit tests for SubqueryAccountStrategy
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { SubqueryAccountStrategy } from "../account-subquery-strategy";
import { AUTHENTICATOR_TYPE } from "@burnt-labs/signers";

global.fetch = vi.fn();

describe("SubqueryAccountStrategy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchSmartAccounts", () => {
    it("should return accounts when found", async () => {
      const strategy = new SubqueryAccountStrategy(
        "https://subquery.example.com/graphql",
        1
      );

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            smartAccounts: {
              nodes: [
                {
                  id: "xion1test",
                  authenticators: {
                    nodes: [
                      {
                        id: "auth-0",
                        type: "Secp256K1",
                        authenticator: "test-auth",
                        authenticatorIndex: 0,
                        version: "1.0.0",
                      },
                    ],
                  },
                },
              ],
            },
          },
        }),
      });

      const result = await strategy.fetchSmartAccounts(
        "test-auth",
        AUTHENTICATOR_TYPE.Secp256K1
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("xion1test");
      expect(result[0].codeId).toBe(1);
    });

    it("should use configured codeId", async () => {
      const strategy = new SubqueryAccountStrategy(
        "https://subquery.example.com/graphql",
        42
      );

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { smartAccounts: { nodes: [{ id: "xion1test", authenticators: { nodes: [] } }] } },
        }),
      });

      const result = await strategy.fetchSmartAccounts("test", AUTHENTICATOR_TYPE.Secp256K1);
      expect(result[0].codeId).toBe(42);
    });

    it("should handle network errors", async () => {
      const strategy = new SubqueryAccountStrategy("https://subquery.example.com", 1);

      (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

      await expect(
        strategy.fetchSmartAccounts("test", AUTHENTICATOR_TYPE.Secp256K1)
      ).rejects.toThrow("Subquery account strategy failed");
    });

    it("should send correct GraphQL query", async () => {
      const strategy = new SubqueryAccountStrategy("https://subquery.example.com", 1);

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { smartAccounts: { nodes: [] } } }),
      });

      await strategy.fetchSmartAccounts("test-auth", AUTHENTICATOR_TYPE.Secp256K1);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://subquery.example.com",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );

      const callBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(callBody.variables.authenticator).toBe("test-auth");
    });
  });
});
