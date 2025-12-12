import { describe, it, expect, vi, beforeEach } from "vitest";

import { DirectQueryTreasuryStrategy } from "../treasury-direct-query-strategy";

// Local mock data to avoid circular dependency
const mockGrantTypeUrls = {
  genericAuthorization: "/cosmos.authz.v1beta1.GenericAuthorization",
  sendAuthorization: "/cosmos.bank.v1beta1.SendAuthorization",
  stakeAuthorization: "/cosmos.staking.v1beta1.StakeAuthorization",
  basicAllowance: "/cosmos.feegrant.v1beta1.BasicAllowance",
};

const mockGrantConfigs = {
  genericExecute: {
    authorization: {
      type_url: mockGrantTypeUrls.genericAuthorization,
      value: Buffer.from(
        JSON.stringify({
          msg: "/cosmwasm.wasm.v1.MsgExecuteContract",
        }),
      ).toString("base64"),
    },
    description: "Execute smart contracts",
    optional: false,
  },
  send: {
    authorization: {
      type_url: mockGrantTypeUrls.sendAuthorization,
      value: Buffer.from(
        JSON.stringify({
          spend_limit: [{ denom: "uxion", amount: "1000000" }],
        }),
      ).toString("base64"),
    },
    description: "Send tokens",
    optional: true,
  },
  staking: {
    authorization: {
      type_url: mockGrantTypeUrls.stakeAuthorization,
      value: Buffer.from(
        JSON.stringify({
          authorization_type: "AUTHORIZATION_TYPE_DELEGATE",
          max_tokens: { denom: "uxion", amount: "5000000" },
        }),
      ).toString("base64"),
    },
    description: "Delegate tokens to validators",
    optional: true,
  },
  feeGrant: {
    authorization: {
      type_url: mockGrantTypeUrls.basicAllowance,
      value: Buffer.from(
        JSON.stringify({
          spend_limit: [{ denom: "uxion", amount: "100000" }],
        }),
      ).toString("base64"),
    },
    description: "Cover transaction fees",
    optional: false,
  },
};

const mockTreasuryParams = {
  basic: {
    redirect_url: "https://dashboard.burnt.com",
    icon_url: "https://dashboard.burnt.com/icon.png",
    metadata: "Test Treasury",
  },
};

const mockTreasuryContractResponses = {
  typeUrlsResponse: {
    basic: [
      mockGrantTypeUrls.genericAuthorization,
      mockGrantTypeUrls.basicAllowance,
    ],
  },
};

describe("DirectQueryTreasuryStrategy", () => {
  let strategy: DirectQueryTreasuryStrategy;
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock client with queryContractSmart method
    mockClient = {
      queryContractSmart: vi.fn(),
    };

    strategy = new DirectQueryTreasuryStrategy();
  });

  describe("fetchTreasuryConfig", () => {
    it("should fetch treasury config successfully", async () => {
      // Mock grant_config_type_urls query
      mockClient.queryContractSmart
        .mockResolvedValueOnce(
          mockTreasuryContractResponses.typeUrlsResponse.basic,
        )
        // Mock grant_config_by_type_url queries
        .mockResolvedValueOnce(mockGrantConfigs.genericExecute)
        .mockResolvedValueOnce(mockGrantConfigs.feeGrant)
        // Mock params query
        .mockResolvedValueOnce(mockTreasuryParams.basic);

      const result = await strategy.fetchTreasuryConfig(
        "xion1treasury",
        mockClient,
      );

      expect(result).toBeDefined();
      expect(result?.grantConfigs).toHaveLength(2);
      // metadata is validated as URL, so "Test Treasury" gets sanitized to ""
      expect(result?.params).toEqual({
        ...mockTreasuryParams.basic,
        metadata: "", // Non-URL metadata gets sanitized
      });
    });

    it("should return null when no grant configs found", async () => {
      mockClient.queryContractSmart.mockResolvedValueOnce([]);

      const result = await strategy.fetchTreasuryConfig(
        "xion1treasury",
        mockClient,
      );

      expect(result).toBeNull();
    });

    it("should handle contract not found error", async () => {
      mockClient.queryContractSmart.mockRejectedValueOnce(
        new Error("contract: not found"),
      );

      await expect(
        strategy.fetchTreasuryConfig("xion1treasury", mockClient),
      ).rejects.toThrow("Direct query treasury strategy failed");
    });

    it("should query all grant configs by type URL", async () => {
      const typeUrls = [
        mockGrantTypeUrls.genericAuthorization,
        mockGrantTypeUrls.sendAuthorization,
      ];

      mockClient.queryContractSmart
        .mockResolvedValueOnce(typeUrls)
        .mockResolvedValueOnce(mockGrantConfigs.genericExecute)
        .mockResolvedValueOnce(mockGrantConfigs.send)
        .mockResolvedValueOnce(mockTreasuryParams.basic);

      const result = await strategy.fetchTreasuryConfig(
        "xion1treasury",
        mockClient,
      );

      expect(mockClient.queryContractSmart).toHaveBeenCalledWith(
        "xion1treasury",
        { grant_config_type_urls: {} },
      );

      expect(mockClient.queryContractSmart).toHaveBeenCalledWith(
        "xion1treasury",
        {
          grant_config_by_type_url: {
            msg_type_url: mockGrantTypeUrls.genericAuthorization,
          },
        },
      );

      expect(result?.grantConfigs).toHaveLength(2);
    });

    it("should fetch treasury params", async () => {
      mockClient.queryContractSmart
        .mockResolvedValueOnce([mockGrantTypeUrls.genericAuthorization])
        .mockResolvedValueOnce(mockGrantConfigs.genericExecute)
        .mockResolvedValueOnce(mockTreasuryParams.basic);

      await strategy.fetchTreasuryConfig("xion1treasury", mockClient);

      expect(mockClient.queryContractSmart).toHaveBeenCalledWith(
        "xion1treasury",
        { params: {} },
      );
    });

    it("should handle invalid grant config format", async () => {
      mockClient.queryContractSmart
        .mockResolvedValueOnce([mockGrantTypeUrls.genericAuthorization])
        .mockResolvedValueOnce({ authorization: {} }); // Missing description

      await expect(
        strategy.fetchTreasuryConfig("xion1treasury", mockClient),
      ).rejects.toThrow("Direct query treasury strategy failed");
    });

    it("should handle params query error gracefully", async () => {
      mockClient.queryContractSmart
        .mockResolvedValueOnce([mockGrantTypeUrls.genericAuthorization])
        .mockResolvedValueOnce(mockGrantConfigs.genericExecute)
        .mockRejectedValueOnce(new Error("params query failed"));

      const result = await strategy.fetchTreasuryConfig(
        "xion1treasury",
        mockClient,
      );

      // Should return result with empty params instead of throwing
      expect(result).toBeDefined();
      expect(result?.grantConfigs).toHaveLength(1);
      expect(result?.params).toEqual({
        redirect_url: "",
        icon_url: "",
        metadata: "",
      });
    });

    it("should handle multiple grant configs", async () => {
      const typeUrls = Object.values(mockGrantTypeUrls).slice(0, 3);

      mockClient.queryContractSmart
        .mockResolvedValueOnce(typeUrls)
        .mockResolvedValueOnce(mockGrantConfigs.genericExecute)
        .mockResolvedValueOnce(mockGrantConfigs.send)
        .mockResolvedValueOnce(mockGrantConfigs.staking)
        .mockResolvedValueOnce(mockTreasuryParams.basic);

      const result = await strategy.fetchTreasuryConfig(
        "xion1treasury",
        mockClient,
      );

      expect(result?.grantConfigs).toHaveLength(3);
    });

    it("should validate redirect_url in params", async () => {
      mockClient.queryContractSmart
        .mockResolvedValueOnce([mockGrantTypeUrls.genericAuthorization])
        .mockResolvedValueOnce(mockGrantConfigs.genericExecute)
        .mockResolvedValueOnce({
          redirect_url: "javascript:alert(1)", // Invalid protocol
          icon_url: "https://example.com/icon.png",
          metadata: "test",
        });

      const result = await strategy.fetchTreasuryConfig(
        "xion1treasury",
        mockClient,
      );

      // Invalid URLs should be sanitized to empty strings
      expect(result?.params.redirect_url).toBe("");
      expect(result?.params.icon_url).toBe("https://example.com/icon.png");
      expect(result?.params.metadata).toBe(""); // metadata is validated as URL
    });

    it("should accept valid http and https URLs", async () => {
      mockClient.queryContractSmart
        .mockResolvedValueOnce([mockGrantTypeUrls.genericAuthorization])
        .mockResolvedValueOnce(mockGrantConfigs.genericExecute)
        .mockResolvedValueOnce({
          redirect_url: "https://example.com/redirect",
          icon_url: "http://example.com/icon.png",
          metadata: "test",
        });

      const result = await strategy.fetchTreasuryConfig(
        "xion1treasury",
        mockClient,
      );

      expect(result?.params.redirect_url).toBe("https://example.com/redirect");
    });
  });
});
