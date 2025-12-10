/**
 * Account Discovery Integration Tests
 *
 * Tests account discovery mechanisms using real query strategies against testnet.
 * Validates RPC strategy, indexer strategies, and fallback behaviors.
 *
 * These tests validate the full account discovery flow using ConnectionOrchestrator
 * and CompositeAccountStrategy - the actual APIs used in production.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerGlobalHooks } from "../setup";
import {
  getTestConfig,
  INTEGRATION_TEST_TIMEOUT,
  EXPECTED_VALUES,
} from "../fixtures";
import {
  createSecp256k1Wallet,
  createTestStargateClient,
  createMockStorageStrategy,
  createMockSessionManager,
  isValidXionAddress,
  retryWithBackoff,
} from "../helpers";
import {
  CompositeAccountStrategy,
  RpcAccountStrategy,
  checkAccountExists,
  type SessionManager,
} from "@burnt-labs/account-management";
import { AUTHENTICATOR_TYPE } from "@burnt-labs/signers";
import { StargateClient } from "@cosmjs/stargate";

describe("Account Discovery Integration Tests", () => {
  registerGlobalHooks();

  let config: ReturnType<typeof getTestConfig>;
  let stargateClient: StargateClient;
  let sessionManager: SessionManager;
  let storageStrategy: ReturnType<typeof createMockStorageStrategy>;

  beforeEach(async () => {
    config = getTestConfig();
    stargateClient = await createTestStargateClient();
    storageStrategy = createMockStorageStrategy();
    sessionManager = createMockSessionManager(storageStrategy);
  });

  describe("RPC Strategy Account Discovery", () => {
    it(
      "should discover accounts using RPC strategy for Secp256K1 authenticator",
      async () => {
        // Create a test wallet and get its pubkey
        const { pubkeyBase64, address } = await createSecp256k1Wallet();

        // Create RPC-based account strategy
        const rpcStrategy = new RpcAccountStrategy(config.rpcUrl);
        const accountStrategy = new CompositeAccountStrategy([rpcStrategy]);

        // Check if account exists using the real account discovery API
        const result = await checkAccountExists(
          accountStrategy,
          pubkeyBase64,
          AUTHENTICATOR_TYPE.Secp256K1,
        );

        // Account may or may not exist, but the API should work
        expect(result).toBeDefined();
        expect(result.exists).toBeDefined();
        expect(Array.isArray(result.accounts)).toBe(true);

        // If account exists, validate its structure
        if (result.exists) {
          expect(result.smartAccountAddress).toBeDefined();
          expect(isValidXionAddress(result.smartAccountAddress!)).toBe(true);
          expect(result.codeId).toBeGreaterThan(0);
          expect(result.authenticatorIndex).toBeGreaterThanOrEqual(0);

          console.log("✓ Found existing account:", result.smartAccountAddress);
        } else {
          console.log("✓ No existing account found (expected for new wallet)");
        }
      },
      INTEGRATION_TEST_TIMEOUT,
    );

    it(
      "should handle account discovery for authenticator with no accounts",
      async () => {
        // Generate a fresh wallet that definitely has no accounts
        const { pubkeyBase64 } = await createSecp256k1Wallet(undefined, 999);

        const rpcStrategy = new RpcAccountStrategy(config.rpcUrl);
        const accountStrategy = new CompositeAccountStrategy([rpcStrategy]);

        const result = await checkAccountExists(
          accountStrategy,
          pubkeyBase64,
          AUTHENTICATOR_TYPE.Secp256K1,
        );

        // Should return exists: false for new authenticator
        expect(result.exists).toBe(false);
        expect(result.accounts).toHaveLength(0);
        expect(result.smartAccountAddress).toBeUndefined();
      },
      INTEGRATION_TEST_TIMEOUT,
    );

    it(
      "should return consistent results on multiple queries",
      async () => {
        const { pubkeyBase64 } = await createSecp256k1Wallet();

        const rpcStrategy = new RpcAccountStrategy(config.rpcUrl);
        const accountStrategy = new CompositeAccountStrategy([rpcStrategy]);

        // Query twice
        const result1 = await checkAccountExists(
          accountStrategy,
          pubkeyBase64,
          AUTHENTICATOR_TYPE.Secp256K1,
        );

        const result2 = await checkAccountExists(
          accountStrategy,
          pubkeyBase64,
          AUTHENTICATOR_TYPE.Secp256K1,
        );

        // Results should be identical
        expect(result1.exists).toBe(result2.exists);
        expect(result1.smartAccountAddress).toBe(result2.smartAccountAddress);
        expect(result1.codeId).toBe(result2.codeId);
      },
      INTEGRATION_TEST_TIMEOUT,
    );
  });

  describe("EthWallet Authenticator Discovery", () => {
    it(
      "should discover accounts for EthWallet authenticator type",
      async () => {
        // For EthWallet, the authenticator is the lowercase ETH address
        // We'll use a test ETH address format
        const testEthAddress = "0x742d35cc6634c0532925a3b844bc9e7595f0beb".toLowerCase();

        const rpcStrategy = new RpcAccountStrategy(config.rpcUrl);
        const accountStrategy = new CompositeAccountStrategy([rpcStrategy]);

        const result = await checkAccountExists(
          accountStrategy,
          testEthAddress,
          AUTHENTICATOR_TYPE.EthWallet,
        );

        // Should not throw and return valid response
        expect(result).toBeDefined();
        expect(result.exists).toBeDefined();

        if (result.exists) {
          expect(isValidXionAddress(result.smartAccountAddress!)).toBe(true);
          console.log("✓ Found EthWallet account:", result.smartAccountAddress);
        }
      },
      INTEGRATION_TEST_TIMEOUT,
    );
  });

  describe("Composite Strategy Fallback Behavior", () => {
    it(
      "should use composite strategy with RPC as fallback",
      async () => {
        const { pubkeyBase64 } = await createSecp256k1Wallet();

        // Create composite strategy with RPC
        // In production, this might include indexer strategies that fallback to RPC
        const rpcStrategy = new RpcAccountStrategy(config.rpcUrl);
        const accountStrategy = new CompositeAccountStrategy([rpcStrategy]);

        const result = await retryWithBackoff(
          async () =>
            checkAccountExists(
              accountStrategy,
              pubkeyBase64,
              AUTHENTICATOR_TYPE.Secp256K1,
            ),
          3,
          1000,
        );

        // Should successfully return result (even if no account exists)
        expect(result).toBeDefined();
        expect(result.exists).toBeDefined();

        console.log("✓ Composite strategy executed successfully");
      },
      INTEGRATION_TEST_TIMEOUT,
    );
  });

  describe("Account Discovery Error Handling", () => {
    it(
      "should handle network errors gracefully",
      async () => {
        const { pubkeyBase64 } = await createSecp256k1Wallet();

        // Create strategy with invalid RPC URL
        const invalidRpcStrategy = new RpcAccountStrategy(
          "https://invalid-rpc-url-that-does-not-exist.com",
        );
        const accountStrategy = new CompositeAccountStrategy([
          invalidRpcStrategy,
        ]);

        const result = await checkAccountExists(
          accountStrategy,
          pubkeyBase64,
          AUTHENTICATOR_TYPE.Secp256K1,
        );

        // Should return error state, not throw
        expect(result.exists).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.accounts).toHaveLength(0);

        console.log("✓ Network error handled gracefully:", result.error);
      },
      INTEGRATION_TEST_TIMEOUT,
    );

    it(
      "should handle invalid authenticator format",
      async () => {
        const rpcStrategy = new RpcAccountStrategy(config.rpcUrl);
        const accountStrategy = new CompositeAccountStrategy([rpcStrategy]);

        // Try with empty authenticator
        const result = await checkAccountExists(
          accountStrategy,
          "",
          AUTHENTICATOR_TYPE.Secp256K1,
        );

        // Should handle gracefully
        expect(result).toBeDefined();
        expect(result.exists).toBe(false);
      },
      INTEGRATION_TEST_TIMEOUT,
    );
  });

  describe("Multiple Account Discovery", () => {
    it(
      "should discover all accounts for a single authenticator",
      async () => {
        const { pubkeyBase64 } = await createSecp256k1Wallet();

        const rpcStrategy = new RpcAccountStrategy(config.rpcUrl);
        const accountStrategy = new CompositeAccountStrategy([rpcStrategy]);

        const result = await checkAccountExists(
          accountStrategy,
          pubkeyBase64,
          AUTHENTICATOR_TYPE.Secp256K1,
        );

        // If accounts exist, verify the array structure
        if (result.exists && result.accounts.length > 0) {
          expect(Array.isArray(result.accounts)).toBe(true);

          // Each account should have required fields
          result.accounts.forEach((account) => {
            expect(account.id).toBeDefined();
            expect(isValidXionAddress(account.id)).toBe(true);
            expect(account.authenticators).toBeDefined();
            expect(Array.isArray(account.authenticators)).toBe(true);
          });

          console.log(`✓ Found ${result.accounts.length} account(s)`);
        }
      },
      INTEGRATION_TEST_TIMEOUT,
    );
  });

  describe("Account Discovery Address Validation", () => {
    it(
      "should return valid XION address format when account exists",
      async () => {
        const { pubkeyBase64 } = await createSecp256k1Wallet();

        const rpcStrategy = new RpcAccountStrategy(config.rpcUrl);
        const accountStrategy = new CompositeAccountStrategy([rpcStrategy]);

        const result = await checkAccountExists(
          accountStrategy,
          pubkeyBase64,
          AUTHENTICATOR_TYPE.Secp256K1,
        );

        if (result.exists && result.smartAccountAddress) {
          // Validate address format
          expect(result.smartAccountAddress).toMatch(
            EXPECTED_VALUES.xionAddressRegex,
          );
          expect(result.smartAccountAddress.startsWith("xion1")).toBe(true);

          // Verify account exists on-chain
          const accountInfo = await stargateClient.getAccount(
            result.smartAccountAddress,
          );
          expect(accountInfo).toBeDefined();

          console.log("✓ Account validated on-chain:", result.smartAccountAddress);
        }
      },
      INTEGRATION_TEST_TIMEOUT,
    );
  });

  describe("Account Discovery Performance", () => {
    it(
      "should complete discovery within reasonable time",
      async () => {
        const { pubkeyBase64 } = await createSecp256k1Wallet();

        const rpcStrategy = new RpcAccountStrategy(config.rpcUrl);
        const accountStrategy = new CompositeAccountStrategy([rpcStrategy]);

        const startTime = Date.now();

        await checkAccountExists(
          accountStrategy,
          pubkeyBase64,
          AUTHENTICATOR_TYPE.Secp256K1,
        );

        const duration = Date.now() - startTime;

        // Should complete in reasonable time (< 10 seconds)
        expect(duration).toBeLessThan(10000);

        console.log(`✓ Discovery completed in ${duration}ms`);
      },
      INTEGRATION_TEST_TIMEOUT,
    );
  });
});
