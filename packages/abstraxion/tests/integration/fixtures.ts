/**
 * Test fixtures and configuration data for integration tests
 * Provides test accounts, contract addresses, and expected values
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load .env.test file
config({ path: resolve(__dirname, ".env.test") });

// Load .env.test.local if it exists (for local overrides with secrets)
config({ path: resolve(__dirname, ".env.test.local") });

export interface TestConfig {
  environment: "testnet" | "local";
  chainId: string;
  rpcUrl: string;
  restUrl: string;
  gasPrice: string;
  addressPrefix: string;
  aaApiUrl: string;
  codeId: string;
  checksum: string;
  feeGranter: string;
  treasuryAddress: string;
  indexerUrl?: string;
}

/**
 * Get test configuration based on TEST_TARGET
 * - "local": Uses local AA API (localhost:8787) with local fee granter
 * - "deployed": Uses deployed AA API with deployed fee granter
 * Both connect to testnet blockchain
 */
export function getTestConfig(): TestConfig {
  const target = (process.env.TEST_TARGET || "deployed") as
    | "local"
    | "deployed";

  // Testnet blockchain config (same for both)
  const baseConfig = {
    chainId: process.env.XION_TESTNET_CHAIN_ID || "xion-testnet-2",
    rpcUrl:
      process.env.XION_TESTNET_RPC_URL ||
      "https://rpc.xion-testnet-2.burnt.com:443",
    restUrl:
      process.env.XION_TESTNET_REST_URL ||
      "https://api.xion-testnet-2.burnt.com",
    gasPrice: process.env.XION_TESTNET_GAS_PRICE || "0.001uxion",
    addressPrefix: process.env.XION_TESTNET_ADDRESS_PREFIX || "xion",
    codeId: process.env.XION_TESTNET_CODE_ID || "1",
    checksum:
      process.env.XION_TESTNET_CHECKSUM ||
      "FC06F022C95172F54AD05BC07214F50572CDF684459EADD4F58A765524567DB8",
    treasuryAddress:
      process.env.XION_TESTNET_TREASURY_ADDRESS ||
      "xion1sv6kdau6mvjlzkthdhpcl53e8zmhaltmgzz9jhxgkxhmpymla9gqrh0knw",
    userMapContract:
      process.env.XION_TESTNET_USER_MAP_CONTRACT ||
      "xion1q66h2ynmrm5je9awcdwcyxjykd6c0h4wf3u5ha4s5cntf8jr5jfqh8mwey",
    indexerUrl: process.env.XION_TESTNET_INDEXER_URL,
  };

  // AA API config (switches based on target)
  if (target === "local") {
    return {
      ...baseConfig,
      environment: "local",
      aaApiUrl: process.env.XION_LOCAL_AA_API_URL || "http://localhost:8787",
      feeGranter:
        process.env.XION_LOCAL_FEE_GRANTER ||
        "xion10y5pzqs0jn89zpm6va625v6xzsqjkm293efwq8",
    };
  }

  // Default to deployed (uses testnet environment type)
  return {
    ...baseConfig,
    environment: "testnet",
    aaApiUrl:
      process.env.XION_DEPLOYED_AA_API_URL ||
      "https://aa-api.xion-testnet-2.burnt.com",
    feeGranter:
      process.env.XION_DEPLOYED_FEE_GRANTER ||
      "xion1xrqz2wpt4rw8rtdvrc4n4yn5h54jm0nn4evn2x",
  };
}

/**
 * Test account mnemonic (has test XION tokens)
 * WARNING: DO NOT use in production!
 */
export const TEST_MNEMONIC =
  process.env.TEST_MNEMONIC ||
  "furnace hammer kite tent baby settle bonus decade draw never juice myth";

/**
 * Test grant amounts
 */
export const TEST_GRANT_AMOUNT = parseInt(
  process.env.TEST_GRANT_AMOUNT || "1000000",
  10,
); // 1 XION = 1e6 uxion
export const TEST_SEND_AMOUNT = parseInt(
  process.env.TEST_SEND_AMOUNT || "10000",
  10,
); // 0.01 XION

/**
 * Test timeouts
 */
export const TEST_TIMEOUT = parseInt(process.env.TEST_TIMEOUT || "30000", 10);
export const INTEGRATION_TEST_TIMEOUT = parseInt(
  process.env.INTEGRATION_TEST_TIMEOUT || "120000",
  10,
);

/**
 * Indexer configuration (optional)
 */
export const INDEXER_CONFIG = {
  numiaUrl: process.env.XION_TESTNET_INDEXER_URL,
  numiaApiKey: process.env.NUMIA_API_KEY,
  subqueryUrl: process.env.XION_TESTNET_TREASURY_INDEXER_URL,
  subqueryApiKey: process.env.SUBQUERY_API_KEY,
};

/**
 * Expected test values for validation
 */
export const EXPECTED_VALUES = {
  // Address format validation
  xionAddressRegex: /^xion1[a-z0-9]{38,59}$/,

  // Signature lengths (in bytes when decoded from base64)
  secp256k1SignatureLength: 64,
  ethWalletSignatureLength: 65,

  // Grant validation
  minGrantAmount: TEST_GRANT_AMOUNT,
  testSendAmount: TEST_SEND_AMOUNT,

  // Transaction validation
  gasMultiplier: 1.4,
  defaultGasLimit: 200000,

  // Session/grant expiration (in milliseconds)
  grantExpirationWarningThreshold: 10 * 60 * 1000, // 10 minutes
  maxGrantPollRetries: 5,
  grantPollBackoffMs: 2000, // 2 seconds initial backoff
  maxGrantPollTimeout: 120000, // 2 minutes total

  // Authenticator types
  authenticatorTypes: {
    secp256k1: "secp256k1",
    ethWallet: "ethWallet",
    jwt: "jwt",
  },
};

/**
 * Mock redirect URLs for testing redirect flow
 */
export const MOCK_REDIRECT_URLS = {
  success: "http://localhost:3000?code=success&granter=xion1test",
  cancelled: "http://localhost:3000?error=cancelled",
  timeout: "http://localhost:3000?error=timeout",
};

/**
 * Test recipient addresses for transaction tests
 * These are deterministic addresses derived from the test mnemonic with different indices
 */
export const TEST_RECIPIENTS = {
  // These will be derived in helpers.ts to avoid circular dependencies
  primary: "", // Will be set at runtime
  secondary: "", // Will be set at runtime
};

/**
 * React Integration Test Configurations
 * Provides AbstraxionConfig objects for redirect and signer authentication modes
 */
import type { AbstraxionConfig } from "../../src/types";
import { createTestSecp256k1Connector } from "./helpers";

/**
 * Test account addresses (these will be dynamically derived)
 * Using index 0 from TEST_MNEMONIC
 */
export const testAccount = ""; // Will be set at runtime
export const testRecipient = ""; // Will be set at runtime (index 1)

/**
 * Redirect mode configuration for React integration tests
 * Uses testnet AA API for authentication redirects
 */
export const testConfig = {
  redirectMode: {
    chainId: "xion-testnet-2",
    rpcUrl: "https://rpc.xion-testnet-2.burnt.com:443",
    restUrl: "https://api.xion-testnet-2.burnt.com",
    gasPrice: "0.001uxion",
    authentication: {
      type: "redirect" as const,
      callbackUrl: "http://localhost:3000",
    },
  } as AbstraxionConfig,

  /**
   * Signer mode configuration for React integration tests
   * Uses test Secp256K1 connector for direct signing
   */
  signerMode: {
    chainId: "xion-testnet-2",
    rpcUrl: "https://rpc.xion-testnet-2.burnt.com:443",
    restUrl: "https://api.xion-testnet-2.burnt.com",
    gasPrice: "0.001uxion",
    // Treasury configuration is required to enable signing client creation
    // The treasury address is used to create fee grants for the smart account
    treasury:
      process.env.XION_TESTNET_TREASURY_ADDRESS ||
      "xion1sv6kdau6mvjlzkthdhpcl53e8zmhaltmgzz9jhxgkxhmpymla9gqrh0knw",
    // Fee granter pays for transaction fees during grant creation
    feeGranter:
      process.env.XION_TESTNET_FEE_GRANTER ||
      "xion1xrqz2wpt4rw8rtdvrc4n4yn5h54jm0nn4evn2x",
    authentication: {
      type: "signer" as const,
      aaApiUrl: "https://aa-api.xion-testnet-2.burnt.com",
      getSignerConfig: async () => {
        // Create test connector on demand
        const connector = createTestSecp256k1Connector(TEST_MNEMONIC, 0);
        const result = await connector.connect();
        const { getSignerConfigFromConnectorResult } = await import(
          "./helpers"
        );
        return getSignerConfigFromConnectorResult(result);
      },
      smartAccountContract: {
        codeId: 1,
        checksum:
          "FC06F022C95172F54AD05BC07214F50572CDF684459EADD4F58A765524567DB8",
        addressPrefix: "xion",
      },
    },
  } as AbstraxionConfig,

  // Test recipient for send transactions (index 1 from mnemonic)
  testRecipient: "", // Will be set at runtime
  // Test account (index 0 from mnemonic)
  testAccount: "", // Will be set at runtime
};
