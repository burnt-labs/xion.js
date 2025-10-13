import { describe, it, expect, vi, beforeEach } from "vitest";
import { CompositeTreasuryStrategy } from "./composite-treasury-strategy";
import type { TreasuryStrategy, TreasuryConfig } from "./types";
import type { AAClient } from "../signers";

describe("CompositeTreasuryStrategy", () => {
  let mockClient: AAClient;
  let mockStrategy1: TreasuryStrategy;
  let mockStrategy2: TreasuryStrategy;
  let mockStrategy3: TreasuryStrategy;

  const mockTreasuryConfig: TreasuryConfig = {
    grantConfigs: [
      {
        authorization: {
          type_url: "/cosmos.authz.v1beta1.GenericAuthorization",
          value: "base64encodedvalue",
        },
        description: "Test grant",
        allowance: { type_url: "", value: "" },
      },
    ],
    params: {
      display_url: "https://example.com",
      redirect_url: "https://example.com/redirect",
      icon_url: "https://example.com/icon.png",
    },
  };

  beforeEach(() => {
    mockClient = {} as AAClient;

    mockStrategy1 = {
      fetchTreasuryConfig: vi.fn(),
    };

    mockStrategy2 = {
      fetchTreasuryConfig: vi.fn(),
    };

    mockStrategy3 = {
      fetchTreasuryConfig: vi.fn(),
    };

    vi.clearAllMocks();
  });

  it("should return result from first successful strategy", async () => {
    vi.mocked(mockStrategy1.fetchTreasuryConfig).mockResolvedValueOnce(
      mockTreasuryConfig,
    );

    const compositeStrategy = new CompositeTreasuryStrategy(
      mockStrategy1,
      mockStrategy2,
      mockStrategy3,
    );

    const result = await compositeStrategy.fetchTreasuryConfig(
      "xion1abc123",
      mockClient,
    );

    expect(result).toEqual(mockTreasuryConfig);
    expect(mockStrategy1.fetchTreasuryConfig).toHaveBeenCalledOnce();
    expect(mockStrategy2.fetchTreasuryConfig).not.toHaveBeenCalled();
    expect(mockStrategy3.fetchTreasuryConfig).not.toHaveBeenCalled();
  });

  it("should fallback to second strategy when first fails", async () => {
    vi.mocked(mockStrategy1.fetchTreasuryConfig).mockRejectedValueOnce(
      new Error("First strategy failed"),
    );
    vi.mocked(mockStrategy2.fetchTreasuryConfig).mockResolvedValueOnce(
      mockTreasuryConfig,
    );

    const compositeStrategy = new CompositeTreasuryStrategy(
      mockStrategy1,
      mockStrategy2,
      mockStrategy3,
    );

    const result = await compositeStrategy.fetchTreasuryConfig(
      "xion1abc123",
      mockClient,
    );

    expect(result).toEqual(mockTreasuryConfig);
    expect(mockStrategy1.fetchTreasuryConfig).toHaveBeenCalledOnce();
    expect(mockStrategy2.fetchTreasuryConfig).toHaveBeenCalledOnce();
    expect(mockStrategy3.fetchTreasuryConfig).not.toHaveBeenCalled();
  });

  it("should fallback when strategy returns null", async () => {
    vi.mocked(mockStrategy1.fetchTreasuryConfig).mockResolvedValueOnce(null);
    vi.mocked(mockStrategy2.fetchTreasuryConfig).mockResolvedValueOnce(
      mockTreasuryConfig,
    );

    const compositeStrategy = new CompositeTreasuryStrategy(
      mockStrategy1,
      mockStrategy2,
      mockStrategy3,
    );

    const result = await compositeStrategy.fetchTreasuryConfig(
      "xion1abc123",
      mockClient,
    );

    expect(result).toEqual(mockTreasuryConfig);
    expect(mockStrategy1.fetchTreasuryConfig).toHaveBeenCalledOnce();
    expect(mockStrategy2.fetchTreasuryConfig).toHaveBeenCalledOnce();
    expect(mockStrategy3.fetchTreasuryConfig).not.toHaveBeenCalled();
  });

  it("should try all strategies before returning null", async () => {
    vi.mocked(mockStrategy1.fetchTreasuryConfig).mockRejectedValueOnce(
      new Error("Strategy 1 failed"),
    );
    vi.mocked(mockStrategy2.fetchTreasuryConfig).mockResolvedValueOnce(null);
    vi.mocked(mockStrategy3.fetchTreasuryConfig).mockRejectedValueOnce(
      new Error("Strategy 3 failed"),
    );

    const compositeStrategy = new CompositeTreasuryStrategy(
      mockStrategy1,
      mockStrategy2,
      mockStrategy3,
    );

    const result = await compositeStrategy.fetchTreasuryConfig(
      "xion1abc123",
      mockClient,
    );

    expect(result).toBeNull();
    expect(mockStrategy1.fetchTreasuryConfig).toHaveBeenCalledOnce();
    expect(mockStrategy2.fetchTreasuryConfig).toHaveBeenCalledOnce();
    expect(mockStrategy3.fetchTreasuryConfig).toHaveBeenCalledOnce();
  });

  it("should work with a single strategy", async () => {
    vi.mocked(mockStrategy1.fetchTreasuryConfig).mockResolvedValueOnce(
      mockTreasuryConfig,
    );

    const compositeStrategy = new CompositeTreasuryStrategy(mockStrategy1);

    const result = await compositeStrategy.fetchTreasuryConfig(
      "xion1abc123",
      mockClient,
    );

    expect(result).toEqual(mockTreasuryConfig);
    expect(mockStrategy1.fetchTreasuryConfig).toHaveBeenCalledOnce();
  });

  it("should throw error when constructed with no strategies", () => {
    expect(() => new CompositeTreasuryStrategy()).toThrow(
      "CompositeTreasuryStrategy requires at least one strategy",
    );
  });

  it("should pass correct parameters to strategies", async () => {
    vi.mocked(mockStrategy1.fetchTreasuryConfig).mockResolvedValueOnce(
      mockTreasuryConfig,
    );

    const compositeStrategy = new CompositeTreasuryStrategy(mockStrategy1);
    const treasuryAddress = "xion1abc123";

    await compositeStrategy.fetchTreasuryConfig(treasuryAddress, mockClient);

    expect(mockStrategy1.fetchTreasuryConfig).toHaveBeenCalledWith(
      treasuryAddress,
      mockClient,
    );
  });

  it("should handle mixed success and failure scenarios", async () => {
    // First strategy throws
    vi.mocked(mockStrategy1.fetchTreasuryConfig).mockRejectedValueOnce(
      new Error("Network error"),
    );
    // Second strategy returns null
    vi.mocked(mockStrategy2.fetchTreasuryConfig).mockResolvedValueOnce(null);
    // Third strategy succeeds
    vi.mocked(mockStrategy3.fetchTreasuryConfig).mockResolvedValueOnce(
      mockTreasuryConfig,
    );

    const compositeStrategy = new CompositeTreasuryStrategy(
      mockStrategy1,
      mockStrategy2,
      mockStrategy3,
    );

    const result = await compositeStrategy.fetchTreasuryConfig(
      "xion1abc123",
      mockClient,
    );

    expect(result).toEqual(mockTreasuryConfig);
    expect(mockStrategy1.fetchTreasuryConfig).toHaveBeenCalledOnce();
    expect(mockStrategy2.fetchTreasuryConfig).toHaveBeenCalledOnce();
    expect(mockStrategy3.fetchTreasuryConfig).toHaveBeenCalledOnce();
  });
});
