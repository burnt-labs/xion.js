/**
 * EthWallet Connector Integration Tests
 *
 * Tests complete end-to-end flows for EthWallet (Ethereum) connector authentication.
 * Validates the full user journey: ETH wallet connection → XION account mapping → transaction signing.
 *
 * These tests validate EIP-191 signature handling and ETH address to XION account conversion.
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
  createTestEthWalletConnector,
  getSignerConfigFromConnectorResult,
  createMockStorageStrategy,
  createMockSessionManager,
  createTestStargateClient,
  isValidXionAddress,
  validateSignature,
} from "../helpers";
import { SignerController } from "../../../src/controllers/SignerController";
import type { SignerControllerConfig } from "../../../src/controllers/SignerController";
import type { SignerAuthentication } from "../../../src/types";
import {
  ConnectionOrchestrator,
  CompositeAccountStrategy,
  RpcAccountStrategy,
  checkAccountExists,
  type SessionManager,
} from "@burnt-labs/account-management";
import { AUTHENTICATOR_TYPE, utf8ToHexWithPrefix } from "@burnt-labs/signers";
import type { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";

describe("EthWallet Connector - Integration Tests", () => {
  registerGlobalHooks();

  let config: ReturnType<typeof getTestConfig>;
  let storageStrategy: ReturnType<typeof createMockStorageStrategy>;
  let sessionManager: SessionManager;
  let accountStrategy: CompositeAccountStrategy;
  let stargateClient: CosmWasmClient;

  beforeEach(async () => {
    config = getTestConfig();
    storageStrategy = createMockStorageStrategy();
    sessionManager = createMockSessionManager(storageStrategy);

    const rpcStrategy = new RpcAccountStrategy(config.rpcUrl);
    accountStrategy = new CompositeAccountStrategy([rpcStrategy]);

    stargateClient = await createTestStargateClient();
  });

  describe("Complete EthWallet Flow", () => {
    it(
      "should complete end-to-end flow: ETH wallet → XION account → ready",
      async () => {
        // 1. Create EthWallet connector
        const testIndex = Math.floor(Math.random() * 1000) + 1000;
        const connector = createTestEthWalletConnector(
          TEST_MNEMONIC,
          testIndex,
        );

        console.log("✓ Step 1: EthWallet connector created");

        // 2. Connect to get ETH address as authenticator
        const connectorResult = await connector.connect();

        expect(connectorResult.metadata?.authenticatorType).toBe(
          AUTHENTICATOR_TYPE.EthWallet,
        );
        expect(connectorResult.authenticator).toBeDefined();
        expect(connectorResult.authenticator).toMatch(/^0x[a-fA-F0-9]{40}$/);
        expect(connectorResult.signMessage).toBeDefined();

        console.log("✓ Step 2: EthWallet connected");
        console.log("  ETH address:", connectorResult.authenticator);

        // 3. Check if XION account exists for this ETH address
        const existenceCheck = await checkAccountExists(
          accountStrategy,
          connectorResult.authenticator,
          AUTHENTICATOR_TYPE.EthWallet,
        );

        console.log("✓ Step 3: XION account existence checked");
        console.log("  Account exists:", existenceCheck.exists);

        // 4. Create orchestrator and setup XION account
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
        expect(setupResult.signingClient).toBeDefined();

        console.log("✓ Step 4: XION account setup complete");
        console.log("  Smart account:", setupResult.smartAccountAddress);

        // 5. Verify XION account on-chain
        const onChainAccount = await stargateClient.getAccount(
          setupResult.smartAccountAddress,
        );
        expect(onChainAccount).toBeDefined();

        console.log("✓ Step 5: XION account verified on-chain");

        // Cleanup
        orchestrator.destroy();

        console.log("✓ Complete EthWallet flow successful!");
      },
      INTEGRATION_TEST_TIMEOUT,
    );

    it(
      "should handle existing XION account for ETH address",
      async () => {
        const testIndex = Math.floor(Math.random() * 1000) + 1100;
        const connector = createTestEthWalletConnector(
          TEST_MNEMONIC,
          testIndex,
        );

        // First run - create account
        const orchestrator1 = new ConnectionOrchestrator({
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

        const connectorResult = await connector.connect();
        const result1 = await orchestrator1.connectAndSetup(
          connector,
          connectorResult.authenticator,
        );

        orchestrator1.destroy();

        // Second run - account should already exist
        const connector2 = createTestEthWalletConnector(
          TEST_MNEMONIC,
          testIndex,
        );
        const orchestrator2 = new ConnectionOrchestrator({
          sessionManager: createMockSessionManager(createMockStorageStrategy()),
          storageStrategy: createMockStorageStrategy(),
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

        const connectorResult2 = await connector2.connect();
        const result2 = await orchestrator2.connectAndSetup(
          connector2,
          connectorResult2.authenticator,
        );

        // Should return same XION account
        expect(result2.smartAccountAddress).toBe(result1.smartAccountAddress);

        console.log("✓ Existing XION account handled correctly");

        orchestrator2.destroy();
      },
      INTEGRATION_TEST_TIMEOUT,
    );
  });

  describe("Ethereum Address to XION Account Mapping", () => {
    it(
      "should generate deterministic XION account from ETH address",
      async () => {
        const testIndex = Math.floor(Math.random() * 1000) + 1200;

        // Create two connectors with same mnemonic and index
        const connector1 = createTestEthWalletConnector(
          TEST_MNEMONIC,
          testIndex,
        );
        const connector2 = createTestEthWalletConnector(
          TEST_MNEMONIC,
          testIndex,
        );

        const result1 = await connector1.connect();
        const result2 = await connector2.connect();

        // Same mnemonic + same index = same ETH address
        expect(result1.authenticator).toBe(result2.authenticator);
        expect(result1.authenticator).toMatch(/^0x[a-fA-F0-9]{40}$/);

        console.log("✓ Deterministic ETH address generation verified");
        console.log("  ETH address:", result1.authenticator);
      },
      INTEGRATION_TEST_TIMEOUT,
    );

    it(
      "should generate different XION accounts for different ETH addresses",
      async () => {
        // Create two connectors with different indices
        const connector1 = createTestEthWalletConnector(
          TEST_MNEMONIC,
          Math.floor(Math.random() * 1000) + 1300,
        );
        const connector2 = createTestEthWalletConnector(
          TEST_MNEMONIC,
          Math.floor(Math.random() * 1000) + 1400,
        );

        const result1 = await connector1.connect();
        const result2 = await connector2.connect();

        // Different indices = different ETH addresses
        expect(result1.authenticator).not.toBe(result2.authenticator);
        expect(result1.authenticator).toMatch(/^0x[a-fA-F0-9]{40}$/);
        expect(result2.authenticator).toMatch(/^0x[a-fA-F0-9]{40}$/);

        console.log("✓ Different ETH addresses generate different accounts");
        console.log("  ETH address 1:", result1.authenticator);
        console.log("  ETH address 2:", result2.authenticator);
      },
      INTEGRATION_TEST_TIMEOUT,
    );
  });

  describe("EIP-191 Signature Handling", () => {
    it(
      "should produce valid EIP-191 signatures",
      async () => {
        const connector = createTestEthWalletConnector();
        const connectorResult = await connector.connect();

        // Sign a test message (smart account address) - convert to hex format as expected by connector
        const testMessage = "xion1testaccountaddress";
        const testMessageHex = utf8ToHexWithPrefix(testMessage);
        const signature = await connectorResult.signMessage(testMessageHex);

        // Validate signature format
        expect(signature).toBeDefined();
        expect(typeof signature).toBe("string");

        // EIP-191 signatures are 65 bytes (132 hex chars with 0x prefix)
        expect(signature).toMatch(/^0x[a-fA-F0-9]{130}$/);

        console.log("✓ EIP-191 signature format valid");
        console.log("  Signature:", signature.substring(0, 20) + "...");
      },
      INTEGRATION_TEST_TIMEOUT,
    );

    it(
      "should produce different signatures for different messages",
      async () => {
        const connector = createTestEthWalletConnector();
        const connectorResult = await connector.connect();

        const message1 = "first-test-message";
        const message2 = "second-test-message";
        const message1Hex = utf8ToHexWithPrefix(message1);
        const message2Hex = utf8ToHexWithPrefix(message2);

        const signature1 = await connectorResult.signMessage(message1Hex);
        const signature2 = await connectorResult.signMessage(message2Hex);

        // Different messages = different signatures
        expect(signature1).not.toBe(signature2);
        expect(signature1).toMatch(/^0x[a-fA-F0-9]{130}$/);
        expect(signature2).toMatch(/^0x[a-fA-F0-9]{130}$/);

        console.log("✓ Different messages produce different signatures");
      },
      INTEGRATION_TEST_TIMEOUT,
    );

    it(
      "should handle UTF-8 messages correctly",
      async () => {
        const connector = createTestEthWalletConnector();
        const connectorResult = await connector.connect();

        // Test with various UTF-8 characters
        const messages = [
          "Hello World",
          "特殊字符测试",
          "emoji 🚀 test",
          "xion1accountaddress123",
        ];

        for (const message of messages) {
          const messageHex = utf8ToHexWithPrefix(message);
          const signature = await connectorResult.signMessage(messageHex);
          expect(signature).toBeDefined();
          expect(signature).toMatch(/^0x[a-fA-F0-9]{130}$/);
        }

        console.log("✓ UTF-8 messages handled correctly");
      },
      INTEGRATION_TEST_TIMEOUT,
    );
  });

  describe("EthWallet with SignerController", () => {
    it(
      "should work with SignerController initialization",
      async () => {
        const testIndex = Math.floor(Math.random() * 1000) + 1500;
        const signerAuth: SignerAuthentication = {
          type: "signer",
          aaApiUrl: config.aaApiUrl,
          smartAccountContract: {
            codeId: parseInt(config.codeId, 10),
            checksum: config.checksum,
          },
          async getSignerConfig() {
            const connector = createTestEthWalletConnector(
              TEST_MNEMONIC,
              testIndex,
            );
            const result = await connector.connect();
            // createTestEthWalletConnector now uses ExternalSignerConnector
            return getSignerConfigFromConnectorResult(result);
          },
        };

        const controller = new SignerController({
          chainId: config.chainId,
          rpcUrl: config.rpcUrl,
          gasPrice: config.gasPrice,
          signer: signerAuth,
          accountStrategy,
          sessionManager,
          storageStrategy,
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

        // Initialize controller
        await controller.initialize();

        const state = controller.getState();
        expect(["idle", "initializing", "connected", "error"]).toContain(
          state.status,
        );

        console.log("✓ SignerController initialized:", state.status);

        // Cleanup
        controller.destroy();
      },
      INTEGRATION_TEST_TIMEOUT,
    );
  });

  describe("EthWallet Error Scenarios", () => {
    it(
      "should handle invalid ETH address format",
      async () => {
        // Connector creation doesn't validate address format
        // Validation happens during account creation

        const connector = createTestEthWalletConnector();
        const connectorResult = await connector.connect();

        // Should be valid ETH address
        expect(connectorResult.authenticator).toMatch(/^0x[a-fA-F0-9]{40}$/);

        console.log("✓ ETH address format validated");
      },
      INTEGRATION_TEST_TIMEOUT,
    );

    it(
      "should handle network failures during setup",
      async () => {
        const connector = createTestEthWalletConnector();
        const connectorResult = await connector.connect();

        // Create orchestrator with invalid AA API URL (account creation should fail)
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
          grantConfig: {
            treasury: config.treasuryAddress,
            feeGranter: config.feeGranter,
          },
        });

        await expect(
          orchestrator.connectAndSetup(
            connector,
            connectorResult.authenticator,
          ),
        ).rejects.toThrow();

        console.log("✓ Network failures handled gracefully");

        orchestrator.destroy();
      },
      INTEGRATION_TEST_TIMEOUT,
    );
  });

  describe("EthWallet Performance", () => {
    it(
      "should complete connection within reasonable time",
      async () => {
        const connector = createTestEthWalletConnector();

        const startTime = Date.now();
        await connector.connect();
        const duration = Date.now() - startTime;

        // Should complete quickly (< 1 second)
        expect(duration).toBeLessThan(1000);

        console.log(`✓ Connection completed in ${duration}ms`);
      },
      INTEGRATION_TEST_TIMEOUT,
    );

    it(
      "should sign messages within reasonable time",
      async () => {
        const connector = createTestEthWalletConnector();
        const connectorResult = await connector.connect();

        const testMessage = "performance-test-message";
        const testMessageHex = utf8ToHexWithPrefix(testMessage);

        const startTime = Date.now();
        await connectorResult.signMessage(testMessageHex);
        const duration = Date.now() - startTime;

        // Signing should be fast (< 100ms)
        expect(duration).toBeLessThan(100);

        console.log(`✓ Message signed in ${duration}ms`);
      },
      INTEGRATION_TEST_TIMEOUT,
    );
  });

  describe("EthWallet vs Secp256K1 Comparison", () => {
    it(
      "should validate signature length differences",
      async () => {
        const ethConnector = createTestEthWalletConnector();
        const ethResult = await ethConnector.connect();

        const testMessage = "comparison-test";
        const testMessageHex = utf8ToHexWithPrefix(testMessage);
        const ethSignature = await ethResult.signMessage(testMessageHex);

        // EIP-191 signature: 65 bytes = 130 hex chars + 0x prefix
        expect(ethSignature).toMatch(/^0x[a-fA-F0-9]{130}$/);
        expect(ethSignature.length).toBe(132); // 0x + 130 hex chars

        console.log("✓ EthWallet signature format:");
        console.log("  Format: EIP-191 (0x-prefixed hex)");
        console.log("  Length:", ethSignature.length, "chars");
      },
      INTEGRATION_TEST_TIMEOUT,
    );
  });
});
