import { describe, it, expect, vi, beforeEach } from "vitest";
import { DirectQueryTreasuryStrategy } from "./direct-query-treasury-strategy";
import type { AAClient } from "../signers";

describe("DirectQueryTreasuryStrategy", () => {
  let strategy: DirectQueryTreasuryStrategy;
  let mockClient: AAClient;

  beforeEach(() => {
    strategy = new DirectQueryTreasuryStrategy();
    mockClient = {
      queryContractSmart: vi.fn(),
    } as unknown as AAClient;

    vi.clearAllMocks();
  });

  it("should fetch treasury config from contract successfully", async () => {
    const mockTypeUrls = [
      "/cosmos.authz.v1beta1.MsgGrant",
      "/cosmos.bank.v1beta1.MsgSend",
    ];

    const mockGrantConfigs = [
      {
        authorization: {
          type_url: "/cosmos.authz.v1beta1.GenericAuthorization",
          value: "base64encodedvalue1",
        },
        description: "Grant 1",
        allowance: { type_url: "", value: "" },
      },
      {
        authorization: {
          type_url: "/cosmos.bank.v1beta1.SendAuthorization",
          value: "base64encodedvalue2",
        },
        description: "Grant 2",
        allowance: { type_url: "", value: "" },
      },
    ];

    const mockParams = {
      display_url: "https://example.com/",
      redirect_url: "https://example.com/redirect",
      icon_url: "https://example.com/icon.png",
    };

    // Mock contract queries
    vi.mocked(mockClient.queryContractSmart)
      .mockResolvedValueOnce(mockTypeUrls) // grant_config_type_urls query
      .mockResolvedValueOnce(mockGrantConfigs[0]) // first grant config
      .mockResolvedValueOnce(mockGrantConfigs[1]) // second grant config
      .mockResolvedValueOnce(mockParams); // params query

    const result = await strategy.fetchTreasuryConfig(
      "xion1abc123",
      mockClient,
    );

    expect(result).not.toBeNull();
    expect(result?.grantConfigs).toHaveLength(2);
    expect(result?.grantConfigs[0].description).toBe("Grant 1");
    expect(result?.grantConfigs[1].description).toBe("Grant 2");
    expect(result?.params.display_url).toBe("https://example.com/");
    expect(result?.params.redirect_url).toBe("https://example.com/redirect");
    expect(result?.params.icon_url).toBe("https://example.com/icon.png");

    // Verify correct queries were made
    expect(mockClient.queryContractSmart).toHaveBeenCalledTimes(4);
    expect(mockClient.queryContractSmart).toHaveBeenNthCalledWith(
      1,
      "xion1abc123",
      { grant_config_type_urls: {} },
    );
  });

  it("should handle empty grant configs", async () => {
    const mockParams = {
      display_url: "",
      redirect_url: "",
      icon_url: "",
    };

    // Mock empty type URLs response
    vi.mocked(mockClient.queryContractSmart)
      .mockResolvedValueOnce([]) // No grant configs
      .mockResolvedValueOnce(mockParams); // params query

    const result = await strategy.fetchTreasuryConfig(
      "xion1abc123",
      mockClient,
    );

    expect(result).toBeNull();
    expect(mockClient.queryContractSmart).toHaveBeenCalledTimes(1);
  });

  it("should handle invalid grant config responses", async () => {
    const mockTypeUrls = ["/cosmos.authz.v1beta1.MsgGrant"];

    // Mock invalid grant config (missing description)
    vi.mocked(mockClient.queryContractSmart)
      .mockResolvedValueOnce(mockTypeUrls)
      .mockResolvedValueOnce({
        authorization: {
          type_url: "/cosmos.authz.v1beta1.GenericAuthorization",
          value: "base64encodedvalue",
        },
        // Missing description field
      });

    const result = await strategy.fetchTreasuryConfig(
      "xion1abc123",
      mockClient,
    );

    expect(result).toBeNull();
  });

  it("should handle contract query errors", async () => {
    // Mock query error
    vi.mocked(mockClient.queryContractSmart).mockRejectedValueOnce(
      new Error("Contract not found"),
    );

    const result = await strategy.fetchTreasuryConfig(
      "xion1abc123",
      mockClient,
    );

    expect(result).toBeNull();
  });

  it("should handle params query failure gracefully", async () => {
    const mockTypeUrls = ["/cosmos.authz.v1beta1.MsgGrant"];
    const mockGrantConfig = {
      authorization: {
        type_url: "/cosmos.authz.v1beta1.GenericAuthorization",
        value: "base64encodedvalue",
      },
      description: "Grant 1",
      allowance: { type_url: "", value: "" },
    };

    // Mock successful grant config but failed params query
    vi.mocked(mockClient.queryContractSmart)
      .mockResolvedValueOnce(mockTypeUrls)
      .mockResolvedValueOnce(mockGrantConfig)
      .mockRejectedValueOnce(new Error("Params query failed"));

    const result = await strategy.fetchTreasuryConfig(
      "xion1abc123",
      mockClient,
    );

    expect(result).not.toBeNull();
    expect(result?.grantConfigs).toHaveLength(1);
    // Should return safe defaults for params
    expect(result?.params.display_url).toBe("");
    expect(result?.params.redirect_url).toBe("");
    expect(result?.params.icon_url).toBe("");
  });

  it("should validate URLs in params", async () => {
    const mockTypeUrls = ["/cosmos.authz.v1beta1.MsgGrant"];
    const mockGrantConfig = {
      authorization: {
        type_url: "/cosmos.authz.v1beta1.GenericAuthorization",
        value: "base64encodedvalue",
      },
      description: "Grant 1",
      allowance: { type_url: "", value: "" },
    };

    const mockParams = {
      display_url: "javascript:alert('xss')",
      redirect_url: "https://safe.com/",
      icon_url: "data:text/html,<script>alert('xss')</script>",
    };

    vi.mocked(mockClient.queryContractSmart)
      .mockResolvedValueOnce(mockTypeUrls)
      .mockResolvedValueOnce(mockGrantConfig)
      .mockResolvedValueOnce(mockParams);

    const result = await strategy.fetchTreasuryConfig(
      "xion1abc123",
      mockClient,
    );

    expect(result).not.toBeNull();
    expect(result?.params.display_url).toBe(""); // Unsafe URL should be empty
    expect(result?.params.redirect_url).toBe("https://safe.com/"); // Safe URL preserved
    expect(result?.params.icon_url).toBe(""); // Unsafe URL should be empty
  });

  it("should handle null or undefined responses", async () => {
    // Mock null response
    vi.mocked(mockClient.queryContractSmart).mockResolvedValueOnce(null);

    const result = await strategy.fetchTreasuryConfig(
      "xion1abc123",
      mockClient,
    );

    expect(result).toBeNull();
  });
});
