/**
 * Global setup and teardown for integration tests
 * Configures test environment, validates configuration, and provides lifecycle hooks
 */

import { beforeAll, afterAll, afterEach } from "vitest";
import { getTestConfig, EXPECTED_VALUES } from "./fixtures";
import {
  createTestStargateClient,
  checkTreasuryContract,
  cleanupTestStorage,
  createSecp256k1Wallet,
  getAccountBalance,
  retryWithBackoff,
} from "./helpers";

// Global test state
let testConfig: ReturnType<typeof getTestConfig>;
let testSetupComplete = false;

/**
 * Run before all tests to validate environment
 */
export async function globalSetup() {
  if (testSetupComplete) {
    return;
  }

  console.log("\n🔧 Setting up integration test environment...\n");

  // Load test configuration
  testConfig = getTestConfig();

  console.log("📋 Test Configuration:");
  console.log(`  Environment: ${testConfig.environment}`);
  console.log(`  Chain ID: ${testConfig.chainId}`);
  console.log(`  RPC URL: ${testConfig.rpcUrl}`);
  console.log(`  AA API URL: ${testConfig.aaApiUrl}`);
  console.log(`  Treasury: ${testConfig.treasuryAddress}`);
  console.log("");

  // Validate RPC connection with retry
  try {
    console.log("🔗 Connecting to RPC...");
    const client = await retryWithBackoff(
      async () => {
        const c = await createTestStargateClient();
        const height = await c.getHeight();
        return { client: c, height };
      },
      3, // max retries
      2000 // initial delay 2 seconds
    );
    console.log(`✅ RPC connection successful (height: ${client.height})`);
  } catch (error) {
    console.error("❌ Failed to connect to RPC after retries:");
    console.error(error);
    throw new Error(
      `RPC connection failed after retries. Check your RPC URL (${testConfig.rpcUrl}) and network connectivity. ` +
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // Validate treasury contract (if configured)
  if (testConfig.treasuryAddress) {
    try {
      console.log("🏦 Checking treasury contract...");
      const exists = await checkTreasuryContract(
        testConfig.treasuryAddress
      );
      if (exists) {
        console.log(
          `✅ Treasury contract found: ${testConfig.treasuryAddress}`
        );
      } else {
        console.warn(
          `⚠️  Treasury contract not found: ${testConfig.treasuryAddress}`
        );
        console.warn(
          "   Treasury-related tests may fail. This is expected if testing without a treasury."
        );
      }
    } catch (error) {
      console.warn(
        "⚠️  Could not verify treasury contract:",
        error
      );
    }
  }

  // Check test account balance
  try {
    console.log("💰 Checking test account balance...");
    const { address } = await createSecp256k1Wallet();
    const balance = await getAccountBalance(address);
    const balanceInXion = (parseInt(balance, 10) / 1e6).toFixed(6);
    console.log(`   Test account: ${address}`);
    console.log(`   Balance: ${balanceInXion} XION (${balance} uxion)`);

    if (parseInt(balance, 10) === 0) {
      console.warn(
        "⚠️  Test account has zero balance. Transaction tests will fail."
      );
      console.warn(
        "   Please fund the test account or use a different mnemonic."
      );
    } else {
      console.log("✅ Test account has sufficient balance");
    }
  } catch (error) {
    console.warn("⚠️  Could not check test account balance:", error);
  }

  console.log("\n✅ Test environment setup complete!\n");
  testSetupComplete = true;
}

/**
 * Run after all tests to cleanup
 */
export async function globalTeardown() {
  console.log("\n🧹 Cleaning up test environment...");

  // Cleanup test storage
  cleanupTestStorage();

  console.log("✅ Cleanup complete\n");
}

/**
 * Register global hooks
 * Call this in your test files that need setup/teardown
 */
export function registerGlobalHooks() {
  beforeAll(async () => {
    await globalSetup();
  }, 60000); // 60 second timeout for setup

  afterEach(() => {
    // Cleanup after each test
    cleanupTestStorage();
  });

  afterAll(async () => {
    await globalTeardown();
  });
}

/**
 * Get the loaded test configuration
 */
export function getLoadedTestConfig() {
  return testConfig || getTestConfig();
}

/**
 * Validate that required environment variables are set
 */
export function validateRequiredEnvVars() {
  const required = [
    "XION_TESTNET_CHAIN_ID",
    "XION_TESTNET_RPC_URL",
    "XION_TESTNET_REST_URL",
    "TEST_MNEMONIC",
  ];

  const missing: string[] = [];

  for (const varName of required) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\n` +
        "Please ensure .env.test is properly configured."
    );
  }
}

/**
 * Check if indexer tests should be skipped
 */
export function shouldSkipIndexerTests(): boolean {
  return !process.env.XION_TESTNET_INDEXER_URL;
}

/**
 * Check if treasury tests should be skipped
 */
export function shouldSkipTreasuryTests(): boolean {
  return !testConfig?.treasuryAddress;
}

/**
 * Get test timeout based on test type
 */
export function getTestTimeout(type: "unit" | "integration" = "integration"): number {
  if (type === "integration") {
    return parseInt(process.env.INTEGRATION_TEST_TIMEOUT || "120000", 10);
  }
  return parseInt(process.env.TEST_TIMEOUT || "30000", 10);
}
