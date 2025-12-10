/**
 * Transaction Signing Integration Tests
 *
 * Tests the complete transaction signing flow using real smart accounts on testnet.
 * These tests validate transaction building, gas estimation, signing, and broadcasting.
 *
 * IMPORTANT: These tests use REAL package functions from src/
 * They do NOT re-implement any business logic
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerGlobalHooks } from "../setup";
import {
  getTestConfig,
  INTEGRATION_TEST_TIMEOUT,
  TEST_SEND_AMOUNT,
} from "../fixtures";
import { SignerController } from "../../../src/controllers/SignerController";
import type { SignerControllerConfig } from "../../../src/controllers/SignerController";
import type { SignerAuthentication } from "../../../src/types";
import {
  createTestSignerController,
  createMockStorageStrategy,
  createMockSessionManager,
  createTestStargateClient,
  createUserMapUpdateMsg,
  waitForTxConfirmation,
  isValidXionAddress,
  createTestTransferMsg,
} from "../helpers";
import {
  CompositeAccountStrategy,
  RpcAccountStrategy,
  type SessionManager,
} from "@burnt-labs/account-management";
import { StargateClient } from "@cosmjs/stargate";
import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { GranteeSignerClient } from "@burnt-labs/abstraxion-core";

describe("Transaction Signing Integration Tests", () => {
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

  /**
   * Helper to create SignerController with proper configuration
   */
  function createSignerController(treasuryAddress?: string): SignerController {
    return createTestSignerController({
      config,
      accountStrategy,
      sessionManager,
      storageStrategy,
      treasuryAddress,
      grantConfig: {
        treasury: treasuryAddress || config.treasuryAddress,
      },
    });
  }

  describe("Full Transaction Flow", () => {
    it(
      "should complete transaction: build → simulate → sign → broadcast",
      async () => {
        const controller = createSignerController();

        await controller.initialize();
        await controller.connect();

        const state = controller.getState();
        expect(state.status).toBe("connected");
        if (state.status !== "connected") throw new Error("Not connected");
        expect(state.account).toBeDefined();

        const smartAccountAddress = state.account.granterAddress;
        expect(isValidXionAddress(smartAccountAddress)).toBe(true);

        const signingClient = state.signingClient;
        expect(signingClient).toBeInstanceOf(GranteeSignerClient);

        // Build user-map contract update message (requires no token balance!)
        const contractMsg = createUserMapUpdateMsg(
          smartAccountAddress,
          config.userMapContract,
          `transaction-signing-test-${Date.now()}`,
        );

        // Simulate (gas estimation)
        const gasEstimation = await signingClient!.simulate(
          smartAccountAddress,
          [contractMsg],
          "Full flow test",
        );

        expect(gasEstimation).toBeGreaterThan(0);
        expect(gasEstimation).toBeLessThan(500000);

        // Sign and broadcast
        const result = await signingClient!.signAndBroadcast(
          smartAccountAddress,
          [contractMsg],
          "auto",
          "Full flow test",
        );

        expect(result.code).toBe(0);
        expect(result.transactionHash).toBeDefined();
        expect(result.transactionHash.length).toBe(64);

        // Verify on-chain
        const txConfirmation = await waitForTxConfirmation(
          stargateClient,
          result.transactionHash,
        );
        expect(txConfirmation).toBeDefined();
        expect(txConfirmation.code).toBe(0);

        await controller.disconnect();
      },
      INTEGRATION_TEST_TIMEOUT,
    );
  });

  describe("Gas Estimation", () => {
    it(
      "should provide consistent gas estimation for same transaction",
      async () => {
        const controller = createSignerController();

        await controller.initialize();
        await controller.connect();

        const state = controller.getState();
        expect(state.status).toBe("connected");
        if (state.status !== "connected") throw new Error("Not connected");
        const smartAccountAddress = state.account.granterAddress;
        const signingClient = state.signingClient;

        const contractMsg = createUserMapUpdateMsg(
          smartAccountAddress,
          config.userMapContract,
          `test-${Date.now()}`,
        );

        // Simulate twice - should return consistent results
        const estimation1 = await signingClient!.simulate(
          smartAccountAddress,
          [contractMsg],
          "Gas estimation test",
        );

        const estimation2 = await signingClient!.simulate(
          smartAccountAddress,
          [contractMsg],
          "Gas estimation test",
        );

        expect(estimation1).toBe(estimation2);
        expect(estimation1).toBeGreaterThan(50000);

        await controller.disconnect();
      },
      INTEGRATION_TEST_TIMEOUT,
    );

    it(
      "should scale gas estimation with message count",
      async () => {
        const controller = createSignerController();

        await controller.initialize();
        await controller.connect();

        const state = controller.getState();
        expect(state.status).toBe("connected");
        if (state.status !== "connected") throw new Error("Not connected");
        const smartAccountAddress = state.account.granterAddress;
        const signingClient = state.signingClient;

        const singleMsgGas = await signingClient!.simulate(
          smartAccountAddress,
          [
            createUserMapUpdateMsg(
              smartAccountAddress,
              config.userMapContract,
              `test-1-${Date.now()}`,
            ),
          ],
          "",
        );

        const tripleMsgGas = await signingClient!.simulate(
          smartAccountAddress,
          [
            createUserMapUpdateMsg(
              smartAccountAddress,
              config.userMapContract,
              `test-2-${Date.now()}`,
            ),
            createUserMapUpdateMsg(
              smartAccountAddress,
              config.userMapContract,
              `test-3-${Date.now()}`,
            ),
            createUserMapUpdateMsg(
              smartAccountAddress,
              config.userMapContract,
              `test-4-${Date.now()}`,
            ),
          ],
          "",
        );

        // More messages should require more gas
        expect(tripleMsgGas).toBeGreaterThan(singleMsgGas);
        // But should scale reasonably (not exponentially)
        expect(tripleMsgGas).toBeLessThan(singleMsgGas * 4);

        await controller.disconnect();
      },
      INTEGRATION_TEST_TIMEOUT,
    );
  });

  describe("Transaction Verification", () => {
    it(
      "should confirm transaction and verify contract state change",
      async () => {
        const controller = createSignerController();

        await controller.initialize();
        await controller.connect();

        const state = controller.getState();
        expect(state.status).toBe("connected");
        if (state.status !== "connected") throw new Error("Not connected");
        const smartAccountAddress = state.account.granterAddress;
        const signingClient = state.signingClient;

        // Create unique test identifier
        const testId = `verification-test-${Date.now()}`;

        // Execute contract update
        const contractMsg = createUserMapUpdateMsg(
          smartAccountAddress,
          config.userMapContract,
          testId,
        );

        const result = await signingClient!.signAndBroadcast(
          smartAccountAddress,
          [contractMsg],
          "auto",
          "Contract verification test",
        );

        expect(result.code).toBe(0);

        // Wait for confirmation
        await waitForTxConfirmation(stargateClient, result.transactionHash);

        // Verify contract state was updated by querying it
        const cosmwasmClient = await CosmWasmClient.connect(config.rpcUrl);
        const queryResult = await cosmwasmClient.queryContractSmart(
          config.userMapContract,
          { get_value_by_user: { address: smartAccountAddress } },
        );

        // Parse the stored JSON
        const storedData = JSON.parse(queryResult);
        expect(storedData.main).toBe("integration test");
        expect(storedData.completed).toContain(testId);

        await controller.disconnect();
      },
      INTEGRATION_TEST_TIMEOUT,
    );
  });

  describe("Error Handling", () => {
    it(
      "should handle simulation failures gracefully",
      async () => {
        const controller = createSignerController();

        await controller.initialize();
        await controller.connect();

        const state = controller.getState();
        expect(state.status).toBe("connected");
        if (state.status !== "connected") throw new Error("Not connected");
        const smartAccountAddress = state.account.granterAddress;
        const signingClient = state.signingClient;

        // Create invalid transaction (send more than exists)
        const invalidMsg = createTestTransferMsg(
          smartAccountAddress,
          config.feeGranter,
          "999999999999999999999",
        );

        // Simulation should fail
        await expect(
          signingClient!.simulate(smartAccountAddress, [invalidMsg], ""),
        ).rejects.toThrow();

        await controller.disconnect();
      },
      INTEGRATION_TEST_TIMEOUT,
    );
  });
});
