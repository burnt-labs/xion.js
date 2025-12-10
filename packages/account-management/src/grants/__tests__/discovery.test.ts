import { describe, it, expect, vi, beforeEach } from "vitest";
import { queryTreasuryContractWithPermissions } from "../discovery";
import type { TreasuryStrategy, TreasuryConfig } from "../../types/treasury";
import type { PermissionDescription } from "../utils/format-permissions";
import { decodeAuthorization } from "@burnt-labs/abstraxion-core";

// Mock the dependencies
vi.mock("@burnt-labs/abstraxion-core", () => ({
  decodeAuthorization: vi.fn(),
}));

vi.mock("../utils/format-permissions", () => ({
  generatePermissionDescriptions: vi.fn(),
}));

describe("discovery.ts - queryTreasuryContractWithPermissions", () => {
  const mockContractAddress = "xion1treasury123456789";
  const mockAccount = "xion1account123456789";
  const mockClient = {
    getChainId: vi.fn().mockResolvedValue("xion-testnet-1"),
    queryContractSmart: vi.fn(),
  };

  let mockStrategy: TreasuryStrategy;
  let mockTreasuryConfig: TreasuryConfig;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup default mock treasury config
    mockTreasuryConfig = {
      grantConfigs: [
        {
          authorization: {
            type_url: "/cosmos.bank.v1beta1.SendAuthorization",
            value: "base64encodedvalue",
          },
          description: "Send tokens",
          allowance: { type_url: "", value: "" },
        },
      ],
      params: {
        display_url: "https://example.com",
        redirect_url: "https://example.com/redirect",
        icon_url: "https://example.com/icon.png",
      },
    };

    // Setup default mock strategy
    mockStrategy = {
      fetchTreasuryConfig: vi.fn().mockResolvedValue(mockTreasuryConfig),
    };

    // Setup default decodeAuthorization mock
    vi.mocked(decodeAuthorization).mockReturnValue({
      type: "SendAuthorization",
      spendLimit: [{ denom: "uxion", amount: "1000000" }],
    });

    // Setup default generatePermissionDescriptions mock
    const { generatePermissionDescriptions } = await import(
      "../utils/format-permissions"
    );
    vi.mocked(generatePermissionDescriptions).mockReturnValue([
      {
        type: "SendAuthorization",
        description: "Send up to 1 XION",
        details: { spendLimit: "1 XION" },
      },
    ] as PermissionDescription[]);
  });

  describe("Success Cases", () => {
    it("should successfully query treasury contract and return permissions", async () => {
      const result = await queryTreasuryContractWithPermissions(
        mockContractAddress,
        mockClient as any,
        mockAccount,
        mockStrategy,
      );

      expect(mockStrategy.fetchTreasuryConfig).toHaveBeenCalledWith(
        mockContractAddress,
        mockClient,
      );
      expect(decodeAuthorization).toHaveBeenCalledWith(
        "/cosmos.bank.v1beta1.SendAuthorization",
        "base64encodedvalue",
      );
      expect(result.permissionDescriptions).toBeDefined();
      expect(result.params).toEqual(mockTreasuryConfig.params);
    });

    it("should handle multiple grant configs", async () => {
      mockTreasuryConfig.grantConfigs = [
        {
          authorization: {
            type_url: "/cosmos.bank.v1beta1.SendAuthorization",
            value: "base64value1",
          },
          description: "Send tokens",
          allowance: { type_url: "", value: "" },
        },
        {
          authorization: {
            type_url: "/cosmos.staking.v1beta1.StakeAuthorization",
            value: "base64value2",
          },
          description: "Stake tokens",
          allowance: { type_url: "", value: "" },
        },
      ];

      vi.mocked(decodeAuthorization)
        .mockReturnValueOnce({
          type: "SendAuthorization",
          spendLimit: [{ denom: "uxion", amount: "1000000" }],
        })
        .mockReturnValueOnce({
          type: "StakeAuthorization",
          validators: { type: "allow_list", addresses: [] },
        });

      const result = await queryTreasuryContractWithPermissions(
        mockContractAddress,
        mockClient as any,
        mockAccount,
        mockStrategy,
      );

      expect(decodeAuthorization).toHaveBeenCalledTimes(2);
      expect(result.permissionDescriptions).toBeDefined();
    });

    it("should pass usdcDenom to generatePermissionDescriptions when provided", async () => {
      const usdcDenom = "ibc/usdc";
      const { generatePermissionDescriptions } = await import(
        "../utils/format-permissions"
      );

      await queryTreasuryContractWithPermissions(
        mockContractAddress,
        mockClient as any,
        mockAccount,
        mockStrategy,
        usdcDenom,
      );

      expect(generatePermissionDescriptions).toHaveBeenCalledWith(
        expect.any(Array),
        mockAccount,
        usdcDenom,
      );
    });

    it("should include dappDescription from grant config", async () => {
      const { generatePermissionDescriptions } = await import(
        "../utils/format-permissions"
      );

      await queryTreasuryContractWithPermissions(
        mockContractAddress,
        mockClient as any,
        mockAccount,
        mockStrategy,
      );

      const callArgs = vi.mocked(generatePermissionDescriptions).mock.calls[0];
      const decodedGrants = callArgs[0] as any[];

      expect(decodedGrants[0].dappDescription).toBe("Send tokens");
    });
  });

  describe("Error Handling", () => {
    it("should throw error when contract address is missing", async () => {
      await expect(
        queryTreasuryContractWithPermissions(
          "",
          mockClient as any,
          mockAccount,
          mockStrategy,
        ),
      ).rejects.toThrow("Missing contract address");
    });

    it("should throw error when client is missing", async () => {
      await expect(
        queryTreasuryContractWithPermissions(
          mockContractAddress,
          null as any,
          mockAccount,
          mockStrategy,
        ),
      ).rejects.toThrow("Missing client");
    });

    it("should throw error when account is missing", async () => {
      await expect(
        queryTreasuryContractWithPermissions(
          mockContractAddress,
          mockClient as any,
          "",
          mockStrategy,
        ),
      ).rejects.toThrow("Missing account");
    });

    it("should throw error when strategy is missing", async () => {
      await expect(
        queryTreasuryContractWithPermissions(
          mockContractAddress,
          mockClient as any,
          mockAccount,
          null as any,
        ),
      ).rejects.toThrow("Missing treasury strategy");
    });

    it("should throw error when strategy returns null", async () => {
      mockStrategy.fetchTreasuryConfig = vi.fn().mockResolvedValue(null);

      await expect(
        queryTreasuryContractWithPermissions(
          mockContractAddress,
          mockClient as any,
          mockAccount,
          mockStrategy,
        ),
      ).rejects.toThrow(
        "Something went wrong querying the treasury contract for grants",
      );
    });

    it("should throw error when strategy throws", async () => {
      mockStrategy.fetchTreasuryConfig = vi
        .fn()
        .mockRejectedValue(new Error("Network error"));

      await expect(
        queryTreasuryContractWithPermissions(
          mockContractAddress,
          mockClient as any,
          mockAccount,
          mockStrategy,
        ),
      ).rejects.toThrow("Network error");
    });
  });

  describe("Edge Cases", () => {
    it("should return default SendAuthorization when grant configs array is empty", async () => {
      mockTreasuryConfig.grantConfigs = [];

      const result = await queryTreasuryContractWithPermissions(
        mockContractAddress,
        mockClient as any,
        mockAccount,
        mockStrategy,
      );

      // When no grant configs provided, a default SendAuthorization is returned
      // This ensures there's always SOME grant to authorize the flow
      expect(result.permissionDescriptions).toHaveLength(1);
      expect(result.permissionDescriptions[0].type).toBe("SendAuthorization");
      expect(result.params).toEqual(mockTreasuryConfig.params);
    });

    it("should handle treasury params with empty URLs", async () => {
      mockTreasuryConfig.params = {
        display_url: "",
        redirect_url: "",
        icon_url: "",
      };

      const result = await queryTreasuryContractWithPermissions(
        mockContractAddress,
        mockClient as any,
        mockAccount,
        mockStrategy,
      );

      expect(result.params).toEqual({
        display_url: "",
        redirect_url: "",
        icon_url: "",
      });
    });

    it("should handle grant configs without allowance", async () => {
      mockTreasuryConfig.grantConfigs = [
        {
          authorization: {
            type_url: "/cosmos.authz.v1beta1.GenericAuthorization",
            value: "base64value",
          },
          description: "Generic authorization",
          allowance: { type_url: "", value: "" },
        },
      ];

      vi.mocked(decodeAuthorization).mockReturnValue({
        type: "GenericAuthorization",
        msg: "/cosmos.bank.v1beta1.MsgSend",
      });

      const result = await queryTreasuryContractWithPermissions(
        mockContractAddress,
        mockClient as any,
        mockAccount,
        mockStrategy,
      );

      expect(result.permissionDescriptions).toBeDefined();
    });
  });

  describe("Integration with decodeAuthorization", () => {
    it("should decode each grant config authorization", async () => {
      mockTreasuryConfig.grantConfigs = [
        {
          authorization: {
            type_url: "/cosmos.bank.v1beta1.SendAuthorization",
            value: "base64value1",
          },
          description: "Send",
          allowance: { type_url: "", value: "" },
        },
        {
          authorization: {
            type_url: "/cosmos.staking.v1beta1.StakeAuthorization",
            value: "base64value2",
          },
          description: "Stake",
          allowance: { type_url: "", value: "" },
        },
      ];

      await queryTreasuryContractWithPermissions(
        mockContractAddress,
        mockClient as any,
        mockAccount,
        mockStrategy,
      );

      expect(decodeAuthorization).toHaveBeenCalledWith(
        "/cosmos.bank.v1beta1.SendAuthorization",
        "base64value1",
      );
      expect(decodeAuthorization).toHaveBeenCalledWith(
        "/cosmos.staking.v1beta1.StakeAuthorization",
        "base64value2",
      );
    });

    it("should pass decoded grants with dappDescription to generatePermissionDescriptions", async () => {
      const { generatePermissionDescriptions } = await import(
        "../utils/format-permissions"
      );

      vi.mocked(decodeAuthorization).mockReturnValue({
        type: "SendAuthorization",
        spendLimit: [{ denom: "uxion", amount: "1000000" }],
      });

      await queryTreasuryContractWithPermissions(
        mockContractAddress,
        mockClient as any,
        mockAccount,
        mockStrategy,
      );

      const callArgs = vi.mocked(generatePermissionDescriptions).mock.calls[0];
      const decodedGrants = callArgs[0] as any[];

      expect(decodedGrants).toHaveLength(1);
      expect(decodedGrants[0]).toMatchObject({
        type: "SendAuthorization",
        spendLimit: [{ denom: "uxion", amount: "1000000" }],
        dappDescription: "Send tokens",
      });
    });
  });
});
