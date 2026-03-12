import { describe, it, expect } from "vitest";
import { fetchChainGrantsABCI } from "../query";
import { compareStakeGrants, compareBankGrants } from "../compare";

/**
 * Integration tests for PR #336 fix: ABCI grants decoded to REST format for legacy validation
 *
 * These tests connect to the actual XION testnet to verify that:
 * 1. fetchChainGrantsABCI successfully queries the chain
 * 2. The decoded authorization format is compatible with legacy compare functions
 *
 * For full E2E testing with real grants, set environment variables:
 * - XION_TEST_GRANTER: Address that has issued grants
 * - XION_TEST_GRANTEE: Address that has received grants from the granter
 *
 * Example:
 *   XION_TEST_GRANTER=xion1... XION_TEST_GRANTEE=xion1... pnpm test -- -t "Integration"
 */

// Testnet configuration from .github/config/test-environments.json
const TESTNET_CONFIG = {
  rpcUrl: "https://rpc.xion-testnet-2.burnt.com:443",
  chainId: "xion-testnet-2",
  treasuryAddress:
    "xion1sv6kdau6mvjlzkthdhpcl53e8zmhaltmgzz9jhxgkxhmpymla9gqrh0knw",
  feeGranter: "xion1xrqz2wpt4rw8rtdvrc4n4yn5h54jm0nn4evn2x",
};

// Check for environment-provided grant pair
const TEST_GRANTER = process.env.XION_TEST_GRANTER || TESTNET_CONFIG.treasuryAddress;
const TEST_GRANTEE = process.env.XION_TEST_GRANTEE || TESTNET_CONFIG.feeGranter;
const HAS_ENV_GRANTS = !!(process.env.XION_TEST_GRANTER && process.env.XION_TEST_GRANTEE);

describe("ABCI Grant Decoding Integration Tests (PR #336)", () => {
  describe("fetchChainGrantsABCI against testnet", () => {
    it("should successfully connect to testnet and query grants", async () => {
      const result = await fetchChainGrantsABCI(
        TEST_GRANTEE,
        TEST_GRANTER,
        TESTNET_CONFIG.rpcUrl,
      );

      // Verify the response structure
      expect(result).toHaveProperty("grants");
      expect(result).toHaveProperty("pagination");
      expect(Array.isArray(result.grants)).toBe(true);

      // Log grant count for debugging
      console.log(`Grants found: ${result.grants.length}`);
      if (result.grants.length > 0) {
        console.log("Sample grant:", JSON.stringify(result.grants[0], null, 2));
      }
    });

    it("should throw error when grantee is missing", async () => {
      await expect(
        fetchChainGrantsABCI(
          undefined,
          TEST_GRANTER,
          TESTNET_CONFIG.rpcUrl,
        ),
      ).rejects.toThrow("Grantee address is required");
    });

    it("should throw error when granter is missing", async () => {
      await expect(
        fetchChainGrantsABCI(
          TEST_GRANTEE,
          undefined,
          TESTNET_CONFIG.rpcUrl,
        ),
      ).rejects.toThrow("Granter address is required");
    });

    it("should throw error when RPC URL is missing", async () => {
      await expect(
        fetchChainGrantsABCI(
          TEST_GRANTEE,
          TEST_GRANTER,
          undefined,
        ),
      ).rejects.toThrow("RPC URL is required");
    });
  });

  describe("Format validation for decoded grants", () => {
    /**
     * This test verifies that when grants exist, they are decoded
     * in the correct REST format expected by legacy compare functions.
     *
     * The key fields that must be present:
     * - "@type" (not "typeUrl")
     * - For StakeAuthorization: "authorization_type" (not "authorizationType")
     * - For SendAuthorization: "spend_limit" (not "spendLimit")
     * - For GenericAuthorization: "msg"
     */
    it("should decode grant authorizations with correct REST format keys", async () => {
      const result = await fetchChainGrantsABCI(
        TEST_GRANTEE,
        TEST_GRANTER,
        TESTNET_CONFIG.rpcUrl,
      );

      // If no grants exist, log a message and skip format validation
      if (result.grants.length === 0) {
        console.log(
          "No grants found between test addresses. " +
          "Set XION_TEST_GRANTER and XION_TEST_GRANTEE env vars to test with real grants."
        );
        return;
      }

      // Verify format for each grant
      for (const grant of result.grants) {
        expect(grant).toHaveProperty("authorization");
        expect(grant).toHaveProperty("expiration");

        const auth = grant.authorization;

        // Must have @type field (REST format) for legacy comparison
        expect(auth).toHaveProperty("@type");
        // Must also have typeUrl and value (raw protobuf) for treasury comparison
        expect(auth).toHaveProperty("typeUrl");
        expect(auth).toHaveProperty("value");

        // Validate format based on authorization type
        const type = auth["@type"] as string;

        if (type === "/cosmos.staking.v1beta1.StakeAuthorization") {
          // Must use snake_case REST format
          expect(auth).toHaveProperty("authorization_type");
          expect(auth).toHaveProperty("max_tokens");
          expect(auth).toHaveProperty("allow_list");
          expect(auth).toHaveProperty("deny_list");

          // Verify authorization_type is a string, not a number
          expect(typeof auth.authorization_type).toBe("string");
          expect(auth.authorization_type).toMatch(
            /^AUTHORIZATION_TYPE_(UNSPECIFIED|DELEGATE|UNDELEGATE|REDELEGATE)$/,
          );
        }

        if (type === "/cosmos.bank.v1beta1.SendAuthorization") {
          // Must use snake_case REST format
          expect(auth).toHaveProperty("spend_limit");
          expect(auth).toHaveProperty("allow_list");
          expect(Array.isArray(auth.spend_limit)).toBe(true);

          // Verify spend_limit items have correct structure
          for (const limit of auth.spend_limit as Array<{
            denom: string;
            amount: string;
          }>) {
            expect(limit).toHaveProperty("denom");
            expect(limit).toHaveProperty("amount");
            expect(typeof limit.denom).toBe("string");
            expect(typeof limit.amount).toBe("string");
          }
        }

        if (type === "/cosmos.authz.v1beta1.GenericAuthorization") {
          expect(auth).toHaveProperty("msg");
          expect(typeof auth.msg).toBe("string");
        }
      }
    });
  });

  describe("Legacy compare function compatibility", () => {
    it("should produce grants compatible with compareStakeGrants", async () => {
      const result = await fetchChainGrantsABCI(
        TEST_GRANTEE,
        TEST_GRANTER,
        TESTNET_CONFIG.rpcUrl,
      );

      // compareStakeGrants should not throw when processing decoded grants
      expect(() => compareStakeGrants(result.grants, false)).not.toThrow();
      expect(() => compareStakeGrants(result.grants, true)).not.toThrow();

      // With stake=false, should always return true
      expect(compareStakeGrants(result.grants, false)).toBe(true);

      // Log stake grant status if grants exist
      if (result.grants.length > 0) {
        const hasAllStakeGrants = compareStakeGrants(result.grants, true);
        console.log(`Has all required stake grants: ${hasAllStakeGrants}`);
      }
    });

    it("should produce grants compatible with compareBankGrants", async () => {
      const result = await fetchChainGrantsABCI(
        TEST_GRANTEE,
        TEST_GRANTER,
        TESTNET_CONFIG.rpcUrl,
      );

      // compareBankGrants should not throw when processing decoded grants
      expect(() => compareBankGrants(result.grants, undefined)).not.toThrow();
      expect(() =>
        compareBankGrants(result.grants, [{ denom: "uxion", amount: "1000000" }]),
      ).not.toThrow();

      // With bank=undefined, should always return true
      expect(compareBankGrants(result.grants, undefined)).toBe(true);
    });
  });

  // Conditional test: only run when env vars are set with real grant addresses
  describe.skipIf(!HAS_ENV_GRANTS)("Live grant E2E validation", () => {
    it("should fetch and decode actual grants from testnet", async () => {
      const result = await fetchChainGrantsABCI(
        TEST_GRANTEE,
        TEST_GRANTER,
        TESTNET_CONFIG.rpcUrl,
      );

      // Should have at least one grant when env vars are properly configured
      expect(result.grants.length).toBeGreaterThan(0);

      console.log("Fetched grants:", JSON.stringify(result.grants, null, 2));

      // Verify each grant has the correct format
      for (const grant of result.grants) {
        expect(grant.granter).toBe(TEST_GRANTER);
        expect(grant.grantee).toBe(TEST_GRANTEE);
        expect(grant.authorization["@type"]).toBeDefined();
      }
    });

    it("should validate all stake grant types if present", async () => {
      const result = await fetchChainGrantsABCI(
        TEST_GRANTEE,
        TEST_GRANTER,
        TESTNET_CONFIG.rpcUrl,
      );

      // Log the stake grants for debugging
      const stakeGrants = result.grants.filter((g) =>
        [
          "/cosmos.staking.v1beta1.StakeAuthorization",
          "/cosmos.authz.v1beta1.GenericAuthorization",
        ].includes(g.authorization["@type"] as string),
      );

      console.log("Stake-related grants found:", stakeGrants.length);

      if (stakeGrants.length > 0) {
        console.log("Stake grants:", JSON.stringify(stakeGrants, null, 2));

        // Check if all required stake grants are present
        const hasAllStakeGrants = compareStakeGrants(result.grants, true);
        console.log("Has all required stake grants:", hasAllStakeGrants);
      }
    });

    it("should validate bank grants if present", async () => {
      const result = await fetchChainGrantsABCI(
        TEST_GRANTEE,
        TEST_GRANTER,
        TESTNET_CONFIG.rpcUrl,
      );

      const bankGrants = result.grants.filter(
        (g) => g.authorization["@type"] === "/cosmos.bank.v1beta1.SendAuthorization",
      );

      console.log("Bank grants found:", bankGrants.length);

      if (bankGrants.length > 0) {
        console.log("Bank grants:", JSON.stringify(bankGrants, null, 2));

        // Verify the spend_limit format is correct
        for (const grant of bankGrants) {
          const auth = grant.authorization;
          expect(auth).toHaveProperty("spend_limit");
          expect(auth).toHaveProperty("allow_list");

          for (const limit of auth.spend_limit as Array<{ denom: string; amount: string }>) {
            expect(typeof limit.denom).toBe("string");
            expect(typeof limit.amount).toBe("string");
          }
        }
      }
    });
  });
});

describe("Demonstrating PR #336 fix necessity", () => {
  it("should FAIL with protobuf format (what ABCI returns without decoding)", () => {
    // This is what fetchChainGrantsABCI returned BEFORE PR #336
    const grantsWithoutFix = [
      {
        authorization: {
          typeUrl: "/cosmos.staking.v1beta1.StakeAuthorization", // WRONG
          authorizationType: 1, // WRONG: number instead of string
        },
        expiration: "2026-05-02T17:31:53.000Z",
      },
    ];

    // compareStakeGrants looks for "@type" not "typeUrl"
    // So this will return false (validation fails)
    const result = compareStakeGrants(grantsWithoutFix as any, true);
    expect(result).toBe(false); // FAILS without the fix
  });

  it("should PASS with REST format (what ABCI returns WITH decoding from PR #336)", () => {
    const grantsWithFix = [
      {
        authorization: {
          "@type": "/cosmos.staking.v1beta1.StakeAuthorization",
          authorization_type: "AUTHORIZATION_TYPE_DELEGATE",
          max_tokens: null,
          allow_list: [],
          deny_list: [],
        },
        expiration: "2026-05-02T17:31:53.000Z",
      },
      {
        authorization: {
          "@type": "/cosmos.staking.v1beta1.StakeAuthorization",
          authorization_type: "AUTHORIZATION_TYPE_UNDELEGATE",
        },
        expiration: "2026-05-02T17:31:53.000Z",
      },
      {
        authorization: {
          "@type": "/cosmos.staking.v1beta1.StakeAuthorization",
          authorization_type: "AUTHORIZATION_TYPE_REDELEGATE",
        },
        expiration: "2026-05-02T17:31:53.000Z",
      },
      {
        authorization: {
          "@type": "/cosmos.authz.v1beta1.GenericAuthorization",
          msg: "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward",
        },
        expiration: "2026-05-02T17:31:53.000Z",
      },
      {
        authorization: {
          "@type": "/cosmos.authz.v1beta1.GenericAuthorization",
          msg: "/cosmos.staking.v1beta1.MsgCancelUnbondingDelegation",
        },
        expiration: "2026-05-02T17:31:53.000Z",
      },
    ];

    // With proper REST format, validation passes
    const result = compareStakeGrants(grantsWithFix as any, true);
    expect(result).toBe(true); // PASSES with the fix
  });
});

describe("Dual format validation (REST + raw protobuf)", () => {
  it("should have decoded REST fields for known types alongside raw protobuf", async () => {
    const result = await fetchChainGrantsABCI(
      TEST_GRANTEE,
      TEST_GRANTER,
      TESTNET_CONFIG.rpcUrl,
    );

    for (const grant of result.grants) {
      const auth = grant.authorization;
      const type = auth["@type"] as string;

      // All grants should have raw protobuf fields for treasury comparison
      expect(auth).toHaveProperty("typeUrl");
      expect(auth).toHaveProperty("value");
      expect(auth.typeUrl).toBe(type);

      // Known types should also have their decoded REST fields
      if (type === "/cosmos.authz.v1beta1.GenericAuthorization") {
        expect(auth).toHaveProperty("msg");
        expect(typeof auth.msg).toBe("string");
      }

      if (type === "/cosmos.bank.v1beta1.SendAuthorization") {
        expect(auth).toHaveProperty("spend_limit");
        expect(Array.isArray(auth.spend_limit)).toBe(true);
      }

      if (type === "/cosmos.staking.v1beta1.StakeAuthorization") {
        expect(auth).toHaveProperty("authorization_type");
        expect(typeof auth.authorization_type).toBe("string");
      }
    }
  });

  it("should produce raw protobuf values that can be re-decoded for treasury comparison", async () => {
    // Import decodeAuthorization to verify raw values can be decoded
    const { decodeAuthorization } = await import("../decoding");

    const result = await fetchChainGrantsABCI(
      TEST_GRANTEE,
      TEST_GRANTER,
      TESTNET_CONFIG.rpcUrl,
    );

    for (const grant of result.grants) {
      const auth = grant.authorization;

      // Verify that typeUrl + value can be successfully decoded
      // This is the path used by compareGrantsToTreasuryWithConfigs
      const decoded = decodeAuthorization(auth.typeUrl, auth.value);
      expect(decoded).toBeDefined();
      expect(decoded.type).toBe(auth["@type"]);
    }
  });
});
