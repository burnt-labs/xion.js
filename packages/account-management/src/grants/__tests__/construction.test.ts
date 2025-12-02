import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateTreasuryGrants,
  generateBankGrant,
  generateContractGrant,
  generateStakeAndGovGrant,
  buildGrantMessages,
} from "../construction";
import { MsgGrant } from "cosmjs-types/cosmos/authz/v1beta1/tx";
import { MsgGrantAllowance } from "cosmjs-types/cosmos/feegrant/v1beta1/tx";
import { SendAuthorization } from "cosmjs-types/cosmos/bank/v1beta1/authz";
import {
  AllowAllMessagesFilter,
  CombinedLimit,
  ContractExecutionAuthorization,
  MaxCallsLimit,
} from "cosmjs-types/cosmwasm/wasm/v1/authz";
import { GenericAuthorization } from "cosmjs-types/cosmos/authz/v1beta1/authz";
import {
  AllowedMsgAllowance,
  BasicAllowance,
} from "cosmjs-types/cosmos/feegrant/v1beta1/feegrant";
import {
  AuthorizationType,
  StakeAuthorization,
} from "cosmjs-types/cosmos/staking/v1beta1/authz";
import { MsgWithdrawDelegatorReward } from "cosmjs-types/cosmos/distribution/v1beta1/tx";
import {
  MsgCancelUnbondingDelegation,
  MsgDelegate,
  MsgUndelegate,
} from "cosmjs-types/cosmos/staking/v1beta1/tx";
import { MsgVote } from "cosmjs-types/cosmos/gov/v1beta1/tx";
import { MsgSubmitProposal } from "cosmjs-types/cosmos/gov/v1/tx";
import { MsgExec } from "cosmjs-types/cosmos/authz/v1beta1/tx";
import type { ContractGrantDescription, SpendLimit } from "../../types/grants";
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
  const mockExpiration = BigInt(Math.floor(Date.now() / 1000) + 86400 * 90); // 90 days from now

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
      display_url: "https://example.com",
      redirect_url: "https://example.com/redirect",
      icon_url: "https://example.com/icon.png",
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

    it("should throw error when grant configs array is empty", async () => {
      const mockStrategy = createMockStrategy(createMockTreasuryConfig([]));
      const mockClient = createMockClient();

      await expect(
        generateTreasuryGrants(
          mockContractAddress,
          mockClient,
          mockGranter,
          mockGrantee,
          mockStrategy,
        ),
      ).rejects.toThrow("No grant configs found in treasury contract");
    });

    it("should throw error when grantConfigs is undefined", async () => {
      const mockStrategy = createMockStrategy({
        grantConfigs: undefined as any,
        params: {
          display_url: "",
          redirect_url: "",
          icon_url: "",
        },
      });
      const mockClient = createMockClient();

      await expect(
        generateTreasuryGrants(
          mockContractAddress,
          mockClient,
          mockGranter,
          mockGrantee,
          mockStrategy,
        ),
      ).rejects.toThrow("No grant configs found in treasury contract");
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

  describe("🔴 CRITICAL: generateBankGrant()", () => {
    it("should generate bank grant with correct structure", () => {
      const spendLimit: SpendLimit[] = [{ denom: "uxion", amount: "1000000" }];

      const result = generateBankGrant(
        mockExpiration,
        mockGrantee,
        mockGranter,
        spendLimit,
      );

      expect(result.typeUrl).toBe(MsgGrant.typeUrl);
      const grantValue = result.value as any;
      expect(grantValue.grantee).toBe(mockGrantee);
      expect(grantValue.granter).toBe(mockGranter);
      expect(grantValue.grant.expiration.seconds).toBe(mockExpiration);
    });

    it("should handle multiple spend limits", () => {
      const spendLimits: SpendLimit[] = [
        { denom: "uxion", amount: "1000000" },
        { denom: "uatom", amount: "500000" },
        { denom: "uosmo", amount: "250000" },
      ];

      const result = generateBankGrant(
        mockExpiration,
        mockGrantee,
        mockGranter,
        spendLimits,
      );

      expect(result.typeUrl).toBe(MsgGrant.typeUrl);
      const grantValue = result.value as any;

      // Decode the authorization to verify spend limits
      const decodedAuth = SendAuthorization.decode(
        grantValue.grant.authorization.value,
      );
      expect(decodedAuth.spendLimit).toHaveLength(3);
      expect(decodedAuth.spendLimit[0].denom).toBe("uxion");
      expect(decodedAuth.spendLimit[1].denom).toBe("uatom");
      expect(decodedAuth.spendLimit[2].denom).toBe("uosmo");
    });

    it("should encode SendAuthorization correctly", () => {
      const spendLimit: SpendLimit[] = [{ denom: "uxion", amount: "1000000" }];

      const result = generateBankGrant(
        mockExpiration,
        mockGrantee,
        mockGranter,
        spendLimit,
      );

      const grantValue = result.value as any;
      expect(grantValue.grant.authorization.typeUrl).toBe(
        SendAuthorization.typeUrl,
      );
      expect(grantValue.grant.authorization.value).toBeInstanceOf(Uint8Array);

      // Verify it can be decoded
      const decodedAuth = SendAuthorization.decode(
        grantValue.grant.authorization.value,
      );
      expect(decodedAuth.spendLimit).toHaveLength(1);
      expect(decodedAuth.spendLimit[0].denom).toBe("uxion");
      expect(decodedAuth.spendLimit[0].amount).toBe("1000000");
    });

    it("should handle empty spend limit array", () => {
      const result = generateBankGrant(
        mockExpiration,
        mockGrantee,
        mockGranter,
        [],
      );

      const grantValue = result.value as any;
      const decodedAuth = SendAuthorization.decode(
        grantValue.grant.authorization.value,
      );
      expect(decodedAuth.spendLimit).toHaveLength(0);
    });

    it("should handle very large amounts", () => {
      const largeAmount = "999999999999999999999999";
      const spendLimit: SpendLimit[] = [
        { denom: "uxion", amount: largeAmount },
      ];

      const result = generateBankGrant(
        mockExpiration,
        mockGrantee,
        mockGranter,
        spendLimit,
      );

      const grantValue = result.value as any;
      const decodedAuth = SendAuthorization.decode(
        grantValue.grant.authorization.value,
      );
      expect(decodedAuth.spendLimit[0].amount).toBe(largeAmount);
    });

    it("should handle different denom formats", () => {
      const spendLimits: SpendLimit[] = [
        { denom: "uxion", amount: "100" },
        { denom: "ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2", amount: "200" },
        { denom: "factory/xion1.../subdenom", amount: "300" },
      ];

      const result = generateBankGrant(
        mockExpiration,
        mockGrantee,
        mockGranter,
        spendLimits,
      );

      const grantValue = result.value as any;
      const decodedAuth = SendAuthorization.decode(
        grantValue.grant.authorization.value,
      );
      expect(decodedAuth.spendLimit).toHaveLength(3);
      expect(decodedAuth.spendLimit[0].denom).toBe("uxion");
      expect(decodedAuth.spendLimit[1].denom).toContain("ibc/");
      expect(decodedAuth.spendLimit[2].denom).toContain("factory/");
    });
  });

  describe("🔴 CRITICAL: generateContractGrant()", () => {
    it("should generate contract grant for string address", () => {
      const contracts: ContractGrantDescription[] = ["xion1contract123"];

      const result = generateContractGrant(
        mockExpiration,
        mockGrantee,
        mockGranter,
        contracts,
      );

      expect(result.typeUrl).toBe(MsgGrant.typeUrl);
      const grantValue = result.value as any;
      expect(grantValue.grant.authorization.typeUrl).toBe(
        ContractExecutionAuthorization.typeUrl,
      );

      // Decode and verify MaxCallsLimit is used
      const decodedAuth = ContractExecutionAuthorization.decode(
        grantValue.grant.authorization.value,
      );
      expect(decodedAuth.grants).toHaveLength(1);
      expect(decodedAuth.grants[0].contract).toBe("xion1contract123");
      expect(decodedAuth.grants[0].limit?.typeUrl).toBe(MaxCallsLimit.typeUrl);

      // Decode the limit to verify remaining calls
      const decodedLimit = MaxCallsLimit.decode(
        decodedAuth.grants[0].limit!.value,
      );
      expect(decodedLimit.remaining).toBe(BigInt(255));
    });

    it("should generate contract grant with combined limit", () => {
      const contracts: ContractGrantDescription[] = [
        {
          address: "xion1contract123",
          amounts: [{ denom: "uxion", amount: "1000000" }],
        },
      ];

      const result = generateContractGrant(
        mockExpiration,
        mockGrantee,
        mockGranter,
        contracts,
      );

      const grantValue = result.value as any;
      const decodedAuth = ContractExecutionAuthorization.decode(
        grantValue.grant.authorization.value,
      );
      expect(decodedAuth.grants).toHaveLength(1);
      expect(decodedAuth.grants[0].limit?.typeUrl).toBe(
        "/cosmwasm.wasm.v1.CombinedLimit",
      );

      // Decode the limit to verify
      const decodedLimit = CombinedLimit.decode(
        decodedAuth.grants[0].limit!.value,
      );
      expect(decodedLimit.callsRemaining).toBe(BigInt(255));
      expect(decodedLimit.amounts).toHaveLength(1);
      expect(decodedLimit.amounts[0].denom).toBe("uxion");
      expect(decodedLimit.amounts[0].amount).toBe("1000000");
    });

    it("should filter out invalid contracts - null", () => {
      const contracts: ContractGrantDescription[] = [
        "xion1valid1",
        null as any,
        "xion1valid2",
      ];

      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = generateContractGrant(
        mockExpiration,
        mockGrantee,
        mockGranter,
        contracts,
      );

      const grantValue = result.value as any;
      const decodedAuth = ContractExecutionAuthorization.decode(
        grantValue.grant.authorization.value,
      );

      // Should only include 2 valid contracts
      expect(decodedAuth.grants).toHaveLength(2);
      expect(decodedAuth.grants[0].contract).toBe("xion1valid1");
      expect(decodedAuth.grants[1].contract).toBe("xion1valid2");

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Contract was omitted because it was improperly encoded",
      );

      consoleWarnSpy.mockRestore();
    });

    it("should filter out invalid contracts - empty address", () => {
      const contracts: ContractGrantDescription[] = [
        "xion1valid1",
        { address: "", amounts: [] },
        { address: "xion1valid2", amounts: [{ denom: "uxion", amount: "100" }] },
      ];

      const result = generateContractGrant(
        mockExpiration,
        mockGrantee,
        mockGranter,
        contracts,
      );

      const grantValue = result.value as any;
      const decodedAuth = ContractExecutionAuthorization.decode(
        grantValue.grant.authorization.value,
      );

      // Should only include 2 valid contracts (empty address is filtered out)
      expect(decodedAuth.grants).toHaveLength(2);
      expect(decodedAuth.grants[0].contract).toBe("xion1valid1");
      expect(decodedAuth.grants[1].contract).toBe("xion1valid2");
    });

    it("should filter out invalid contracts - undefined amounts", () => {
      const contracts: ContractGrantDescription[] = [
        "xion1valid1",
        { address: "xion1invalid", amounts: undefined as any },
        "xion1valid2",
      ];

      const result = generateContractGrant(
        mockExpiration,
        mockGrantee,
        mockGranter,
        contracts,
      );

      const grantValue = result.value as any;
      const decodedAuth = ContractExecutionAuthorization.decode(
        grantValue.grant.authorization.value,
      );

      // Should only include 2 valid contracts (undefined amounts is filtered out)
      expect(decodedAuth.grants).toHaveLength(2);
      expect(decodedAuth.grants[0].contract).toBe("xion1valid1");
      expect(decodedAuth.grants[1].contract).toBe("xion1valid2");
    });

    it("should use AllowAllMessagesFilter for all grants", () => {
      const contracts: ContractGrantDescription[] = [
        "xion1contract1",
        { address: "xion1contract2", amounts: [{ denom: "uxion", amount: "100" }] },
      ];

      const result = generateContractGrant(
        mockExpiration,
        mockGrantee,
        mockGranter,
        contracts,
      );

      const grantValue = result.value as any;
      const decodedAuth = ContractExecutionAuthorization.decode(
        grantValue.grant.authorization.value,
      );

      expect(decodedAuth.grants).toHaveLength(2);
      expect(decodedAuth.grants[0].filter?.typeUrl).toBe(
        AllowAllMessagesFilter.typeUrl,
      );
      expect(decodedAuth.grants[1].filter?.typeUrl).toBe(
        AllowAllMessagesFilter.typeUrl,
      );
    });

    it("should handle mixed contract types", () => {
      const contracts: ContractGrantDescription[] = [
        "xion1contract1",
        { address: "xion1contract2", amounts: [{ denom: "uxion", amount: "100" }] },
        "xion1contract3",
        { address: "xion1contract4", amounts: [{ denom: "uatom", amount: "200" }] },
      ];

      const result = generateContractGrant(
        mockExpiration,
        mockGrantee,
        mockGranter,
        contracts,
      );

      const grantValue = result.value as any;
      const decodedAuth = ContractExecutionAuthorization.decode(
        grantValue.grant.authorization.value,
      );

      expect(decodedAuth.grants).toHaveLength(4);
      expect(decodedAuth.grants[0].limit?.typeUrl).toBe(MaxCallsLimit.typeUrl);
      expect(decodedAuth.grants[1].limit?.typeUrl).toBe(
        "/cosmwasm.wasm.v1.CombinedLimit",
      );
      expect(decodedAuth.grants[2].limit?.typeUrl).toBe(MaxCallsLimit.typeUrl);
      expect(decodedAuth.grants[3].limit?.typeUrl).toBe(
        "/cosmwasm.wasm.v1.CombinedLimit",
      );
    });

    it("should handle empty contracts array", () => {
      const result = generateContractGrant(
        mockExpiration,
        mockGrantee,
        mockGranter,
        [],
      );

      const grantValue = result.value as any;
      const decodedAuth = ContractExecutionAuthorization.decode(
        grantValue.grant.authorization.value,
      );

      expect(decodedAuth.grants).toHaveLength(0);
    });

    it("should set correct expiration", () => {
      const contracts: ContractGrantDescription[] = ["xion1contract123"];

      const result = generateContractGrant(
        mockExpiration,
        mockGrantee,
        mockGranter,
        contracts,
      );

      const grantValue = result.value as any;
      expect(grantValue.grant.expiration.seconds).toBe(mockExpiration);
    });
  });

  describe("🔴 CRITICAL: generateStakeAndGovGrant()", () => {
    it("should generate all required grant messages", () => {
      const result = generateStakeAndGovGrant(
        mockExpiration,
        mockGrantee,
        mockGranter,
      );

      // Should return 8 grants:
      // 3 stake grants + 4 generic msg grants + 1 fee grant = 8
      expect(result).toHaveLength(8);
    });

    it("should generate fee grant with correct structure", () => {
      const result = generateStakeAndGovGrant(
        mockExpiration,
        mockGrantee,
        mockGranter,
      );

      const feeGrant = result.find(
        (msg) => msg.typeUrl === MsgGrantAllowance.typeUrl,
      );
      expect(feeGrant).toBeDefined();

      const feeGrantValue = feeGrant!.value as any;
      expect(feeGrantValue.granter).toBe(mockGranter);
      expect(feeGrantValue.grantee).toBe(mockGrantee);
      expect(feeGrantValue.allowance.typeUrl).toBe(
        AllowedMsgAllowance.typeUrl,
      );
    });

    it("should include correct allowed messages in fee grant", () => {
      const result = generateStakeAndGovGrant(
        mockExpiration,
        mockGrantee,
        mockGranter,
      );

      const feeGrant = result.find(
        (msg) => msg.typeUrl === MsgGrantAllowance.typeUrl,
      );
      const feeGrantValue = feeGrant!.value as any;

      const decodedAllowance = AllowedMsgAllowance.decode(
        feeGrantValue.allowance.value,
      );

      const expectedMessages = [
        MsgWithdrawDelegatorReward.typeUrl,
        MsgDelegate.typeUrl,
        MsgUndelegate.typeUrl,
        MsgExec.typeUrl,
        MsgCancelUnbondingDelegation.typeUrl,
        MsgVote.typeUrl,
      ];

      expect(decodedAllowance.allowedMessages).toHaveLength(
        expectedMessages.length,
      );
      expectedMessages.forEach((msg) => {
        expect(decodedAllowance.allowedMessages).toContain(msg);
      });
    });

    it("should generate generic authorizations for specific messages", () => {
      const result = generateStakeAndGovGrant(
        mockExpiration,
        mockGrantee,
        mockGranter,
      );

      const genericGrants = result.filter(
        (msg) => msg.typeUrl === MsgGrant.typeUrl,
      );

      // Find grants with GenericAuthorization
      const genericAuthGrants = genericGrants.filter((grant) => {
        const grantValue = grant.value as any;
        return (
          grantValue.grant.authorization.typeUrl ===
          GenericAuthorization.typeUrl
        );
      });

      expect(genericAuthGrants).toHaveLength(4);

      const expectedMessages = [
        MsgWithdrawDelegatorReward.typeUrl,
        MsgCancelUnbondingDelegation.typeUrl,
        MsgVote.typeUrl,
        MsgSubmitProposal.typeUrl,
      ];

      genericAuthGrants.forEach((grant) => {
        const grantValue = grant.value as any;
        const decodedAuth = GenericAuthorization.decode(
          grantValue.grant.authorization.value,
        );
        expect(expectedMessages).toContain(decodedAuth.msg);
      });
    });

    it("should generate stake authorizations for delegate, undelegate, redelegate", () => {
      const result = generateStakeAndGovGrant(
        mockExpiration,
        mockGrantee,
        mockGranter,
      );

      const stakeGrants = result.filter((msg) => {
        if (msg.typeUrl !== MsgGrant.typeUrl) return false;
        const grantValue = msg.value as any;
        return (
          grantValue.grant.authorization.typeUrl === StakeAuthorization.typeUrl
        );
      });

      expect(stakeGrants).toHaveLength(3);

      const authorizationTypes: number[] = [];
      stakeGrants.forEach((grant) => {
        const grantValue = grant.value as any;
        const decodedAuth = StakeAuthorization.decode(
          grantValue.grant.authorization.value,
        );
        authorizationTypes.push(decodedAuth.authorizationType);
      });

      expect(authorizationTypes).toContain(
        AuthorizationType.AUTHORIZATION_TYPE_DELEGATE,
      );
      expect(authorizationTypes).toContain(
        AuthorizationType.AUTHORIZATION_TYPE_UNDELEGATE,
      );
      expect(authorizationTypes).toContain(
        AuthorizationType.AUTHORIZATION_TYPE_REDELEGATE,
      );
    });

    it("should set correct expiration on all grants", () => {
      const result = generateStakeAndGovGrant(
        mockExpiration,
        mockGrantee,
        mockGranter,
      );

      result.forEach((msg) => {
        const msgValue = msg.value as any;
        if (msg.typeUrl === MsgGrantAllowance.typeUrl) {
          // Fee grant - check inside the allowance
          const decodedAllowance = AllowedMsgAllowance.decode(
            msgValue.allowance.value,
          );
          const basicAllowance = BasicAllowance.decode(
            decodedAllowance.allowance!.value,
          );
          expect(basicAllowance.expiration?.seconds).toBe(mockExpiration);
        } else {
          // MsgGrant - check directly
          expect(msgValue.grant.expiration.seconds).toBe(mockExpiration);
        }
      });
    });

    it("should set empty spend limit on fee grant", () => {
      const result = generateStakeAndGovGrant(
        mockExpiration,
        mockGrantee,
        mockGranter,
      );

      const feeGrant = result.find(
        (msg) => msg.typeUrl === MsgGrantAllowance.typeUrl,
      );
      const feeGrantValue = feeGrant!.value as any;

      const decodedAllowance = AllowedMsgAllowance.decode(
        feeGrantValue.allowance.value,
      );
      const basicAllowance = BasicAllowance.decode(
        decodedAllowance.allowance!.value,
      );

      expect(basicAllowance.spendLimit).toHaveLength(0);
    });

    it("should set correct granter and grantee on all grants", () => {
      const result = generateStakeAndGovGrant(
        mockExpiration,
        mockGrantee,
        mockGranter,
      );

      result.forEach((msg) => {
        const msgValue = msg.value as any;
        expect(msgValue.granter).toBe(mockGranter);
        expect(msgValue.grantee).toBe(mockGrantee);
      });
    });
  });

  describe("🔴 CRITICAL: buildGrantMessages()", () => {
    it("should build contract grants when contracts provided", () => {
      const contracts: ContractGrantDescription[] = ["xion1contract123"];

      const result = buildGrantMessages({
        granter: mockGranter,
        grantee: mockGrantee,
        expiration: mockExpiration,
        contracts,
      });

      expect(result).toHaveLength(1);
      expect(result[0].typeUrl).toBe(MsgGrant.typeUrl);

      const grantValue = result[0].value as any;
      expect(grantValue.grant.authorization.typeUrl).toBe(
        ContractExecutionAuthorization.typeUrl,
      );
    });

    it("should build bank grants when bank provided", () => {
      const bank: SpendLimit[] = [{ denom: "uxion", amount: "1000000" }];

      const result = buildGrantMessages({
        granter: mockGranter,
        grantee: mockGrantee,
        expiration: mockExpiration,
        bank,
      });

      expect(result).toHaveLength(1);
      expect(result[0].typeUrl).toBe(MsgGrant.typeUrl);

      const grantValue = result[0].value as any;
      expect(grantValue.grant.authorization.typeUrl).toBe(
        SendAuthorization.typeUrl,
      );
    });

    it("should build stake grants when stake is true", () => {
      const result = buildGrantMessages({
        granter: mockGranter,
        grantee: mockGrantee,
        expiration: mockExpiration,
        stake: true,
      });

      expect(result).toHaveLength(8); // 3 stake + 4 generic + 1 fee
    });

    it("should build all grant types together", () => {
      const contracts: ContractGrantDescription[] = ["xion1contract123"];
      const bank: SpendLimit[] = [{ denom: "uxion", amount: "1000000" }];

      const result = buildGrantMessages({
        granter: mockGranter,
        grantee: mockGrantee,
        expiration: mockExpiration,
        contracts,
        bank,
        stake: true,
      });

      // 1 contract + 1 bank + 8 stake/gov = 10 total
      expect(result).toHaveLength(10);
    });

    it("should return empty array when no grants specified", () => {
      const result = buildGrantMessages({
        granter: mockGranter,
        grantee: mockGrantee,
        expiration: mockExpiration,
      });

      expect(result).toHaveLength(0);
    });

    it("should not build contract grants when contracts array is empty", () => {
      const result = buildGrantMessages({
        granter: mockGranter,
        grantee: mockGrantee,
        expiration: mockExpiration,
        contracts: [],
      });

      expect(result).toHaveLength(0);
    });

    it("should not build bank grants when bank array is empty", () => {
      const result = buildGrantMessages({
        granter: mockGranter,
        grantee: mockGrantee,
        expiration: mockExpiration,
        bank: [],
      });

      expect(result).toHaveLength(0);
    });

    it("should not build stake grants when stake is false", () => {
      const result = buildGrantMessages({
        granter: mockGranter,
        grantee: mockGrantee,
        expiration: mockExpiration,
        stake: false,
      });

      expect(result).toHaveLength(0);
    });

    it("should handle undefined stake parameter", () => {
      const result = buildGrantMessages({
        granter: mockGranter,
        grantee: mockGrantee,
        expiration: mockExpiration,
        stake: undefined,
      });

      expect(result).toHaveLength(0);
    });

    it("should maintain correct order: contracts, bank, stake", () => {
      const contracts: ContractGrantDescription[] = ["xion1contract123"];
      const bank: SpendLimit[] = [{ denom: "uxion", amount: "1000000" }];

      const result = buildGrantMessages({
        granter: mockGranter,
        grantee: mockGrantee,
        expiration: mockExpiration,
        contracts,
        bank,
        stake: true,
      });

      // First should be contract grant
      const firstGrant = result[0].value as any;
      expect(firstGrant.grant.authorization.typeUrl).toBe(
        ContractExecutionAuthorization.typeUrl,
      );

      // Second should be bank grant
      const secondGrant = result[1].value as any;
      expect(secondGrant.grant.authorization.typeUrl).toBe(
        SendAuthorization.typeUrl,
      );

      // Remaining should be stake/gov grants
      expect(result.length).toBe(10);
    });
  });

  describe("🟡 HIGH: Expiration Validation", () => {
    it("should handle very large expiration timestamps", () => {
      const largeExpiration = BigInt(Number.MAX_SAFE_INTEGER);
      const spendLimit: SpendLimit[] = [{ denom: "uxion", amount: "100" }];

      const result = generateBankGrant(
        largeExpiration,
        mockGrantee,
        mockGranter,
        spendLimit,
      );

      const grantValue = result.value as any;
      expect(grantValue.grant.expiration.seconds).toBe(largeExpiration);
    });

    it("should handle zero expiration", () => {
      const zeroExpiration = BigInt(0);
      const spendLimit: SpendLimit[] = [{ denom: "uxion", amount: "100" }];

      const result = generateBankGrant(
        zeroExpiration,
        mockGrantee,
        mockGranter,
        spendLimit,
      );

      const grantValue = result.value as any;
      expect(grantValue.grant.expiration.seconds).toBe(zeroExpiration);
    });

    it("should handle expiration far in the future", () => {
      const farFutureExpiration = BigInt(
        Math.floor(Date.now() / 1000) + 86400 * 365 * 10,
      ); // 10 years
      const spendLimit: SpendLimit[] = [{ denom: "uxion", amount: "100" }];

      const result = generateBankGrant(
        farFutureExpiration,
        mockGrantee,
        mockGranter,
        spendLimit,
      );

      const grantValue = result.value as any;
      expect(grantValue.grant.expiration.seconds).toBe(farFutureExpiration);
    });
  });

  describe("🟢 MEDIUM: Edge Cases", () => {
    it("should handle very long contract addresses", () => {
      const longAddress = "xion1" + "a".repeat(100);
      const contracts: ContractGrantDescription[] = [longAddress];

      const result = generateContractGrant(
        mockExpiration,
        mockGrantee,
        mockGranter,
        contracts,
      );

      const grantValue = result.value as any;
      const decodedAuth = ContractExecutionAuthorization.decode(
        grantValue.grant.authorization.value,
      );
      expect(decodedAuth.grants[0].contract).toBe(longAddress);
    });

    it("should handle special characters in denoms", () => {
      const specialDenoms: SpendLimit[] = [
        { denom: "ibc/ABC123-DEF456_789", amount: "100" },
        { denom: "factory/xion1.../sub-denom_v2", amount: "200" },
      ];

      const result = generateBankGrant(
        mockExpiration,
        mockGrantee,
        mockGranter,
        specialDenoms,
      );

      const grantValue = result.value as any;
      const decodedAuth = SendAuthorization.decode(
        grantValue.grant.authorization.value,
      );
      expect(decodedAuth.spendLimit[0].denom).toBe("ibc/ABC123-DEF456_789");
      expect(decodedAuth.spendLimit[1].denom).toBe(
        "factory/xion1.../sub-denom_v2",
      );
    });

    it("should handle zero amounts in spend limits", () => {
      const zeroAmounts: SpendLimit[] = [
        { denom: "uxion", amount: "0" },
        { denom: "uatom", amount: "0" },
      ];

      const result = generateBankGrant(
        mockExpiration,
        mockGrantee,
        mockGranter,
        zeroAmounts,
      );

      const grantValue = result.value as any;
      const decodedAuth = SendAuthorization.decode(
        grantValue.grant.authorization.value,
      );
      expect(decodedAuth.spendLimit[0].amount).toBe("0");
      expect(decodedAuth.spendLimit[1].amount).toBe("0");
    });

    it("should handle many contracts efficiently", () => {
      const manyContracts: ContractGrantDescription[] = Array.from(
        { length: 100 },
        (_, i) => `xion1contract${i}`,
      );

      const result = generateContractGrant(
        mockExpiration,
        mockGrantee,
        mockGranter,
        manyContracts,
      );

      const grantValue = result.value as any;
      const decodedAuth = ContractExecutionAuthorization.decode(
        grantValue.grant.authorization.value,
      );
      expect(decodedAuth.grants).toHaveLength(100);
    });

    it("should handle empty string addresses", () => {
      const result = generateBankGrant(mockExpiration, "", "", []);

      const grantValue = result.value as any;
      expect(grantValue.granter).toBe("");
      expect(grantValue.grantee).toBe("");
    });
  });

  describe("🟢 MEDIUM: Protobuf Encoding/Decoding", () => {
    it("should encode and decode SendAuthorization correctly", () => {
      const spendLimit: SpendLimit[] = [
        { denom: "uxion", amount: "1000000" },
        { denom: "uatom", amount: "500000" },
      ];

      const result = generateBankGrant(
        mockExpiration,
        mockGrantee,
        mockGranter,
        spendLimit,
      );

      const grantValue = result.value as any;
      const encoded = grantValue.grant.authorization.value;
      const decoded = SendAuthorization.decode(encoded);

      expect(decoded.spendLimit).toHaveLength(2);
      expect(decoded.spendLimit[0].denom).toBe("uxion");
      expect(decoded.spendLimit[0].amount).toBe("1000000");
      expect(decoded.spendLimit[1].denom).toBe("uatom");
      expect(decoded.spendLimit[1].amount).toBe("500000");
    });

    it("should encode and decode ContractExecutionAuthorization correctly", () => {
      const contracts: ContractGrantDescription[] = [
        "xion1contract1",
        { address: "xion1contract2", amounts: [{ denom: "uxion", amount: "100" }] },
      ];

      const result = generateContractGrant(
        mockExpiration,
        mockGrantee,
        mockGranter,
        contracts,
      );

      const grantValue = result.value as any;
      const encoded = grantValue.grant.authorization.value;
      const decoded = ContractExecutionAuthorization.decode(encoded);

      expect(decoded.grants).toHaveLength(2);
      expect(decoded.grants[0].contract).toBe("xion1contract1");
      expect(decoded.grants[1].contract).toBe("xion1contract2");
    });

    it("should encode and decode MaxCallsLimit correctly", () => {
      const contracts: ContractGrantDescription[] = ["xion1contract123"];

      const result = generateContractGrant(
        mockExpiration,
        mockGrantee,
        mockGranter,
        contracts,
      );

      const grantValue = result.value as any;
      const decodedAuth = ContractExecutionAuthorization.decode(
        grantValue.grant.authorization.value,
      );
      const encodedLimit = decodedAuth.grants[0].limit!.value;
      const decodedLimit = MaxCallsLimit.decode(encodedLimit);

      expect(decodedLimit.remaining).toBe(BigInt(255));
    });

    it("should encode and decode CombinedLimit correctly", () => {
      const contracts: ContractGrantDescription[] = [
        {
          address: "xion1contract123",
          amounts: [
            { denom: "uxion", amount: "1000000" },
            { denom: "uatom", amount: "500000" },
          ],
        },
      ];

      const result = generateContractGrant(
        mockExpiration,
        mockGrantee,
        mockGranter,
        contracts,
      );

      const grantValue = result.value as any;
      const decodedAuth = ContractExecutionAuthorization.decode(
        grantValue.grant.authorization.value,
      );
      const encodedLimit = decodedAuth.grants[0].limit!.value;
      const decodedLimit = CombinedLimit.decode(encodedLimit);

      expect(decodedLimit.callsRemaining).toBe(BigInt(255));
      expect(decodedLimit.amounts).toHaveLength(2);
      expect(decodedLimit.amounts[0].denom).toBe("uxion");
      expect(decodedLimit.amounts[1].denom).toBe("uatom");
    });

    it("should encode and decode GenericAuthorization correctly", () => {
      const result = generateStakeAndGovGrant(
        mockExpiration,
        mockGrantee,
        mockGranter,
      );

      const genericGrant = result.find((msg) => {
        if (msg.typeUrl !== MsgGrant.typeUrl) return false;
        const grantValue = msg.value as any;
        return (
          grantValue.grant.authorization.typeUrl ===
          GenericAuthorization.typeUrl
        );
      });

      expect(genericGrant).toBeDefined();

      const grantValue = genericGrant!.value as any;
      const decoded = GenericAuthorization.decode(
        grantValue.grant.authorization.value,
      );

      expect(decoded.msg).toBeTruthy();
      expect(typeof decoded.msg).toBe("string");
    });

    it("should encode and decode StakeAuthorization correctly", () => {
      const result = generateStakeAndGovGrant(
        mockExpiration,
        mockGrantee,
        mockGranter,
      );

      const stakeGrant = result.find((msg) => {
        if (msg.typeUrl !== MsgGrant.typeUrl) return false;
        const grantValue = msg.value as any;
        return (
          grantValue.grant.authorization.typeUrl === StakeAuthorization.typeUrl
        );
      });

      expect(stakeGrant).toBeDefined();

      const grantValue = stakeGrant!.value as any;
      const decoded = StakeAuthorization.decode(
        grantValue.grant.authorization.value,
      );

      expect(
        [
          AuthorizationType.AUTHORIZATION_TYPE_DELEGATE,
          AuthorizationType.AUTHORIZATION_TYPE_UNDELEGATE,
          AuthorizationType.AUTHORIZATION_TYPE_REDELEGATE,
        ].includes(decoded.authorizationType),
      ).toBe(true);
    });
  });

  describe("🟢 MEDIUM: TypeUrl Correctness", () => {
    it("should use correct typeUrl for MsgGrant", () => {
      const spendLimit: SpendLimit[] = [{ denom: "uxion", amount: "100" }];
      const result = generateBankGrant(
        mockExpiration,
        mockGrantee,
        mockGranter,
        spendLimit,
      );

      expect(result.typeUrl).toBe("/cosmos.authz.v1beta1.MsgGrant");
    });

    it("should use correct typeUrl for MsgGrantAllowance", () => {
      const result = generateStakeAndGovGrant(
        mockExpiration,
        mockGrantee,
        mockGranter,
      );

      const feeGrant = result.find(
        (msg) => msg.typeUrl === MsgGrantAllowance.typeUrl,
      );
      expect(feeGrant?.typeUrl).toBe("/cosmos.feegrant.v1beta1.MsgGrantAllowance");
    });

    it("should use correct typeUrl for SendAuthorization", () => {
      const spendLimit: SpendLimit[] = [{ denom: "uxion", amount: "100" }];
      const result = generateBankGrant(
        mockExpiration,
        mockGrantee,
        mockGranter,
        spendLimit,
      );

      const grantValue = result.value as any;
      expect(grantValue.grant.authorization.typeUrl).toBe(
        "/cosmos.bank.v1beta1.SendAuthorization",
      );
    });

    it("should use correct typeUrl for ContractExecutionAuthorization", () => {
      const contracts: ContractGrantDescription[] = ["xion1contract123"];
      const result = generateContractGrant(
        mockExpiration,
        mockGrantee,
        mockGranter,
        contracts,
      );

      const grantValue = result.value as any;
      expect(grantValue.grant.authorization.typeUrl).toBe(
        "/cosmwasm.wasm.v1.ContractExecutionAuthorization",
      );
    });

    it("should use correct typeUrl for MaxCallsLimit", () => {
      const contracts: ContractGrantDescription[] = ["xion1contract123"];
      const result = generateContractGrant(
        mockExpiration,
        mockGrantee,
        mockGranter,
        contracts,
      );

      const grantValue = result.value as any;
      const decodedAuth = ContractExecutionAuthorization.decode(
        grantValue.grant.authorization.value,
      );
      expect(decodedAuth.grants[0].limit?.typeUrl).toBe(
        "/cosmwasm.wasm.v1.MaxCallsLimit",
      );
    });

    it("should use correct typeUrl for CombinedLimit", () => {
      const contracts: ContractGrantDescription[] = [
        { address: "xion1contract123", amounts: [{ denom: "uxion", amount: "100" }] },
      ];
      const result = generateContractGrant(
        mockExpiration,
        mockGrantee,
        mockGranter,
        contracts,
      );

      const grantValue = result.value as any;
      const decodedAuth = ContractExecutionAuthorization.decode(
        grantValue.grant.authorization.value,
      );
      expect(decodedAuth.grants[0].limit?.typeUrl).toBe(
        "/cosmwasm.wasm.v1.CombinedLimit",
      );
    });

    it("should use correct typeUrl for AllowAllMessagesFilter", () => {
      const contracts: ContractGrantDescription[] = ["xion1contract123"];
      const result = generateContractGrant(
        mockExpiration,
        mockGrantee,
        mockGranter,
        contracts,
      );

      const grantValue = result.value as any;
      const decodedAuth = ContractExecutionAuthorization.decode(
        grantValue.grant.authorization.value,
      );
      expect(decodedAuth.grants[0].filter?.typeUrl).toBe(
        "/cosmwasm.wasm.v1.AllowAllMessagesFilter",
      );
    });
  });
});
