import { describe, it, expect, vi } from "vitest";
import { generateTreasuryGrants } from "../construction";
import { MsgGrant } from "cosmjs-types/cosmos/authz/v1beta1/tx";
import type {
  GrantConfigByTypeUrl,
  TreasuryStrategy,
  TreasuryConfig,
} from "../../types/treasury";

describe("construction.ts - Grant Message Generation", () => {
  // Mock data
  const mockContractAddress = "xion1contractaddress123456789";
  const mockGranter = "xion1granter123456789";
  const mockGrantee = "xion1grantee123456789";

  // Helper to create a mock treasury strategy
  const createMockStrategy = (
    treasuryConfig: TreasuryConfig | null,
  ): TreasuryStrategy => ({
    fetchTreasuryConfig: vi.fn().mockResolvedValue(treasuryConfig),
  });

  // Helper to create a mock treasury config
  const createMockTreasuryConfig = (
    grantConfigs: GrantConfigByTypeUrl[] = [],
  ): TreasuryConfig => ({
    grantConfigs,
    params: {
      redirect_url: "https://example.com/redirect",
      icon_url: "https://example.com/icon.png",
      metadata: "",
    },
  });

  // Helper to create a mock grant config
  const createMockGrantConfig = (): GrantConfigByTypeUrl => ({
    allowance: {
      type_url: "/cosmos.feegrant.v1beta1.BasicAllowance",
      value: Buffer.from("mockallowancevalue").toString("base64"),
    },
    authorization: {
      type_url: "/cosmos.bank.v1beta1.SendAuthorization",
      value: Buffer.from("mockauthorizationvalue").toString("base64"),
    },
    description: "Mock grant config",
    optional: false,
    maxDuration: 7776000, // 90 days in seconds
  });

  // Helper to create a mock client
  const createMockClient = () => ({
    queryContractSmart: vi.fn(),
  });

  describe("🔴 CRITICAL: generateTreasuryGrants()", () => {
    it("should throw error for missing contract address", async () => {
      const mockStrategy = createMockStrategy(createMockTreasuryConfig());
      const mockClient = createMockClient();

      await expect(
        generateTreasuryGrants(
          "",
          mockClient,
          mockGranter,
          mockGrantee,
          mockStrategy,
        ),
      ).rejects.toThrow("Missing contract address");
    });

    it("should throw error for missing client", async () => {
      const mockStrategy = createMockStrategy(createMockTreasuryConfig());

      await expect(
        generateTreasuryGrants(
          mockContractAddress,
          null as any,
          mockGranter,
          mockGrantee,
          mockStrategy,
        ),
      ).rejects.toThrow("Missing client");
    });

    it("should throw error for missing granter", async () => {
      const mockStrategy = createMockStrategy(createMockTreasuryConfig());
      const mockClient = createMockClient();

      await expect(
        generateTreasuryGrants(
          mockContractAddress,
          mockClient,
          "",
          mockGrantee,
          mockStrategy,
        ),
      ).rejects.toThrow("Missing granter address");
    });

    it("should throw error for missing grantee", async () => {
      const mockStrategy = createMockStrategy(createMockTreasuryConfig());
      const mockClient = createMockClient();

      await expect(
        generateTreasuryGrants(
          mockContractAddress,
          mockClient,
          mockGranter,
          "",
          mockStrategy,
        ),
      ).rejects.toThrow("Missing grantee address");
    });

    it("should throw error for missing strategy", async () => {
      const mockClient = createMockClient();

      await expect(
        generateTreasuryGrants(
          mockContractAddress,
          mockClient,
          mockGranter,
          mockGrantee,
          null as any,
        ),
      ).rejects.toThrow("Missing treasury strategy");
    });

    it("should throw error when treasury config is null", async () => {
      const mockStrategy = createMockStrategy(null);
      const mockClient = createMockClient();

      await expect(
        generateTreasuryGrants(
          mockContractAddress,
          mockClient,
          mockGranter,
          mockGrantee,
          mockStrategy,
        ),
      ).rejects.toThrow(
        "Something went wrong querying the treasury contract for grants",
      );
    });

    it("should return empty array when grant configs array is empty", async () => {
      const mockStrategy = createMockStrategy(createMockTreasuryConfig([]));
      const mockClient = createMockClient();

      const result = await generateTreasuryGrants(
        mockContractAddress,
        mockClient,
        mockGranter,
        mockGrantee,
        mockStrategy,
      );
      expect(result).toEqual([]);
    });

    it("should return empty array when grantConfigs is undefined", async () => {
      const mockStrategy = createMockStrategy({
        grantConfigs: undefined as any,
        params: {
          redirect_url: "",
          icon_url: "",
          metadata: "",
        },
      });
      const mockClient = createMockClient();

      const result = await generateTreasuryGrants(
        mockContractAddress,
        mockClient,
        mockGranter,
        mockGrantee,
        mockStrategy,
      );
      expect(result).toEqual([]);
    });

    it("should generate grant messages from treasury config", async () => {
      const mockGrantConfig = createMockGrantConfig();
      const mockStrategy = createMockStrategy(
        createMockTreasuryConfig([mockGrantConfig]),
      );
      const mockClient = createMockClient();

      const result = await generateTreasuryGrants(
        mockContractAddress,
        mockClient,
        mockGranter,
        mockGrantee,
        mockStrategy,
      );

      expect(result).toHaveLength(1);
      expect(result[0].typeUrl).toBe(MsgGrant.typeUrl);
      expect(mockStrategy.fetchTreasuryConfig).toHaveBeenCalledWith(
        mockContractAddress,
        mockClient,
      );
    });

    it("should generate multiple grant messages from treasury config", async () => {
      const mockGrantConfigs = [
        createMockGrantConfig(),
        createMockGrantConfig(),
        createMockGrantConfig(),
      ];
      const mockStrategy = createMockStrategy(
        createMockTreasuryConfig(mockGrantConfigs),
      );
      const mockClient = createMockClient();

      const result = await generateTreasuryGrants(
        mockContractAddress,
        mockClient,
        mockGranter,
        mockGrantee,
        mockStrategy,
      );

      expect(result).toHaveLength(3);
      expect(result.every((msg) => msg.typeUrl === MsgGrant.typeUrl)).toBe(
        true,
      );
    });

    it("should use default expiration of 3 months if not provided", async () => {
      const mockGrantConfig = createMockGrantConfig();
      const mockStrategy = createMockStrategy(
        createMockTreasuryConfig([mockGrantConfig]),
      );
      const mockClient = createMockClient();

      const beforeCall = new Date();
      const result = await generateTreasuryGrants(
        mockContractAddress,
        mockClient,
        mockGranter,
        mockGrantee,
        mockStrategy,
      );

      const grantValue = result[0].value as any;
      const expectedExpiration = BigInt(
        Math.floor(
          new Date(beforeCall.setMonth(beforeCall.getMonth() + 3)).getTime() /
            1000,
        ),
      );

      // Allow for a few seconds of difference due to execution time
      expect(
        Number(grantValue.grant.expiration.seconds) -
          Number(expectedExpiration),
      ).toBeLessThanOrEqual(5);
    });

    it("should use custom expiration if provided", async () => {
      const customExpiration = BigInt(
        Math.floor(Date.now() / 1000) + 86400 * 180,
      ); // 180 days
      const mockGrantConfig = createMockGrantConfig();
      const mockStrategy = createMockStrategy(
        createMockTreasuryConfig([mockGrantConfig]),
      );
      const mockClient = createMockClient();

      const result = await generateTreasuryGrants(
        mockContractAddress,
        mockClient,
        mockGranter,
        mockGrantee,
        mockStrategy,
        customExpiration,
      );

      const grantValue = result[0].value as any;
      expect(grantValue.grant.expiration.seconds).toBe(customExpiration);
    });

    it("should correctly convert base64 authorization to Uint8Array", async () => {
      const mockGrantConfig = createMockGrantConfig();
      const mockStrategy = createMockStrategy(
        createMockTreasuryConfig([mockGrantConfig]),
      );
      const mockClient = createMockClient();

      const result = await generateTreasuryGrants(
        mockContractAddress,
        mockClient,
        mockGranter,
        mockGrantee,
        mockStrategy,
      );

      const grantValue = result[0].value as any;
      expect(grantValue.grant.authorization.value).toBeInstanceOf(Uint8Array);
      expect(grantValue.grant.authorization.typeUrl).toBe(
        mockGrantConfig.authorization.type_url,
      );
    });

    it("should set correct granter and grantee addresses", async () => {
      const mockGrantConfig = createMockGrantConfig();
      const mockStrategy = createMockStrategy(
        createMockTreasuryConfig([mockGrantConfig]),
      );
      const mockClient = createMockClient();

      const result = await generateTreasuryGrants(
        mockContractAddress,
        mockClient,
        mockGranter,
        mockGrantee,
        mockStrategy,
      );

      const grantValue = result[0].value as any;
      expect(grantValue.granter).toBe(mockGranter);
      expect(grantValue.grantee).toBe(mockGrantee);
    });

    it("should set expiration nanos to 0", async () => {
      const mockGrantConfig = createMockGrantConfig();
      const mockStrategy = createMockStrategy(
        createMockTreasuryConfig([mockGrantConfig]),
      );
      const mockClient = createMockClient();

      const result = await generateTreasuryGrants(
        mockContractAddress,
        mockClient,
        mockGranter,
        mockGrantee,
        mockStrategy,
      );

      const grantValue = result[0].value as any;
      expect(grantValue.grant.expiration.nanos).toBe(0);
    });

    it("should call strategy.fetchTreasuryConfig exactly once", async () => {
      const mockGrantConfig = createMockGrantConfig();
      const mockStrategy = createMockStrategy(
        createMockTreasuryConfig([mockGrantConfig]),
      );
      const mockClient = createMockClient();

      await generateTreasuryGrants(
        mockContractAddress,
        mockClient,
        mockGranter,
        mockGrantee,
        mockStrategy,
      );

      expect(mockStrategy.fetchTreasuryConfig).toHaveBeenCalledTimes(1);
    });
  });
});
