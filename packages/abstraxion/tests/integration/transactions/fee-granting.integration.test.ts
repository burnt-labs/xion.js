/**
 * Fee Granting Integration Tests
 *
 * Tests fee granting mechanisms for smart accounts on testnet.
 * Validates treasury-based fee granting, grant configuration, and fee calculation.
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
  checkTreasuryContract,
  isValidXionAddress,
  generateTestWalletPair,
  createTestTransferMsg,
} from "../helpers";
import {
  CompositeAccountStrategy,
  RpcAccountStrategy,
  type SessionManager,
} from "@burnt-labs/account-management";
import { StargateClient } from "@cosmjs/stargate";

describe("Fee Granting Integration Tests", () => {
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
      grantConfig: treasuryAddress
        ? {
            treasury: treasuryAddress,
          }
        : undefined,
    });
  }

  describe("Treasury-Based Fee Granting", () => {
    it(
      "should configure controller with treasury address",
      async () => {
        const controller = createSignerController(config.treasuryAddress);

        await controller.initialize();
        await controller.connect();

        const state = controller.getState();
        expect(state.status).toBe("connected");
        expect(state.account?.granterAddress).toBeDefined();
        expect(isValidXionAddress(state.account!.granterAddress!)).toBe(true);

        await controller.disconnect();
      },
      INTEGRATION_TEST_TIMEOUT
    );

    it(
      "should verify treasury contract exists on-chain",
      async () => {
        const treasuryExists = await checkTreasuryContract(
          config.treasuryAddress
        );
        expect(treasuryExists).toBe(true);

        const treasuryBalance = await stargateClient.getBalance(
          config.treasuryAddress,
          "uxion"
        );
        expect(BigInt(treasuryBalance.amount)).toBeGreaterThan(0n);
      },
      INTEGRATION_TEST_TIMEOUT
    );

    it(
      "should use treasury for transaction fees",
      async () => {
        const controller = createSignerController(config.treasuryAddress);

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
          `fee-grant-test-${Date.now()}`
        );

        const result = await signingClient!.signAndBroadcast(
          smartAccountAddress,
          [contractMsg],
          "auto",
          "Treasury fee granting test"
        );

        expect(result.code).toBe(0);
        expect(result.transactionHash).toBeDefined();

        await controller.disconnect();
      },
      INTEGRATION_TEST_TIMEOUT
    );

    it(
      "should handle missing treasury gracefully",
      async () => {
        const controller = createSignerController(undefined);

        await controller.initialize();
        await controller.connect();

        const state = controller.getState();
        expect(state.status).toBe("connected");

        if (state.status === "connected") {
          expect(state.signingClient).toBeDefined();
        }

        await controller.disconnect();
      },
      INTEGRATION_TEST_TIMEOUT
    );
  });

  describe("Fee Calculation", () => {
    it(
      "should calculate fees based on gas price",
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
          `fee-calc-test-${Date.now()}`
        );

        // Simulate to get gas estimation
        const gasEstimation = await signingClient!.simulate(
          smartAccountAddress,
          [contractMsg],
          "Fee calculation test"
        );

        // Execute with auto fee
        const result = await signingClient!.signAndBroadcast(
          smartAccountAddress,
          [contractMsg],
          "auto",
          "Fee calculation test"
        );

        expect(result.code).toBe(0);
        expect(Number(result.gasUsed)).toBeGreaterThan(0);
        expect(Number(result.gasUsed)).toBeLessThanOrEqual(gasEstimation * 1.5);

        await controller.disconnect();
      },
      INTEGRATION_TEST_TIMEOUT
    );

    it(
      "should handle explicit fee specification",
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
          `explicit-fee-test-${Date.now()}`
        );

        const gasEstimation = await signingClient!.simulate(
          smartAccountAddress,
          [contractMsg],
          "Explicit fee test"
        );

        const explicitFee = {
          amount: [{ denom: "uxion", amount: "200000" }],
          gas: String(Math.round(gasEstimation * 1.5)),
          granter: config.treasuryAddress,
        };

        const result = await signingClient!.signAndBroadcast(
          smartAccountAddress,
          [contractMsg],
          explicitFee,
          "Explicit fee test"
        );

        expect(result.code).toBe(0);

        await controller.disconnect();
      },
      INTEGRATION_TEST_TIMEOUT
    );

    it(
      "should fail with insufficient gas limit",
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
          `insufficient-gas-test-${Date.now()}`
        );

        const insufficientFee = {
          amount: [{ denom: "uxion", amount: "1000" }],
          gas: "100", // Too low
          granter: config.treasuryAddress,
        };

        await expect(
          signingClient!.signAndBroadcast(
            smartAccountAddress,
            [contractMsg],
            insufficientFee,
            "Insufficient gas test"
          )
        ).rejects.toThrow();

        await controller.disconnect();
      },
      INTEGRATION_TEST_TIMEOUT
    );
  });

  describe("Grant Configuration", () => {
    it(
      "should handle transactions with treasury grants",
      async () => {
        const controller = createSignerController(config.treasuryAddress);

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
          `fee-grant-test-${Date.now()}`
        );

        const result = await signingClient!.signAndBroadcast(
          smartAccountAddress,
          [contractMsg],
          "auto",
          "Treasury grant test"
        );

        expect(result.code).toBe(0);

        await controller.disconnect();
      },
      INTEGRATION_TEST_TIMEOUT
    );

    it(
      "should handle grants across multiple transactions",
      async () => {
        const controller = createSignerController();

        await controller.initialize();
        await controller.connect();

        const state = controller.getState();
        expect(state.status).toBe("connected");
        if (state.status !== "connected") throw new Error("Not connected");
        const smartAccountAddress = state.account.granterAddress;
        const signingClient = state.signingClient;

        // Execute multiple transactions - grants should remain valid
        for (let i = 0; i < 3; i++) {
          const contractMsg = createUserMapUpdateMsg(
            smartAccountAddress,
            config.userMapContract,
            `multi-tx-test-${i}-${Date.now()}`
          );

          const result = await signingClient!.signAndBroadcast(
            smartAccountAddress,
            [contractMsg],
            "auto",
            `Multi-transaction test ${i + 1}`
          );

          expect(result.code).toBe(0);
        }

        await controller.disconnect();
      },
      INTEGRATION_TEST_TIMEOUT
    );
  });
});
