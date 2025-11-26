/**
 * Integration test utilities and helpers
 * Provides utilities for creating test connectors, session managers, and strategies
 */

import { ExternalSignerConnector } from "@burnt-labs/abstraxion-core";
import {
  AUTHENTICATOR_TYPE,
  type AuthenticatorType,
} from "@burnt-labs/signers";
import type { Connector, SignerConfig } from "@burnt-labs/abstraxion-core";
import type { SignArbSecp256k1HdWallet } from "@burnt-labs/abstraxion-core";
import { DirectSecp256k1HdWallet, makeCosmoshubPath } from "@cosmjs/proto-signing";
import { makeADR36AminoSignDoc } from "@burnt-labs/abstraxion-core/src/utils";

/**
 * Integration test configuration from environment variables
 * Extended version with account-management specific fields
 */
export interface IntegrationTestConfig {
  chainId: string;
  rpcUrl: string;
  restUrl: string;
  gasPrice: string;
  aaApiUrl: string;
  treasuryAddress?: string;
  indexerUrl?: string;
  addressPrefix: string;
  feeToken: string;
}

/**
 * Get integration test configuration from environment variables
 * Throws an error if required environment variables are not set
 */
export function getIntegrationTestConfig(): IntegrationTestConfig {
  const chainId = process.env.XION_TESTNET_CHAIN_ID;
  const rpcUrl = process.env.XION_TESTNET_RPC_URL;
  const restUrl = process.env.XION_TESTNET_REST_URL;
  const gasPrice = process.env.XION_TESTNET_GAS_PRICE;
  const aaApiUrl = process.env.XION_TESTNET_AA_API_URL;
  const treasuryAddress = process.env.XION_TESTNET_TREASURY_ADDRESS;
  const indexerUrl = process.env.XION_TESTNET_INDEXER_URL;

  if (!chainId) {
    throw new Error("XION_TESTNET_CHAIN_ID environment variable is required");
  }
  if (!rpcUrl) {
    throw new Error("XION_TESTNET_RPC_URL environment variable is required");
  }
  if (!restUrl) {
    throw new Error("XION_TESTNET_REST_URL environment variable is required");
  }
  if (!gasPrice) {
    throw new Error("XION_TESTNET_GAS_PRICE environment variable is required");
  }
  if (!aaApiUrl) {
    throw new Error("XION_TESTNET_AA_API_URL environment variable is required");
  }

  return {
    chainId,
    rpcUrl,
    restUrl,
    gasPrice,
    aaApiUrl,
    treasuryAddress,
    indexerUrl,
    addressPrefix: "xion",
    feeToken: "uxion",
  };
}

/**
 * Create a test connector for Secp256k1 authenticator
 */
export function createTestSecp256k1Connector(
  mnemonic: string,
  authenticator?: string,
): Connector {
  return new ExternalSignerConnector({
    id: "test-secp256k1",
    name: "Test Secp256k1",
    async getSignerConfig(): Promise<SignerConfig> {
      const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
        hdPaths: [makeCosmoshubPath(0)],
      });
      const accounts = await wallet.getAccounts();
      const pubkey = Buffer.from(accounts[0].pubkey).toString("hex");

      return {
        authenticatorType: AUTHENTICATOR_TYPE.Secp256K1,
        authenticator: authenticator || pubkey,
        signMessage: async (message: string) => {
          // Create ADR-36 sign doc for message signing
          const signDoc = makeADR36AminoSignDoc(
            accounts[0].address,
            Buffer.from(message, "hex"),
          );
          const signature = await wallet.signDirect(
            accounts[0].address,
            signDoc,
          );
          return Buffer.from(signature.signature.signature).toString("hex");
        },
      };
    },
  });
}

/**
 * Create a test connector for EthWallet authenticator
 */
export function createTestEthWalletConnector(
  privateKey: string,
  address?: string,
): Connector {
  return new ExternalSignerConnector({
    id: "test-ethwallet",
    name: "Test EthWallet",
    async getSignerConfig(): Promise<SignerConfig> {
      // In a real test, you'd use ethers or similar
      // For now, this is a placeholder that would need actual implementation
      const testAddress =
        address || "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0";

      return {
        authenticatorType: AUTHENTICATOR_TYPE.EthWallet,
        authenticator: testAddress.toLowerCase(),
        signMessage: async (message: string) => {
          // In real tests, you'd sign with ethers
          // This is a placeholder
          return `0x${Buffer.from(message).toString("hex")}`;
        },
      };
    },
  });
}

/**
 * Wait for a condition to be true (useful for async operations)
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 10000,
  interval = 100,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Generate a random mnemonic for testing
 * Uses a deterministic mnemonic for reproducibility in tests
 */
export function generateTestMnemonic(): string {
  // Standard BIP39 test mnemonic
  return "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
}

/**
 * Generate a unique test mnemonic based on a seed
 * Useful for tests that need different accounts
 */
export function generateTestMnemonicWithSeed(seed: number): string {
  // In production, use a proper BIP39 mnemonic generator
  // For testing, we'll use different standard test mnemonics
  const mnemonics = [
    "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
    "test test test test test test test test test test test junk",
    "evidence cement snap basket genre fantasy degree ability sunset pistol palace target",
    "quality vacuum heart guard buzz spike sight swarm shove special gym robust",
  ];
  return mnemonics[seed % mnemonics.length];
}
