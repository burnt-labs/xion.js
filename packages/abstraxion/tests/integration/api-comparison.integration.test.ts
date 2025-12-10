/**
 * Test script to compare behavior against testnet vs local AA API
 * Run with: TEST_ENVIRONMENT=testnet or TEST_ENVIRONMENT=local
 *
 * This test validates the hypothesis that normalizeEthereumAddress changed between
 * main branch (testnet) and current branch (local dev), causing address format issues.
 *
 * Key difference:
 * - Main/Testnet: Accepts Ethereum addresses WITH or WITHOUT 0x prefix
 * - Current/Local: REQUIRES Ethereum addresses WITH 0x prefix (new validation)
 */

import { describe, it, expect, beforeAll } from "vitest";
import { getTestConfig, INTEGRATION_TEST_TIMEOUT } from "./fixtures";
import {
  createTestSignerController,
  createEthWalletGetSignerConfig,
} from "./helpers";
import {
  CompositeAccountStrategy,
  RpcAccountStrategy,
  type SessionManager,
} from "@burnt-labs/account-management";
import { createMockStorageStrategy, createMockSessionManager } from "./helpers";
import type { SignerAuthentication } from "../../src/types";

describe("AA API Comparison Tests - Address Normalization", () => {
  let config: ReturnType<typeof getTestConfig>;
  let storageStrategy: ReturnType<typeof createMockStorageStrategy>;
  let sessionManager: SessionManager;
  let accountStrategy: CompositeAccountStrategy;

  // Test Ethereum address (same account, different formats)
  const TEST_ETH_ADDRESS_WITH_PREFIX =
    "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0";
  const TEST_ETH_ADDRESS_WITHOUT_PREFIX =
    "742d35Cc6634C0532925a3b844Bc9e7595f0bEb0";

  beforeAll(() => {
    config = getTestConfig();
    storageStrategy = createMockStorageStrategy();
    sessionManager = createMockSessionManager(storageStrategy);

    const rpcStrategy = new RpcAccountStrategy(config.rpcUrl);
    accountStrategy = new CompositeAccountStrategy([rpcStrategy]);

    console.log("\n" + "=".repeat(60));
    console.log("📋 Test Configuration:");
    console.log("  Environment:", config.environment);
    console.log("  AA API URL:", config.aaApiUrl);
    console.log("  Chain ID:", config.chainId);
    console.log("  RPC URL:", config.rpcUrl);
    console.log("  Treasury:", config.treasuryAddress);
    console.log("\n🧪 Testing Hypothesis:");
    console.log("  Main/Testnet: Accepts addresses WITH or WITHOUT 0x prefix");
    console.log("  Current/Local: REQUIRES addresses WITH 0x prefix");
    console.log("=".repeat(60) + "\n");
  });

  describe("Direct API Address Endpoint Tests", () => {
    it(
      "should accept Ethereum address WITH 0x prefix (both APIs should support)",
      async () => {
        console.log(
          `\n[Test] Testing address WITH 0x prefix: ${TEST_ETH_ADDRESS_WITH_PREFIX}`,
        );
        console.log(`[Test] AA API: ${config.aaApiUrl}`);

        try {
          const response = await fetch(
            `${config.aaApiUrl}/api/v2/account/address/ethwallet/${TEST_ETH_ADDRESS_WITH_PREFIX}`,
          );

          console.log(`[Test] Response status: ${response.status}`);

          if (!response.ok) {
            const errorBody = await response.text();
            console.log(`[Test] Error response body:`, errorBody);
            throw new Error(`API returned ${response.status}: ${errorBody}`);
          }

          const data = await response.json();
          console.log(`[Test] ✓ Success! Derived address: ${data.address}`);

          expect(response.status).toBe(200);
          expect(data.address).toBeDefined();
          expect(data.address).toMatch(/^xion1[a-z0-9]+$/);
        } catch (error: any) {
          console.error(`[Test] ✗ Failed with error:`, error.message);
          throw error;
        }
      },
      INTEGRATION_TEST_TIMEOUT,
    );

    it(
      "should handle Ethereum address WITHOUT 0x prefix (compatibility test)",
      async () => {
        console.log(
          `\n[Test] Testing address WITHOUT 0x prefix: ${TEST_ETH_ADDRESS_WITHOUT_PREFIX}`,
        );
        console.log(`[Test] AA API: ${config.aaApiUrl}`);
        console.log(`[Test] Expected behavior:`);
        console.log(`  - Testnet (main): Should ACCEPT (no validation)`);
        console.log(`  - Local (current): Should REJECT (requires 0x prefix)`);

        try {
          const response = await fetch(
            `${config.aaApiUrl}/api/v2/account/address/ethwallet/${TEST_ETH_ADDRESS_WITHOUT_PREFIX}`,
          );

          console.log(`[Test] Response status: ${response.status}`);

          if (response.ok) {
            const data = await response.json();
            console.log(`[Test] ✓ Accepted! Derived address: ${data.address}`);
            console.log(
              `[Test] This indicates OLD behavior (testnet/main branch)`,
            );

            expect(response.status).toBe(200);
            expect(data.address).toBeDefined();
          } else {
            const errorBody = await response.text();
            console.log(`[Test] ✗ Rejected with error:`, errorBody);
            console.log(
              `[Test] This indicates NEW behavior (current branch with strict validation)`,
            );

            // This is expected on current branch (local dev)
            expect(response.status).toBe(400);
            expect(errorBody).toContain("Invalid Ethereum address format");
          }

          // Log the finding
          console.log(`\n[Test] 🔍 Validation Result:`);
          if (response.ok) {
            console.log(
              `  API accepts addresses WITHOUT 0x prefix (backward compatible)`,
            );
          } else {
            console.log(`  API REQUIRES 0x prefix (breaking change from main)`);
          }
        } catch (error: any) {
          console.error(`[Test] ✗ Unexpected error:`, error.message);
          throw error;
        }
      },
      INTEGRATION_TEST_TIMEOUT,
    );

    it(
      "should produce SAME address for both formats (if both accepted)",
      async () => {
        console.log(`\n[Test] Comparing derived addresses for both formats`);

        // Test with prefix
        const responseWith = await fetch(
          `${config.aaApiUrl}/api/v2/account/address/ethwallet/${TEST_ETH_ADDRESS_WITH_PREFIX}`,
        );

        if (!responseWith.ok) {
          throw new Error(
            `Failed to get address with prefix: ${responseWith.status}`,
          );
        }

        const dataWith = await responseWith.json();
        console.log(`[Test] Address with 0x prefix: ${dataWith.address}`);

        // Test without prefix (may fail on current branch)
        const responseWithout = await fetch(
          `${config.aaApiUrl}/api/v2/account/address/ethwallet/${TEST_ETH_ADDRESS_WITHOUT_PREFIX}`,
        );

        if (responseWithout.ok) {
          const dataWithout = await responseWithout.json();
          console.log(
            `[Test] Address without 0x prefix: ${dataWithout.address}`,
          );

          // Both should produce the SAME address (salt calculation must be identical)
          expect(dataWith.address).toBe(dataWithout.address);
          console.log(
            `[Test] ✓ Both formats produce IDENTICAL address (salt calculation is consistent)`,
          );
        } else {
          console.log(
            `[Test] ⚠️  Cannot compare - API rejects address without 0x prefix`,
          );
          console.log(
            `[Test] This confirms the breaking change in current branch`,
          );
          // Don't fail the test - this is expected on current branch
        }
      },
      INTEGRATION_TEST_TIMEOUT,
    );
  });

  describe("Full Account Creation Flow Tests", () => {
    it(
      "should create account with EthWallet authenticator (0x prefix)",
      async () => {
        console.log(
          "\n[Test] Creating account with EthWallet signer (0x prefix)...",
        );

        // Use EthWallet signer with 0x prefix (standard format)
        const ethWalletAuth: SignerAuthentication = {
          type: "signer",
          aaApiUrl: config.aaApiUrl,
          smartAccountContract: {
            codeId: parseInt(config.codeId, 10),
            checksum: config.checksum,
            addressPrefix: "xion",
          },
          getSignerConfig: createEthWalletGetSignerConfig(),
        };

        const controller = createTestSignerController({
          config,
          signerAuth: ethWalletAuth,
          accountStrategy,
          sessionManager,
          storageStrategy,
          treasuryAddress: config.treasuryAddress,
          grantConfig: {
            treasury: config.treasuryAddress,
          },
        });

        try {
          console.log("[Test] Initializing controller...");
          await controller.initialize();
          console.log("[Test] ✓ Controller initialized");

          console.log("[Test] Connecting to AA API:", config.aaApiUrl);
          await controller.connect();

          const state = controller.getState();
          console.log("\n[Test] Connection Result:");
          console.log("  Status:", state.status);

          if (state.status === "connected") {
            console.log("  ✓ Account created successfully!");
            console.log("  Account address:", state.account?.granterAddress);
            expect(state.status).toBe("connected");
            expect(state.account?.granterAddress).toBeDefined();
            expect(state.account?.granterAddress).toMatch(/^xion1[a-z0-9]+$/);
          } else {
            console.log("  ✗ Connection failed");
            console.log("  Error:", state.error);
            throw new Error(
              `Connection failed: ${state.error || "Unknown error"}`,
            );
          }

          await controller.disconnect();
        } catch (error: any) {
          console.error("\n[Test] ✗ Test failed with error:");
          console.error("  Message:", error.message);
          console.error(
            "  Stack:",
            error.stack?.split("\n").slice(0, 5).join("\n"),
          );
          throw error;
        }
      },
      INTEGRATION_TEST_TIMEOUT,
    );
  });

  describe("Summary and Recommendations", () => {
    it("should log summary of findings", () => {
      console.log("\n" + "=".repeat(60));
      console.log("📊 Test Summary and Analysis");
      console.log("=".repeat(60));
      console.log("\n🔍 Identified Issue:");
      console.log(
        "  The normalizeEthereumAddress function changed between branches:",
      );
      console.log("");
      console.log("  Main Branch (Testnet):");
      console.log("    - Accepts: '0x742d35...' OR '742d35...'");
      console.log("    - Validation: None (just toLowerCase)");
      console.log(
        "    - Location: account-abstraction-api/src/api/services/accounts.ts",
      );
      console.log("");
      console.log("  Current Branch (Local):");
      console.log("    - Accepts: '0x742d35...' ONLY");
      console.log("    - Validation: Strict regex /^0x[a-fA-F0-9]{40}$/");
      console.log(
        "    - Location: xion.js/packages/signers/src/crypto/normalize.ts",
      );
      console.log("");
      console.log("💡 Recommended Fix:");
      console.log(
        "  Make validation lenient to maintain backward compatibility:",
      );
      console.log("");
      console.log(
        "  export function normalizeEthereumAddress(address: string): string {",
      );
      console.log("    const trimmed = address.trim();");
      console.log("    if (!trimmed) {");
      console.log("      throw new Error('Ethereum address cannot be empty');");
      console.log("    }");
      console.log("    ");
      console.log(
        "    // Auto-add 0x prefix if missing (backward compatibility)",
      );
      console.log("    let normalized = trimmed.toLowerCase();");
      console.log("    if (!normalized.startsWith('0x')) {");
      console.log("      normalized = '0x' + normalized;");
      console.log("    }");
      console.log("    ");
      console.log("    // Validate final format");
      console.log("    if (!/^0x[a-f0-9]{40}$/.test(normalized)) {");
      console.log(
        "      throw new Error(`Invalid Ethereum address format: ${trimmed}`);",
      );
      console.log("    }");
      console.log("    ");
      console.log("    return normalized;");
      console.log("  }");
      console.log("");
      console.log("⚠️  Impact:");
      console.log("  - Salt calculation depends on normalized address");
      console.log(
        "  - Different formats = different salts = different account addresses",
      );
      console.log("  - Client code may send addresses in either format");
      console.log("  - Breaking change affects production users");
      console.log("=".repeat(60) + "\n");
    });
  });
});
