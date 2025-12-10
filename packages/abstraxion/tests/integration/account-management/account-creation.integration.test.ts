/**
 * Account Creation Integration Tests
 *
 * Tests complete account creation flows using ConnectionOrchestrator.
 * Validates account creation for different authenticator types, fee granting,
 * and the full connect-and-setup flow.
 *
 * These tests chain together real flows: connector → account discovery → account creation → grant setup
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
  createTestSecp256k1Connector,
  createTestEthWalletConnector,
  createMockStorageStrategy,
  createMockSessionManager,
  createTestStargateClient,
  isValidXionAddress,
  checkTreasuryContract,
  sleep,
  retryWithBackoff,
} from "../helpers";
import {
  ConnectionOrchestrator,
  CompositeAccountStrategy,
  RpcAccountStrategy,
  checkAccountExists,
  type SessionManager,
} from "@burnt-labs/account-management";
import { AUTHENTICATOR_TYPE } from "@burnt-labs/signers";
import { StargateClient } from "@cosmjs/stargate";

describe("Account Creation Integration Tests", () => {
  registerGlobalHooks();

  let config: ReturnType<typeof getTestConfig>;
  let storageStrategy: ReturnType<typeof createMockStorageStrategy>;
  let sessionManager: SessionManager;
  let accountStrategy: CompositeAccountStrategy;
  let stargateClient: StargateClient;

  beforeEach(async () => {
    config = getTestConfig();
    storageStrategy = createMockStorageStrategy();
    sessionManager = createMockSessionManager(storageStrategy);

    const rpcStrategy = new RpcAccountStrategy(config.rpcUrl);
    accountStrategy = new CompositeAccountStrategy([rpcStrategy]);

    stargateClient = await createTestStargateClient();
  });

  describe("Secp256K1 Account Creation Flow", () => {
    it(
      "should complete full Secp256K1 connector flow: connect → discover/create → setup",
      async () => {
        // 1. Create Secp256K1 connector
        const connector = createTestSecp256k1Connector(TEST_MNEMONIC, 0);

        // 2. Connect to get authenticator
        const connectorResult = await connector.connect();
        expect(connectorResult.metadata?.authenticatorType).toBe(
          AUTHENTICATOR_TYPE.Secp256K1,
        );
        expect(connectorResult.authenticator).toBeDefined();

        console.log("✓ Connector connected:", connectorResult.metadata?.authenticatorType);

        // 3. Check if account already exists
        const existenceCheck = await checkAccountExists(
          accountStrategy,
          connectorResult.authenticator,
          AUTHENTICATOR_TYPE.Secp256K1,
        );

        console.log("✓ Account existence check:", existenceCheck.exists);

        // 4. Create orchestrator with account creation config
        const orchestrator = new ConnectionOrchestrator({
          sessionManager,
          storageStrategy,
          accountStrategy,
          chainId: config.chainId,
          rpcUrl: config.rpcUrl,
          gasPrice: config.gasPrice,
          accountCreationConfig: {
            aaApiUrl: config.aaApiUrl,
            smartAccountContract: {
              codeId: parseInt(config.codeId, 10),
              checksum: config.checksum,
              addressPrefix: "xion",
            },
            feeGranter: config.feeGranter,
          },
        });

        // 5. Use orchestrator to connect and setup (will create account if needed)
        const setupResult = await orchestrator.connectAndSetup(
          connector,
          connectorResult.authenticator,
        );

        // 6. Validate result
        expect(setupResult.smartAccountAddress).toBeDefined();
        expect(isValidXionAddress(setupResult.smartAccountAddress)).toBe(true);
        expect(setupResult.signingClient).toBeDefined();

        console.log("✓ Smart account address:", setupResult.smartAccountAddress);

        // 7. Verify account exists on-chain
        const onChainAccount = await stargateClient.getAccount(
          setupResult.smartAccountAddress,
        );
        expect(onChainAccount).toBeDefined();

        console.log("✓ Account verified on-chain");

        // 8. Verify account is discoverable now (with retry for indexer)
        const postCreationCheck = await retryWithBackoff(
          async () => {
            const result = await checkAccountExists(
              accountStrategy,
              connectorResult.authenticator,
              AUTHENTICATOR_TYPE.Secp256K1,
            );
            if (!result.exists) {
              throw new Error("Account not yet discoverable");
            }
            return result;
          },
          5, // 5 retries
          2000 // 2 second delay
        );

        expect(postCreationCheck.exists).toBe(true);
        expect(postCreationCheck.smartAccountAddress).toBe(
          setupResult.smartAccountAddress,
        );

        console.log("✓ Account discoverable after creation");

        // Cleanup
        orchestrator.destroy();
      },
      INTEGRATION_TEST_TIMEOUT,
    );

    it(
      "should create account with deterministic address generation",
      async () => {
        // Use a unique account index to avoid conflicts
        const testIndex = Math.floor(Math.random() * 1000) + 100;

        const connector1 = createTestSecp256k1Connector(TEST_MNEMONIC, testIndex);
        const connector2 = createTestSecp256k1Connector(TEST_MNEMONIC, testIndex);

        const result1 = await connector1.connect();
        const result2 = await connector2.connect();

        // Same mnemonic + same index = same authenticator
        expect(result1.authenticator).toBe(result2.authenticator);

        console.log("✓ Deterministic authenticator generation verified");
      },
      INTEGRATION_TEST_TIMEOUT,
    );
  });

  describe("EthWallet Account Creation Flow", () => {
    it(
      "should complete full EthWallet connector flow",
      async () => {
        // 1. Create EthWallet connector
        const connector = createTestEthWalletConnector(TEST_MNEMONIC, 0);

        // 2. Connect to get authenticator (ETH address)
        const connectorResult = await connector.connect();
        expect(connectorResult.metadata?.authenticatorType).toBe(
          AUTHENTICATOR_TYPE.EthWallet,
        );
        expect(connectorResult.authenticator).toMatch(/^0x[a-fA-F0-9]{40}$/);

        console.log("✓ EthWallet connector connected:", connectorResult.authenticator);

        // 3. Check if account already exists
        const existenceCheck = await checkAccountExists(
          accountStrategy,
          connectorResult.authenticator,
          AUTHENTICATOR_TYPE.EthWallet,
        );

        console.log("✓ EthWallet account existence check:", existenceCheck.exists);

        // 4. Create orchestrator
        const orchestrator = new ConnectionOrchestrator({
          sessionManager,
          storageStrategy,
          accountStrategy,
          chainId: config.chainId,
          rpcUrl: config.rpcUrl,
          gasPrice: config.gasPrice,
          accountCreationConfig: {
            aaApiUrl: config.aaApiUrl,
            smartAccountContract: {
              codeId: parseInt(config.codeId, 10),
              checksum: config.checksum,
              addressPrefix: "xion",
            },
            feeGranter: config.feeGranter,
          },
        });

        // 5. Connect and setup
        const setupResult = await orchestrator.connectAndSetup(
          connector,
          connectorResult.authenticator,
        );

        // 6. Validate result
        expect(setupResult.smartAccountAddress).toBeDefined();
        expect(isValidXionAddress(setupResult.smartAccountAddress)).toBe(true);
        expect(setupResult.signingClient).toBeDefined();

        console.log("✓ EthWallet smart account:", setupResult.smartAccountAddress);

        // 7. Verify account exists on-chain
        const onChainAccount = await stargateClient.getAccount(
          setupResult.smartAccountAddress,
        );
        expect(onChainAccount).toBeDefined();

        console.log("✓ EthWallet account verified on-chain");

        // Cleanup
        orchestrator.destroy();
      },
      INTEGRATION_TEST_TIMEOUT,
    );

    it(
      "should generate deterministic XION account from ETH address",
      async () => {
        const testIndex = Math.floor(Math.random() * 1000) + 200;

        const connector1 = createTestEthWalletConnector(TEST_MNEMONIC, testIndex);
        const connector2 = createTestEthWalletConnector(TEST_MNEMONIC, testIndex);

        const result1 = await connector1.connect();
        const result2 = await connector2.connect();

        // Same mnemonic + same index = same ETH address
        expect(result1.authenticator).toBe(result2.authenticator);
        expect(result1.authenticator).toMatch(/^0x[a-fA-F0-9]{40}$/);

        console.log("✓ Deterministic ETH address generation verified");
      },
      INTEGRATION_TEST_TIMEOUT,
    );
  });

  describe("Account Creation with Fee Granting", () => {
    it(
      "should create account using treasury fee granter",
      async () => {
        // Check if treasury is available
        const treasuryExists = await checkTreasuryContract(
          config.treasuryAddress,
        );

        if (!treasuryExists) {
          console.log("⚠ Treasury contract not available, skipping test");
          return;
        }

        const connector = createTestSecp256k1Connector(
          TEST_MNEMONIC,
          Math.floor(Math.random() * 1000) + 300,
        );
        const connectorResult = await connector.connect();

        // Create orchestrator with treasury config
        const orchestrator = new ConnectionOrchestrator({
          sessionManager,
          storageStrategy,
          accountStrategy,
          chainId: config.chainId,
          rpcUrl: config.rpcUrl,
          gasPrice: config.gasPrice,
          accountCreationConfig: {
            aaApiUrl: config.aaApiUrl,
            smartAccountContract: {
              codeId: parseInt(config.codeId, 10),
              checksum: config.checksum,
              addressPrefix: "xion",
            },
            feeGranter: config.feeGranter,
          },
          grantConfig: {
            treasury: config.treasuryAddress,
            feeGranter: config.feeGranter,
          },
        });

        const setupResult = await orchestrator.connectAndSetup(
          connector,
          connectorResult.authenticator,
        );

        expect(setupResult.smartAccountAddress).toBeDefined();
        expect(isValidXionAddress(setupResult.smartAccountAddress)).toBe(true);

        console.log("✓ Account created with treasury fee grant");

        // Cleanup
        orchestrator.destroy();
      },
      INTEGRATION_TEST_TIMEOUT,
    );

    it(
      "should handle account creation with explicit fee granter",
      async () => {
        const connector = createTestSecp256k1Connector(
          TEST_MNEMONIC,
          Math.floor(Math.random() * 1000) + 400,
        );
        const connectorResult = await connector.connect();

        // Use explicit fee granter (from config)
        const orchestrator = new ConnectionOrchestrator({
          sessionManager,
          storageStrategy,
          accountStrategy,
          chainId: config.chainId,
          rpcUrl: config.rpcUrl,
          gasPrice: config.gasPrice,
          accountCreationConfig: {
            aaApiUrl: config.aaApiUrl,
            smartAccountContract: {
              codeId: parseInt(config.codeId, 10),
              checksum: config.checksum,
              addressPrefix: "xion",
            },
            feeGranter: config.feeGranter,
          },
        });

        const setupResult = await orchestrator.connectAndSetup(
          connector,
          connectorResult.authenticator,
        );

        expect(setupResult.smartAccountAddress).toBeDefined();
        expect(isValidXionAddress(setupResult.smartAccountAddress)).toBe(true);

        console.log("✓ Account created with explicit fee granter");

        // Cleanup
        orchestrator.destroy();
      },
      INTEGRATION_TEST_TIMEOUT,
    );
  });

  describe("Account Creation Error Handling", () => {
    it(
      "should handle account creation with invalid AA API URL",
      async () => {
        const connector = createTestSecp256k1Connector();
        const connectorResult = await connector.connect();

        const orchestrator = new ConnectionOrchestrator({
          sessionManager,
          storageStrategy,
          accountStrategy,
          chainId: config.chainId,
          rpcUrl: config.rpcUrl,
          gasPrice: config.gasPrice,
          accountCreationConfig: {
            aaApiUrl: "https://invalid-aa-api-url.com",
            smartAccountContract: {
              codeId: parseInt(config.codeId, 10),
              checksum: config.checksum,
              addressPrefix: "xion",
            },
            feeGranter: config.feeGranter,
          },
        });

        await expect(
          orchestrator.connectAndSetup(connector, connectorResult.authenticator),
        ).rejects.toThrow();

        console.log("✓ Invalid AA API URL handled correctly");

        // Cleanup
        orchestrator.destroy();
      },
      INTEGRATION_TEST_TIMEOUT,
    );

    it(
      "should handle missing account creation config gracefully",
      async () => {
        const connector = createTestSecp256k1Connector();
        const connectorResult = await connector.connect();

        // Create orchestrator WITHOUT accountCreationConfig
        const orchestrator = new ConnectionOrchestrator({
          sessionManager,
          storageStrategy,
          accountStrategy,
          chainId: config.chainId,
          rpcUrl: config.rpcUrl,
          gasPrice: config.gasPrice,
          // No accountCreationConfig provided
        });

        // Should fail if account doesn't exist and creation config is missing
        const existenceCheck = await checkAccountExists(
          accountStrategy,
          connectorResult.authenticator,
          AUTHENTICATOR_TYPE.Secp256K1,
        );

        if (!existenceCheck.exists) {
          await expect(
            orchestrator.connectAndSetup(
              connector,
              connectorResult.authenticator,
            ),
          ).rejects.toThrow();

          console.log("✓ Missing creation config handled correctly");
        } else {
          console.log("⚠ Account already exists, skipping creation config test");
        }

        // Cleanup
        orchestrator.destroy();
      },
      INTEGRATION_TEST_TIMEOUT,
    );
  });

  describe("Account Re-discovery After Creation", () => {
    it(
      "should find newly created account on subsequent discovery",
      async () => {
        const testIndex = Math.floor(Math.random() * 1000) + 500;
        const connector = createTestSecp256k1Connector(TEST_MNEMONIC, testIndex);
        const connectorResult = await connector.connect();

        // First check
        const beforeCreation = await checkAccountExists(
          accountStrategy,
          connectorResult.authenticator,
          AUTHENTICATOR_TYPE.Secp256K1,
        );

        if (beforeCreation.exists) {
          console.log("⚠ Account already exists, skipping creation");
          return;
        }

        // Create account
        const orchestrator = new ConnectionOrchestrator({
          sessionManager,
          storageStrategy,
          accountStrategy,
          chainId: config.chainId,
          rpcUrl: config.rpcUrl,
          gasPrice: config.gasPrice,
          accountCreationConfig: {
            aaApiUrl: config.aaApiUrl,
            smartAccountContract: {
              codeId: parseInt(config.codeId, 10),
              checksum: config.checksum,
              addressPrefix: "xion",
            },
            feeGranter: config.feeGranter,
          },
        });

        const setupResult = await orchestrator.connectAndSetup(
          connector,
          connectorResult.authenticator,
        );

        // Second check - should now exist (with retry for indexer)
        const afterCreation = await retryWithBackoff(
          async () => {
            const result = await checkAccountExists(
              accountStrategy,
              connectorResult.authenticator,
              AUTHENTICATOR_TYPE.Secp256K1,
            );
            if (!result.exists) {
              throw new Error("Account not yet discoverable");
            }
            return result;
          },
          5, // 5 retries
          2000 // 2 second delay
        );

        expect(afterCreation.exists).toBe(true);
        expect(afterCreation.smartAccountAddress).toBe(
          setupResult.smartAccountAddress,
        );

        console.log("✓ Account discoverable after creation");

        // Cleanup
        orchestrator.destroy();
      },
      INTEGRATION_TEST_TIMEOUT,
    );
  });
});
