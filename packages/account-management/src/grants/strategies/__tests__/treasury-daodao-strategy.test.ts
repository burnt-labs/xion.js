import { describe, it, expect, vi, beforeEach } from "vitest";

import { DaoDaoTreasuryStrategy } from "../treasury-daodao-strategy";

// Local mock data to avoid circular dependency
const mockGrantTypeUrls = {
  genericAuthorization: "/cosmos.authz.v1beta1.GenericAuthorization",
  sendAuthorization: "/cosmos.bank.v1beta1.SendAuthorization",
  basicAllowance: "/cosmos.feegrant.v1beta1.BasicAllowance",
};

const mockTreasuryParams = {
  basic: {
    redirect_url: "https://dashboard.burnt.com",
    icon_url: "https://dashboard.burnt.com/icon.png",
    metadata: '{"name": "Test Treasury"}', // metadata is a JSON string
  },
};

const mockDaoTreasuryResponses = {
  basic: {
    config: {
      name: "Test DAO Treasury",
      description: "A test DAO treasury",
      automatically_add_cw20s: false,
      automatically_add_cw721s: false,
    },
    grant_configs: [],
    params: mockTreasuryParams.basic,
  },
};

global.fetch = vi.fn();

describe("DaoDaoTreasuryStrategy", () => {
  let strategy: DaoDaoTreasuryStrategy;

  beforeEach(() => {
    vi.clearAllMocks();
    strategy = new DaoDaoTreasuryStrategy({
      indexerUrl: "https://daodao.example.com",
    });
  });

  describe("fetchTreasuryConfig", () => {
    it("should fetch treasury config from DAO DAO indexer", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          grantConfigs: {
            [mockGrantTypeUrls.genericAuthorization]: {
              authorization: {
                type_url: mockGrantTypeUrls.genericAuthorization,
                value: "base64encodedvalue",
              },
              description: "Execute contracts",
              optional: false,
            },
          },
          params: mockTreasuryParams.basic,
        }),
      });

      const mockClient = {
        getChainId: vi.fn().mockResolvedValue("xion-testnet-2"),
      };
      const result = await strategy.fetchTreasuryConfig(
        "xion1treasury",
        mockClient,
      );

      expect(result).toBeDefined();
      expect(result?.grantConfigs).toHaveLength(1);
      expect(result?.params).toBeDefined();
    });

    it("should construct correct indexer URL", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          grantConfigs: {},
          params: mockTreasuryParams.basic,
        }),
      });

      await strategy.fetchTreasuryConfig("xion1treasury", {
        getChainId: vi.fn().mockResolvedValue("xion-testnet-2"),
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/xion1treasury/xion/treasury/all"),
        expect.anything(),
      );
    });

    it("should throw error for 404 response", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      await expect(
        strategy.fetchTreasuryConfig("xion1treasury", {
          getChainId: vi.fn().mockResolvedValue("xion-testnet-2"),
        }),
      ).rejects.toThrow("DaoDao treasury strategy failed");
    });

    it("should throw error for non-404 HTTP errors", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
      });

      await expect(
        strategy.fetchTreasuryConfig("xion1treasury", {
          getChainId: vi.fn().mockResolvedValue("xion-testnet-2"),
        }),
      ).rejects.toThrow("DaoDao treasury strategy failed");
    });

    it("should handle network errors", async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

      await expect(
        strategy.fetchTreasuryConfig("xion1treasury", {
          getChainId: vi.fn().mockResolvedValue("xion-testnet-2"),
        }),
      ).rejects.toThrow("DaoDao treasury strategy failed");
    });

    it("should transform grantConfigs from object to array", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          grantConfigs: {
            [mockGrantTypeUrls.genericAuthorization]: {
              authorization: {
                type_url: mockGrantTypeUrls.genericAuthorization,
                value: "val1",
              },
              description: "Execute",
            },
            [mockGrantTypeUrls.sendAuthorization]: {
              authorization: {
                type_url: mockGrantTypeUrls.sendAuthorization,
                value: "val2",
              },
              description: "Send",
            },
          },
          params: mockTreasuryParams.basic,
        }),
      });

      const result = await strategy.fetchTreasuryConfig("xion1treasury", {
        getChainId: vi.fn().mockResolvedValue("xion-testnet-2"),
      });

      expect(Array.isArray(result?.grantConfigs)).toBe(true);
      expect(result?.grantConfigs).toHaveLength(2);
    });

    it("should validate redirect_url is safe", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          grantConfigs: {},
          params: {
            redirect_url: "javascript:alert(1)",
            icon_url: "https://example.com/icon.png",
            metadata: '{"test": true}',
          },
        }),
      });

      await expect(
        strategy.fetchTreasuryConfig("xion1treasury", {}),
      ).rejects.toThrow();
    });

    it("should use custom timeout when provided", async () => {
      const customStrategy = new DaoDaoTreasuryStrategy({
        indexerUrl: "https://daodao.example.com",
        timeout: 5000,
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          grantConfigs: {},
          params: mockTreasuryParams.basic,
        }),
      });

      await customStrategy.fetchTreasuryConfig("xion1treasury", {
        getChainId: vi.fn().mockResolvedValue("xion-testnet-2"),
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        }),
      );
    });

    it("should handle empty grantConfigs object", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          grantConfigs: {},
          params: mockTreasuryParams.basic,
        }),
      });

      const result = await strategy.fetchTreasuryConfig("xion1treasury", {
        getChainId: vi.fn().mockResolvedValue("xion-testnet-2"),
      });

      expect(result?.grantConfigs).toEqual([]);
    });
  });
});
