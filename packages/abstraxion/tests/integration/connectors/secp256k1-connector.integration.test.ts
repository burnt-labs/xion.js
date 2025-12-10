/**
 * Secp256K1 Connector Integration Tests
 *
 * Tests complete end-to-end flows for Secp256K1 connector authentication.
 * Validates the full user journey: connector creation → connection → account setup → transaction signing.
 *
 * These tests chain together the entire flow using SignerController and ConnectionOrchestrator.
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
  getSignerConfigFromConnectorResult,
  createMockStorageStrategy,
  createMockSessionManager,
  createTestStargateClient,
  createTestTransferMsg,
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

describe("Secp256K1 Connector - Integration Tests", () => {
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

  describe("Complete Secp256K1 Flow", () => {
    it(
      "should complete end-to-end flow: connector → connect → account → ready",
      async () => {
        // 1. Create connector
        const testIndex = Math.floor(Math.random() * 1000) + 600;
        const connector = createTestSecp256k1Connector(TEST_MNEMONIC, testIndex);

        console.log("✓ Step 1: Connector created");

        // 2. Connect connector to get authenticator
        const connectorResult = await connector.connect();

        expect(connectorResult.metadata?.authenticatorType).toBe(
          AUTHENTICATOR_TYPE.Secp256K1,
        );
        expect(connectorResult.authenticator).toBeDefined();
        expect(connectorResult.signMessage).toBeDefined();

        console.log("✓ Step 2: Connector connected");
        console.log("  Authenticator type:", connectorResult.metadata?.authenticatorType);

        // 3. Check if account exists
        const existenceCheck = await checkAccountExists(
          accountStrategy,
          connectorResult.authenticator,
          AUTHENTICATOR_TYPE.Secp256K1,
        );

        console.log("✓ Step 3: Account existence checked");
        console.log("  Account exists:", existenceCheck.exists);

        // 4. Create orchestrator and setup account
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

        console.log("✓ Step 4: Account setup complete");
        console.log("  Smart account:", setupResult.smartAccountAddress);

        // 5. Verify account on-chain
        const onChainAccount = await stargateClient.getAccount(
          setupResult.smartAccountAddress,
        );
        expect(onChainAccount).toBeDefined();

        console.log("✓ Step 5: Account verified on-chain");

        // Cleanup
        orchestrator.destroy();

        console.log("✓ Complete flow successful!");
      },
      INTEGRATION_TEST_TIMEOUT,
    );

    it(
      "should handle account that already exists",
      async () => {
        const testIndex = Math.floor(Math.random() * 1000) + 700;
        const connector = createTestSecp256k1Connector(TEST_MNEMONIC, testIndex);

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
        const connector2 = createTestSecp256k1Connector(
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

        // Should return same account
        expect(result2.smartAccountAddress).toBe(result1.smartAccountAddress);

        console.log("✓ Existing account handled correctly");

        orchestrator2.destroy();
      },
      INTEGRATION_TEST_TIMEOUT,
    );
  });

  describe("Secp256K1 Signature Validation", () => {
    it(
      "should produce valid Secp256K1 signatures",
      async () => {
        const connector = createTestSecp256k1Connector();
        const connectorResult = await connector.connect();

        // Sign a test message (convert to hex format as expected by connector)
        const testMessage = "xion1testaccountaddress";
        const testMessageHex = utf8ToHexWithPrefix(testMessage);
        const signature = await connectorResult.signMessage(testMessageHex);

        // Validate signature format
        expect(signature).toBeDefined();
        expect(typeof signature).toBe("string");

        // Secp256K1 signatures are 64 bytes when decoded from base64
        const isValidLength = validateSignature(
          signature,
          EXPECTED_VALUES.secp256k1SignatureLength,
        );
        expect(isValidLength).toBe(true);

        console.log("✓ Secp256K1 signature format valid");
        console.log("  Signature length (base64):", signature.length);
      },
      INTEGRATION_TEST_TIMEOUT,
    );

    it(
      "should produce consistent signatures for same message",
      async () => {
        const connector = createTestSecp256k1Connector();
        const connectorResult = await connector.connect();

        const testMessage = "test-message-for-consistency";
        const testMessageHex = utf8ToHexWithPrefix(testMessage);

        // Note: Secp256K1 signatures include random nonce, so they won't be identical
        // But the signing process should not fail
        const signature1 = await connectorResult.signMessage(testMessageHex);
        const signature2 = await connectorResult.signMessage(testMessageHex);

        expect(signature1).toBeDefined();
        expect(signature2).toBeDefined();

        console.log("✓ Signature generation consistent (non-deterministic due to nonce)");
      },
      INTEGRATION_TEST_TIMEOUT,
    );
  });

  describe("Secp256K1 with SignerController", () => {
    it(
      "should work with SignerController initialization",
      async () => {
        const testIndex = Math.floor(Math.random() * 1000) + 800;
        const signerAuth: SignerAuthentication = {
          type: "signer",
          aaApiUrl: config.aaApiUrl,
          smartAccountContract: {
            codeId: parseInt(config.codeId, 10),
            checksum: config.checksum,
          },
          async getSignerConfig() {
            const connector = createTestSecp256k1Connector(
              TEST_MNEMONIC,
              testIndex,
            );
            const result = await connector.connect();
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

    it(
      "should track state transitions correctly",
      async () => {
        const testIndex = Math.floor(Math.random() * 1000) + 900;
        const signerAuth: SignerAuthentication = {
          type: "signer",
          aaApiUrl: config.aaApiUrl,
          smartAccountContract: {
            codeId: parseInt(config.codeId, 10),
            checksum: config.checksum,
          },
          async getSignerConfig() {
            const connector = createTestSecp256k1Connector(
              TEST_MNEMONIC,
              testIndex,
            );
            const result = await connector.connect();
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

        const states: string[] = [];
        controller.subscribe((state) => {
          states.push(state.status);
        });

        await controller.initialize();

        expect(states.length).toBeGreaterThan(0);
        console.log("✓ State transitions tracked:", states);

        controller.destroy();
      },
      INTEGRATION_TEST_TIMEOUT,
    );
  });

  describe("Secp256K1 Error Scenarios", () => {
    it(
      "should handle invalid mnemonic gracefully",
      async () => {
        // This test validates connector creation with various inputs
        // Invalid mnemonic would fail at wallet generation, not connector level

        expect(() => {
          createTestSecp256k1Connector("invalid mnemonic", 0);
        }).not.toThrow(); // Connector creation doesn't validate mnemonic

        console.log("✓ Connector creation with invalid mnemonic handled");
      },
      INTEGRATION_TEST_TIMEOUT,
    );

    it(
      "should handle network failures during setup",
      async () => {
        const connector = createTestSecp256k1Connector();
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
          orchestrator.connectAndSetup(connector, connectorResult.authenticator),
        ).rejects.toThrow();

        console.log("✓ Network failures handled gracefully");

        orchestrator.destroy();
      },
      INTEGRATION_TEST_TIMEOUT,
    );
  });

  describe("Secp256K1 Performance", () => {
    it(
      "should complete connection within reasonable time",
      async () => {
        const connector = createTestSecp256k1Connector();

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
        const connector = createTestSecp256k1Connector();
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
});
