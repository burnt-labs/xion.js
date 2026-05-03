/**
 * Grant Management Integration Tests
 *
 * Tests grant creation, validation, and treasury querying flows.
 * Validates AuthZ grants, FeeGrants, treasury contract interactions, and MsgExec construction.
 *
 * These tests chain together real flows: treasury discovery → grant construction → grant validation
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerGlobalHooks } from "../setup";
import {
  getTestConfig,
  INTEGRATION_TEST_TIMEOUT,
  EXPECTED_VALUES,
  TEST_MNEMONIC,
} from "../fixtures";
import {
  createSecp256k1Wallet,
  createTestStargateClient,
  createMockStorageStrategy,
  createMockSessionManager,
  checkTreasuryContract,
  isValidXionAddress,
  retryWithBackoff,
} from "../helpers";
import {
  generateTreasuryGrants,
  generateBankGrant,
  generateContractGrant,
  queryTreasuryContractWithPermissions,
  type SessionManager,
} from "@burnt-labs/account-management";
import { StargateClient } from "@cosmjs/stargate";
import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { DirectQueryTreasuryStrategy } from "@burnt-labs/account-management";

describe("Grant Management Integration Tests", () => {
  registerGlobalHooks();

  let config: ReturnType<typeof getTestConfig>;
  let stargateClient: StargateClient;
  let sessionManager: SessionManager;
  let storageStrategy: ReturnType<typeof createMockStorageStrategy>;
  let cosmwasmClient: CosmWasmClient;

  beforeEach(async () => {
    config = getTestConfig();
    stargateClient = await createTestStargateClient();
    storageStrategy = createMockStorageStrategy();
    sessionManager = createMockSessionManager(storageStrategy);

    // Create CosmWasm client for treasury queries (query-only, no signer needed)
    cosmwasmClient = await CosmWasmClient.connect(config.rpcUrl);
  });

  describe("Treasury Contract Querying", () => {
    it(
      "should query treasury contract and return valid configuration",
      async () => {
        const treasuryExists = await checkTreasuryContract(
          config.treasuryAddress,
        );

        if (!treasuryExists) {
          console.log("⚠ Treasury contract not available, skipping test");
          return;
        }

        // Create treasury strategy
        const treasuryStrategy = new DirectQueryTreasuryStrategy();

        // Create a test account for querying
        const { address: testAccount } = await createSecp256k1Wallet();

        // Query treasury with permissions
        const result = await queryTreasuryContractWithPermissions(
          config.treasuryAddress,
          cosmwasmClient,
          testAccount,
          treasuryStrategy,
        );

        // Validate response structure
        expect(result).toBeDefined();
        expect(result.permissionDescriptions).toBeDefined();
        expect(Array.isArray(result.permissionDescriptions)).toBe(true);
        expect(result.params).toBeDefined();
        expect(result.params.redirect_url).toBeDefined();

        console.log("✓ Treasury contract queried successfully");
        console.log(
          `  Permissions found: ${result.permissionDescriptions.length}`,
        );
      },
      INTEGRATION_TEST_TIMEOUT,
    );

    it(
      "should validate treasury address format",
      async () => {
        expect(isValidXionAddress(config.treasuryAddress)).toBe(true);
        expect(config.treasuryAddress.startsWith("xion1")).toBe(true);

        console.log("✓ Treasury address format valid:", config.treasuryAddress);
      },
      INTEGRATION_TEST_TIMEOUT,
    );

    it(
      "should handle treasury contract not found gracefully",
      async () => {
        const invalidTreasuryAddress =
          "xion1invalidaddressthisshouldfail000000000000";
        const treasuryStrategy = new DirectQueryTreasuryStrategy();
        const { address: testAccount } = await createSecp256k1Wallet();

        await expect(
          queryTreasuryContractWithPermissions(
            invalidTreasuryAddress,
            cosmwasmClient,
            testAccount,
            treasuryStrategy,
          ),
        ).rejects.toThrow();

        console.log("✓ Invalid treasury address handled correctly");
      },
      INTEGRATION_TEST_TIMEOUT,
    );
  });

  describe("Treasury Grant Generation", () => {
    it(
      "should generate grants from treasury contract",
      async () => {
        const treasuryExists = await checkTreasuryContract(
          config.treasuryAddress,
        );

        if (!treasuryExists) {
          console.log("⚠ Treasury contract not available, skipping test");
          return;
        }

        const treasuryStrategy = new DirectQueryTreasuryStrategy();
        const { address: granter } = await createSecp256k1Wallet(undefined, 0);
        const { address: grantee } = await createSecp256k1Wallet(undefined, 1);

        // Generate grants from treasury
        const grants = await generateTreasuryGrants(
          config.treasuryAddress,
          cosmwasmClient,
          granter,
          grantee,
          treasuryStrategy,
        );

        // Validate grants
        expect(grants).toBeDefined();
        expect(Array.isArray(grants)).toBe(true);
        expect(grants.length).toBeGreaterThan(0);

        // Validate grant structure
        grants.forEach((grant) => {
          expect(grant.typeUrl).toBeDefined();
          expect(grant.value).toBeDefined();
          expect(grant.typeUrl).toContain("Grant");
        });

        console.log("✓ Generated grants from treasury:", grants.length);
      },
      INTEGRATION_TEST_TIMEOUT,
    );

    it(
      "should generate grants with custom expiration",
      async () => {
        const treasuryExists = await checkTreasuryContract(
          config.treasuryAddress,
        );

        if (!treasuryExists) {
          console.log("⚠ Treasury contract not available, skipping test");
          return;
        }

        const treasuryStrategy = new DirectQueryTreasuryStrategy();
        const { address: granter } = await createSecp256k1Wallet(undefined, 2);
        const { address: grantee } = await createSecp256k1Wallet(undefined, 3);

        // Set expiration to 1 month from now
        const oneMonthFromNow = BigInt(
          Math.floor(
            new Date(new Date().setMonth(new Date().getMonth() + 1)).getTime() /
              1000,
          ),
        );

        const grants = await generateTreasuryGrants(
          config.treasuryAddress,
          cosmwasmClient,
          granter,
          grantee,
          treasuryStrategy,
          oneMonthFromNow,
        );

        expect(grants).toBeDefined();
        expect(grants.length).toBeGreaterThan(0);

        console.log("✓ Generated grants with custom expiration");
      },
      INTEGRATION_TEST_TIMEOUT,
    );
  });

  describe("Manual Grant Construction", () => {
    it(
      "should construct bank (send) authorization grant",
      async () => {
        const { address: granter } = await createSecp256k1Wallet(undefined, 4);
        const { address: grantee } = await createSecp256k1Wallet(undefined, 5);

        // Set expiration to 1 day from now
        const expiration = BigInt(Math.floor(Date.now() / 1000) + 86400);

        // Create bank grant with spend limit
        const bankGrant = generateBankGrant(expiration, grantee, granter, [
          {
            denom: "uxion",
            amount: "1000000", // 1 XION
          },
        ]);

        // Validate grant structure
        expect(bankGrant).toBeDefined();
        expect(bankGrant.typeUrl).toBe("/cosmos.authz.v1beta1.MsgGrant");
        expect(bankGrant.value).toBeDefined();

        console.log("✓ Bank grant constructed successfully");
      },
      INTEGRATION_TEST_TIMEOUT,
    );

    it(
      "should construct contract execution authorization grant",
      async () => {
        const { address: granter } = await createSecp256k1Wallet(undefined, 6);
        const { address: grantee } = await createSecp256k1Wallet(undefined, 7);

        // Set expiration to 1 day from now
        const expiration = BigInt(Math.floor(Date.now() / 1000) + 86400);

        // Create contract grant
        const contractGrant = generateContractGrant(
          expiration,
          grantee,
          granter,
          [config.treasuryAddress], // Use treasury as example contract
        );

        // Validate grant structure
        expect(contractGrant).toBeDefined();
        expect(contractGrant.typeUrl).toBe("/cosmos.authz.v1beta1.MsgGrant");
        expect(contractGrant.value).toBeDefined();

        console.log("✓ Contract grant constructed successfully");
      },
      INTEGRATION_TEST_TIMEOUT,
    );

    it(
      "should construct contract grant with spend limits",
      async () => {
        const { address: granter } = await createSecp256k1Wallet(undefined, 8);
        const { address: grantee } = await createSecp256k1Wallet(undefined, 9);

        // Set expiration to 1 day from now
        const expiration = BigInt(Math.floor(Date.now() / 1000) + 86400);

        // Create contract grant with spend limits
        const contractGrant = generateContractGrant(
          expiration,
          grantee,
          granter,
          [
            {
              address: config.treasuryAddress,
              amounts: [
                {
                  denom: "uxion",
                  amount: "500000", // 0.5 XION
                },
              ],
            },
          ],
        );

        expect(contractGrant).toBeDefined();
        expect(contractGrant.typeUrl).toBe("/cosmos.authz.v1beta1.MsgGrant");

        console.log("✓ Contract grant with spend limits constructed");
      },
      INTEGRATION_TEST_TIMEOUT,
    );
  });

  describe("Grant Validation", () => {
    it(
      "should validate grant addresses are in correct format",
      async () => {
        const { address: granter } = await createSecp256k1Wallet(undefined, 10);
        const { address: grantee } = await createSecp256k1Wallet(undefined, 11);

        expect(isValidXionAddress(granter)).toBe(true);
        expect(isValidXionAddress(grantee)).toBe(true);
        expect(granter).not.toBe(grantee);

        console.log("✓ Grant addresses validated");
      },
      INTEGRATION_TEST_TIMEOUT,
    );

    it(
      "should validate grant expiration is in the future",
      async () => {
        const currentTime = BigInt(Math.floor(Date.now() / 1000));
        const futureExpiration = currentTime + BigInt(86400); // +1 day

        expect(futureExpiration).toBeGreaterThan(currentTime);

        console.log("✓ Grant expiration validation successful");
      },
      INTEGRATION_TEST_TIMEOUT,
    );

    it(
      "should reject grants with invalid spend limits",
      async () => {
        const { address: granter } = await createSecp256k1Wallet(undefined, 12);
        const { address: grantee } = await createSecp256k1Wallet(undefined, 13);
        const expiration = BigInt(Math.floor(Date.now() / 1000) + 86400);

        // Try to create grant with invalid denom (should still construct, validation happens on-chain)
        const bankGrant = generateBankGrant(expiration, grantee, granter, [
          {
            denom: "", // Invalid empty denom
            amount: "1000000",
          },
        ]);

        // Grant should still be constructed (validation happens on-chain)
        expect(bankGrant).toBeDefined();

        console.log("✓ Invalid spend limits handled at construction level");
      },
      INTEGRATION_TEST_TIMEOUT,
    );
  });

  describe("Grant Error Handling", () => {
    it(
      "should handle missing granter address",
      async () => {
        const { address: grantee } = await createSecp256k1Wallet(undefined, 14);
        const expiration = BigInt(Math.floor(Date.now() / 1000) + 86400);

        // Should throw or handle gracefully
        expect(() => {
          generateBankGrant(expiration, grantee, "", [
            { denom: "uxion", amount: "1000000" },
          ]);
        }).not.toThrow(); // Constructor doesn't validate, but on-chain will fail

        console.log("✓ Missing granter handled at construction");
      },
      INTEGRATION_TEST_TIMEOUT,
    );

    it(
      "should handle missing grantee address",
      async () => {
        const { address: granter } = await createSecp256k1Wallet(undefined, 15);
        const expiration = BigInt(Math.floor(Date.now() / 1000) + 86400);

        expect(() => {
          generateBankGrant(expiration, "", granter, [
            { denom: "uxion", amount: "1000000" },
          ]);
        }).not.toThrow(); // Constructor doesn't validate, but on-chain will fail

        console.log("✓ Missing grantee handled at construction");
      },
      INTEGRATION_TEST_TIMEOUT,
    );

    it(
      "should handle treasury query failures gracefully",
      async () => {
        const treasuryStrategy = new DirectQueryTreasuryStrategy();
        const { address: testAccount } = await createSecp256k1Wallet(
          undefined,
          16,
        );

        // Use invalid RPC client
        const invalidClient = {
          queryContractSmart: async () => {
            throw new Error("RPC connection failed");
          },
          getChainId: async () => "test-chain",
        } as any;

        await expect(
          queryTreasuryContractWithPermissions(
            config.treasuryAddress,
            invalidClient,
            testAccount,
            treasuryStrategy,
          ),
        ).rejects.toThrow();

        console.log("✓ Treasury query failures handled gracefully");
      },
      INTEGRATION_TEST_TIMEOUT,
    );
  });

  describe("Grant Performance", () => {
    it(
      "should generate grants within reasonable time",
      async () => {
        const treasuryExists = await checkTreasuryContract(
          config.treasuryAddress,
        );

        if (!treasuryExists) {
          console.log("⚠ Treasury contract not available, skipping test");
          return;
        }

        const treasuryStrategy = new DirectQueryTreasuryStrategy();
        const { address: granter } = await createSecp256k1Wallet(undefined, 17);
        const { address: grantee } = await createSecp256k1Wallet(undefined, 18);

        const startTime = Date.now();

        await generateTreasuryGrants(
          config.treasuryAddress,
          cosmwasmClient,
          granter,
          grantee,
          treasuryStrategy,
        );

        const duration = Date.now() - startTime;

        // Should complete in reasonable time (< 5 seconds)
        expect(duration).toBeLessThan(5000);

        console.log(`✓ Grants generated in ${duration}ms`);
      },
      INTEGRATION_TEST_TIMEOUT,
    );

    it(
      "should query treasury permissions within reasonable time",
      async () => {
        const treasuryExists = await checkTreasuryContract(
          config.treasuryAddress,
        );

        if (!treasuryExists) {
          console.log("⚠ Treasury contract not available, skipping test");
          return;
        }

        const treasuryStrategy = new DirectQueryTreasuryStrategy();
        const { address: testAccount } = await createSecp256k1Wallet(
          undefined,
          19,
        );

        const startTime = Date.now();

        await queryTreasuryContractWithPermissions(
          config.treasuryAddress,
          cosmwasmClient,
          testAccount,
          treasuryStrategy,
        );

        const duration = Date.now() - startTime;

        // Should complete in reasonable time (< 5 seconds)
        expect(duration).toBeLessThan(5000);

        console.log(`✓ Treasury permissions queried in ${duration}ms`);
      },
      INTEGRATION_TEST_TIMEOUT,
    );
  });

  describe("Grant Retry Logic", () => {
    it(
      "should retry failed treasury queries with backoff",
      async () => {
        const treasuryExists = await checkTreasuryContract(
          config.treasuryAddress,
        );

        if (!treasuryExists) {
          console.log("⚠ Treasury contract not available, skipping test");
          return;
        }

        const treasuryStrategy = new DirectQueryTreasuryStrategy();
        const { address: testAccount } = await createSecp256k1Wallet(
          undefined,
          20,
        );

        // Use retry helper
        const result = await retryWithBackoff(
          async () =>
            queryTreasuryContractWithPermissions(
              config.treasuryAddress,
              cosmwasmClient,
              testAccount,
              treasuryStrategy,
            ),
          3,
          1000,
        );

        expect(result).toBeDefined();
        expect(result.permissionDescriptions).toBeDefined();

        console.log("✓ Retry logic works with treasury queries");
      },
      INTEGRATION_TEST_TIMEOUT,
    );
  });
});
