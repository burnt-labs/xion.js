/**
 * Integration test helpers and utilities
 * Provides functions for creating test wallets, connectors, and validating results
 */

import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { stringToPath, Sha256, Secp256k1 } from "@cosmjs/crypto";
import { SigningStargateClient, StargateClient, type Account } from "@cosmjs/stargate";
import type { EncodeObject } from "@cosmjs/proto-signing";
import { AUTHENTICATOR_TYPE, customAccountFromAny, isValidHex, fromHex } from "@burnt-labs/signers";
import { getTestConfig, TEST_MNEMONIC } from "./fixtures";
import { Wallet, HDNodeWallet, toUtf8Bytes } from "ethers";
import { toHex } from "@cosmjs/encoding";
import { ExternalSignerConnector } from "@burnt-labs/abstraxion-core";
import type { SignerConfig } from "@burnt-labs/abstraxion-core";
import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
// Import MockStorageStrategy from test-utils
// Note: If this causes import issues, we can keep the custom implementation
// but match the MockStorageStrategy interface for compatibility
import type { StorageStrategy } from "@burnt-labs/abstraxion-core";
import { SignerController } from "../../src/controllers/SignerController";
import type { SignerControllerConfig } from "../../src/controllers/SignerController";
import type { SignerAuthentication } from "../../src/types";
import type { SessionManager } from "@burnt-labs/account-management";
import { checkStorageGrants } from "@burnt-labs/account-management";

/**
 * Generate a test mnemonic (or use default)
 */
export function generateTestMnemonic(): string {
  // For now, always return the configured test mnemonic
  // In the future, we could generate new ones per test
  return TEST_MNEMONIC;
}


/**
 * Create a Secp256k1 wallet from mnemonic
 */
export async function createSecp256k1Wallet(
  mnemonic: string = TEST_MNEMONIC,
  accountIndex: number = 0
) {
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
    prefix: "xion",
    hdPaths: [stringToPath(`m/44'/118'/0'/0/${accountIndex}`)],
  });

  const [account] = await wallet.getAccounts();

  return {
    wallet,
    account,
    address: account.address,
    pubkey: Buffer.from(account.pubkey).toString("hex"),
    pubkeyBase64: Buffer.from(account.pubkey).toString("base64"),
  };
}

/**
 * Create an ETH-style wallet from mnemonic
 * Uses ETH derivation path but still returns Cosmos-formatted pubkey
 */
export async function createEthWallet(
  mnemonic: string = TEST_MNEMONIC,
  accountIndex: number = 0
) {
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
    prefix: "xion",
    hdPaths: [stringToPath(`m/44'/60'/0'/0/${accountIndex}`)],
  });

  const [account] = await wallet.getAccounts();

  // For ETH wallet, we need to derive the ETH address format
  // This is a simplified version - in production, you'd use keccak256
  const ethAddressLowercase = account.address.toLowerCase();

  return {
    wallet,
    account,
    xionAddress: account.address,
    ethAddress: ethAddressLowercase, // Simplified for testing
    pubkey: Buffer.from(account.pubkey).toString("hex"),
    pubkeyBase64: Buffer.from(account.pubkey).toString("base64"),
  };
}

/**
 * Helper to extract SignerConfig from connector connection result
 * This is needed because ConnectorConnectionResult has authenticatorType in metadata
 * 
 * @throws Error if authenticatorType is missing from metadata
 * 
 * NOTE: This extracts signMessage from connector result, which is already wrapped by ExternalSignerConnector.
 * For use with SignerController, use createRawSignerConfig() instead to avoid double-wrapping.
 */
export function getSignerConfigFromConnectorResult(
  result: Awaited<ReturnType<ExternalSignerConnector["connect"]>>
): SignerConfig {
  const authenticatorType = result.metadata?.authenticatorType;
  if (!authenticatorType) {
    // Provide helpful error message with available metadata keys
    const metadataKeys = result.metadata ? Object.keys(result.metadata).join(", ") : "none";
    throw new Error(
      `authenticatorType not found in connector result metadata. ` +
      `Available metadata keys: ${metadataKeys}. ` +
      `This usually means the connector did not properly set authenticatorType in its connect() method.`
    );
  }
  return {
    authenticatorType: authenticatorType as any, // Type assertion needed due to metadata type
    authenticator: result.authenticator,
    signMessage: result.signMessage,
  };
}

/**
 * Create a getSignerConfig function for Secp256K1 (reusable, matches connector implementation)
 * This is the same logic used in createTestSecp256k1Connector - extracted for reuse
 * Production code pattern: provide getSignerConfig() that returns SignerConfig directly
 */
export function createSecp256k1GetSignerConfig(
  mnemonic: string = TEST_MNEMONIC,
  accountIndex: number = 0
): () => Promise<SignerConfig> {
  // Cache SignerConfig to ensure consistent keypair (same pattern as connector)
  let cachedSignerConfig: SignerConfig | null = null;

  return async (): Promise<SignerConfig> => {
    if (cachedSignerConfig) {
      return cachedSignerConfig;
    }

    // Use DirectSecp256k1HdWallet to get keys and derive pubkey
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix: "xion",
      hdPaths: [stringToPath(`m/44'/118'/0'/0/${accountIndex}`)],
    });

    const [account] = await wallet.getAccounts();

    // Get private key for signing
    const { Slip10, Slip10Curve, stringToPath: pathToArray } = await import("@cosmjs/crypto");
    const { Bip39, EnglishMnemonic } = await import("@cosmjs/crypto");
    const mnemonicObj = new EnglishMnemonic(mnemonic);
    const seed = await Bip39.mnemonicToSeed(mnemonicObj);
    const { privkey } = Slip10.derivePath(Slip10Curve.Secp256k1, seed, pathToArray(`m/44'/118'/0'/0/${accountIndex}`));

    // Compress pubkey to match AA API expectations (33 bytes = 66 hex chars)
    const uncompressedPubkey = account.pubkey;
    const compressedPubkey = Secp256k1.compressPubkey(uncompressedPubkey);
    const pubkeyHex = toHex(compressedPubkey);

    // Convert to base64 for authenticator (matches AA API normalization)
    // The AA API normalizes hex pubkeys to base64, so we must use base64 as the authenticator
    // to ensure the salt calculation matches and the predicted address is correct
    const pubkeyBase64 = Buffer.from(compressedPubkey).toString("base64");

    // Create SignerConfig - same as connector does
    cachedSignerConfig = {
      authenticatorType: AUTHENTICATOR_TYPE.Secp256K1,
      authenticator: pubkeyBase64, // Use base64 (matches AA API normalization)
      async signMessage(hexMessage: string): Promise<string> {
        // DEBUG: Log what we're signing
        console.log("[createSecp256k1GetSignerConfig] DEBUG - Signing message:");
        console.log("  Hex message received:", hexMessage);
        console.log("  Pubkey hex:", pubkeyHex);
        console.log("  Pubkey base64 (authenticator):", pubkeyBase64);
        
        // Validate hex format (consistent with EthWallet)
        if (!hexMessage.startsWith("0x")) {
          throw new Error(
            `Invalid message format: expected hex string with 0x prefix, got: ${hexMessage.substring(0, 50)}...`
          );
        }

        // Remove 0x prefix and convert hex to bytes
        const messageHex = hexMessage.slice(2);
        const messageBytes = Buffer.from(messageHex, "hex");
        
        // DEBUG: Log message bytes
        console.log("[createSecp256k1GetSignerConfig] DEBUG - Message processing:");
        console.log("  Message hex (without 0x):", messageHex);
        console.log("  Message bytes length:", messageBytes.length);
        console.log("  Message bytes (first 20):", Array.from(messageBytes.slice(0, 20)));
        
        // Sign the message (AA API expects signature over sha256(message bytes))
        const digest = new Sha256(messageBytes).digest();
        console.log("[createSecp256k1GetSignerConfig] DEBUG - Digest:");
        console.log("  Digest length:", digest.length);
        console.log("  Digest (first 20):", Array.from(digest.slice(0, 20)));
        
        const signature = await Secp256k1.createSignature(digest, privkey);

        // Return signature as base64 (r + s, 64 bytes)
        // ExternalSignerConnector will format this to hex via formatSecp256k1Signature
        const signatureBytes = new Uint8Array([...signature.r(32), ...signature.s(32)]);
        const signatureBase64 = Buffer.from(signatureBytes).toString("base64");
        
        // DEBUG: Log signature
        console.log("[createSecp256k1GetSignerConfig] DEBUG - Signature:");
        console.log("  Signature bytes length:", signatureBytes.length);
        console.log("  Signature base64:", signatureBase64);
        console.log("  Signature base64 length:", signatureBase64.length);
        
        return signatureBase64;
      },
    };

    return cachedSignerConfig;
  };
}

/**
 * Create a getSignerConfig function for EthWallet (reusable, matches connector implementation)
 * This is the same logic used in createTestEthWalletConnector - extracted for reuse
 */
export function createEthWalletGetSignerConfig(
  mnemonic: string = TEST_MNEMONIC,
  accountIndex: number = 0
): () => Promise<SignerConfig> {
  // Cache SignerConfig to ensure consistent keypair (same pattern as connector)
  let cachedSignerConfig: SignerConfig | null = null;

  return async (): Promise<SignerConfig> => {
    if (cachedSignerConfig) {
      return cachedSignerConfig;
    }

    // Create ethers wallet from mnemonic with ETH derivation path
    const ethWallet = HDNodeWallet.fromPhrase(
      mnemonic,
      undefined,
      `m/44'/60'/0'/0/${accountIndex}`
    );

    const ethAddress = ethWallet.address.toLowerCase();

    // Create SignerConfig - same as connector does
    cachedSignerConfig = {
      authenticatorType: AUTHENTICATOR_TYPE.EthWallet,
      authenticator: ethAddress,
      async signMessage(message: string): Promise<string> {
        // ExternalSignerConnector passes hex-encoded messages (with 0x prefix)
        // Convert hex string to bytes for ethers.signMessage
        // Ethereum's personal_sign: keccak256("\x19Ethereum Signed Message:\n" + len(message) + message)
        // ethers.signMessage does this automatically when given bytes
        let messageBytes: Uint8Array;
        if (message.startsWith("0x")) {
          // Hex format: remove 0x prefix and convert hex to bytes
          const hexWithoutPrefix = message.slice(2);
          messageBytes = Buffer.from(hexWithoutPrefix, "hex");
        } else {
          // Plain text format (backward compatibility): convert UTF-8 string to bytes
          messageBytes = toUtf8Bytes(message);
        }
        const signature = await ethWallet.signMessage(messageBytes);
        return signature; // Returns 0x-prefixed signature (r+s+v format, 132 hex chars)
      },
    };

    return cachedSignerConfig;
  };
}

/**
 * Create a test Secp256K1 connector using the real ExternalSignerConnector architecture
 * This matches how real connectors work (like Turnkey) - providing a SignerConfig
 * instead of manually implementing crypto operations.
 * 
 * This uses the same pattern as useTurnkeyRawAPI - providing a getSignerConfig function
 * that returns a SignerConfig with authenticator and signMessage.
 * 
 * Uses createSecp256k1GetSignerConfig() to reuse the same logic.
 */
export function createTestSecp256k1Connector(
  mnemonic: string = TEST_MNEMONIC,
  accountIndex: number = 0
): ExternalSignerConnector {
  // Reuse the same getSignerConfig logic (no duplication)
  const getSignerConfig = createSecp256k1GetSignerConfig(mnemonic, accountIndex);

  // Use the real ExternalSignerConnector - just like Turnkey does
  return new ExternalSignerConnector({
    id: "test-secp256k1",
    name: "Test Secp256K1 Connector",
    getSignerConfig,
  });
}

/**
 * Create a test EthWallet connector using the real ExternalSignerConnector architecture
 * This matches how real connectors work (like Turnkey) - providing a SignerConfig
 * instead of manually implementing crypto operations.
 * 
 * Uses ethers.js for real Ethereum message signing (personal_sign)
 * Uses createEthWalletGetSignerConfig() to reuse the same logic.
 */
export function createTestEthWalletConnector(
  mnemonic: string = TEST_MNEMONIC,
  accountIndex: number = 0
): ExternalSignerConnector {
  // Reuse the same getSignerConfig logic (no duplication)
  const getSignerConfig = createEthWalletGetSignerConfig(mnemonic, accountIndex);

  // Use the real ExternalSignerConnector - just like Turnkey does
  return new ExternalSignerConnector({
    id: "test-ethwallet",
    name: "Test EthWallet Connector",
    getSignerConfig,
  });
}

// Removed createTestSessionManager - duplicate of createMockSessionManager
// Removed createTestAccountStrategy - unused, tests use real RpcAccountStrategy

/**
 * Simple client class that extends CosmWasmClient with custom account parser
 * This supports XION's /abstractaccount.v1.AbstractAccount type
 * Pattern based on AAClient.getAccount() and GranteeSignerClient.getAccount()
 */
class TestCosmWasmClient extends CosmWasmClient {
  /**
   * Override static create method to return TestCosmWasmClient instance
   * This ensures the custom getAccount() method is used
   */
  public static override async create(
    tmClient: any
  ): Promise<TestCosmWasmClient> {
    return new TestCosmWasmClient(tmClient);
  }

  public async getAccount(searchAddress: string): Promise<Account | null> {
    const account = await this.forceGetQueryClient().auth.account(searchAddress);
    if (!account) {
      return null;
    }
    return customAccountFromAny(account);
  }
}

/**
 * Create a read-only client for reading chain state
 * Uses CosmWasmClient with custom account parser to support XION's AbstractAccount type
 *
 * IMPORTANT: This client supports XION's custom account type (/abstractaccount.v1.AbstractAccount)
 * Regular StargateClient will fail with "Unsupported type" error when calling getAccount()
 *
 * Pattern based on AAClient.getAccount() method which uses customAccountFromAny
 */
export async function createTestStargateClient() {
  const config = getTestConfig();
  const { Tendermint37Client } = await import("@cosmjs/tendermint-rpc");

  // Connect to RPC and create client with custom account parser
  const tmClient = await Tendermint37Client.connect(config.rpcUrl);
  return TestCosmWasmClient.create(tmClient);
}

/**
 * Create a signing client for transactions
 */
export async function createTestSigningClient(
  mnemonic: string = TEST_MNEMONIC,
  accountIndex: number = 0
) {
  const config = getTestConfig();
  const { wallet, address } = await createSecp256k1Wallet(
    mnemonic,
    accountIndex
  );

  const client = await SigningStargateClient.connectWithSigner(
    config.rpcUrl,
    wallet,
    {
      gasPrice: {
        amount: config.gasPrice.replace(/[^\d.]/g, ""),
        denom: config.gasPrice.replace(/[\d.]/g, ""),
      } as any,
    }
  );

  return { client, address, wallet };
}

/**
 * Wait for transaction confirmation on chain
 */
export async function waitForTxConfirmation(
  client: StargateClient,
  txHash: string,
  timeoutMs: number = 30000
): Promise<any> {
  const start = Date.now();
  const pollInterval = 1000; // Poll every second

  while (Date.now() - start < timeoutMs) {
    try {
      const result = await client.getTx(txHash);
      if (result) {
        return result;
      }
    } catch (error) {
      // Transaction not found yet, continue polling
    }

    await sleep(pollInterval);
  }

  throw new Error(
    `Transaction ${txHash} not confirmed within ${timeoutMs}ms`
  );
}

/**
 * Sleep utility for polling and delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Validate Xion address format
 */
export function isValidXionAddress(address: string): boolean {
  return /^xion1[a-z0-9]{38,59}$/.test(address);
}

/**
 * Validate signature format and length
 * Handles both hex and base64 formats
 *
 * Note: ExternalSignerConnector returns hex format (via formatSecp256k1Signature)
 * but raw signer configs return base64 format
 *
 * Uses hex validation utilities from @burnt-labs/signers for consistent validation
 */
export function validateSignature(
  signature: string,
  expectedLength: number
): boolean {
  try {
    let decoded: Uint8Array;

    // Remove 0x prefix if present
    const normalizedSignature = signature.startsWith('0x') ? signature.slice(2) : signature;

    // Check if hex format using utility from @burnt-labs/signers
    if (isValidHex(normalizedSignature)) {
      // Use validated fromHex from @burnt-labs/signers
      decoded = fromHex(normalizedSignature);
    } else {
      // Assume base64 format
      decoded = Buffer.from(signature, "base64");
    }

    return decoded.length === expectedLength;
  } catch {
    return false;
  }
}

/**
 * Create a test transfer message
 */
export function createTestTransferMsg(
  fromAddress: string,
  toAddress: string,
  amount: string = "10000",
  denom: string = "uxion"
): EncodeObject {
  return {
    typeUrl: "/cosmos.bank.v1beta1.MsgSend",
    value: {
      fromAddress,
      toAddress,
      amount: [{ denom, amount }],
    },
  };
}

/**
 * Create a user-map contract execution message
 * This contract allows storing JSON data per user address
 * - Requires NO token balance
 * - Uses session key + treasury grants for gas
 * - Perfect for integration testing
 *
 * @param sender - The smart account address executing the contract
 * @param contractAddress - The user-map contract address
 * @param testIdentifier - Test identifier to store (defaults to timestamp)
 * @returns Contract execution message
 */
export function createUserMapUpdateMsg(
  sender: string,
  contractAddress: string,
  testIdentifier?: string
): EncodeObject {
  const testId = testIdentifier || `test-${Date.now()}`;

  // Create JSON value matching the pattern from use-test-xion-transaction.ts
  const jsonValue = JSON.stringify({
    main: "integration test",
    completed: [testId],
  });

  return {
    typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
    value: {
      sender,
      contract: contractAddress,
      msg: Buffer.from(JSON.stringify({ update: { value: jsonValue } })),
      funds: [],
    },
  };
}

/**
 * Generate multiple test wallets from the same mnemonic
 * Useful for creating sender/receiver pairs
 */
export async function generateTestWalletPair() {
  const sender = await createSecp256k1Wallet(TEST_MNEMONIC, 0);
  const receiver = await createSecp256k1Wallet(TEST_MNEMONIC, 1);

  return { sender, receiver };
}

/**
 * Create a mock storage strategy for testing
 * Matches StorageStrategy interface from abstraxion-core
 * TODO: Once test-utils is added as dependency, use: import { MockStorageStrategy } from "@burnt-labs/test-utils"
 */
export function createMockStorageStrategy(): StorageStrategy {
  const storage = new Map<string, string>();

  return {
    async getItem(key: string): Promise<string | null> {
      return storage.get(key) || null;
    },
    async setItem(key: string, value: string): Promise<void> {
      storage.set(key, value);
    },
    async removeItem(key: string): Promise<void> {
      storage.delete(key);
    },
  };
}

/**
 * Simulate multi-tab storage events
 * Note: In Node.js environment, storage events are not available.
 * This function will only work in browser-like environments.
 */
export function simulateStorageEvent(
  key: string,
  newValue: string | null,
  oldValue: string | null = null
) {
  // Check if we're in a browser-like environment with dispatchEvent
  if (typeof globalThis.dispatchEvent === "function") {
    const event = new StorageEvent("storage", {
      key,
      newValue,
      oldValue,
      storageArea: globalThis.localStorage,
      url: globalThis.location?.href || "http://localhost:3000",
    });

    globalThis.dispatchEvent(event);
  } else {
    // In Node.js, we can't simulate storage events
    // Tests that use this should be skipped or mocked differently
    console.warn(
      "simulateStorageEvent: dispatchEvent not available in Node.js environment. " +
        "Multi-tab storage event tests should be run in a browser environment or mocked."
    );
  }
}

/**
 * Clean up test storage
 */
export function cleanupTestStorage() {
  if (typeof globalThis !== "undefined") {
    if ((globalThis as any).__testStorage) {
      delete (globalThis as any).__testStorage;
    }
  }
}

/**
 * Retry helper with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        const delay = initialDelayMs * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error("Retry failed with unknown error");
}

/**
 * Query account balance
 */
export async function getAccountBalance(
  address: string,
  denom: string = "uxion"
): Promise<string> {
  const client = await createTestStargateClient();
  const balance = await client.getBalance(address, denom);
  return balance.amount;
}

/**
 * Check if treasury contract exists and is accessible
 */
export async function checkTreasuryContract(
  treasuryAddress: string
): Promise<boolean> {
  const client = await createTestStargateClient();
  try {
    const account = await client.getAccount(treasuryAddress);
    return !!account;
  } catch {
    return false;
  }
}

/**
 * Format gas price from string (e.g., "0.001uxion" -> { amount: "0.001", denom: "uxion" })
 */
export function parseGasPrice(gasPrice: string): {
  amount: string;
  denom: string;
} {
  const match = gasPrice.match(/^([\d.]+)([a-z]+)$/);
  if (!match) {
    throw new Error(`Invalid gas price format: ${gasPrice}`);
  }
  return {
    amount: match[1],
    denom: match[2],
  };
}

/**
 * Create a mock SessionManager for testing
 * Implements the full SessionManager interface from @burnt-labs/account-management
 */
export function createMockSessionManager(storageStrategy: ReturnType<typeof createMockStorageStrategy>) {
  // In-memory keypair storage (since we can't serialize/deserialize the wallet easily)
  let sessionKeypair: any = undefined;

  return {
    getSession: async (key: string) => storageStrategy.getItem(key),
    setSession: async (key: string, value: string) => storageStrategy.setItem(key, value),
    removeSession: async (key: string) => storageStrategy.removeItem(key),
    clearSessions: async () => {
      await storageStrategy.removeItem("abstraxion_session");
      await storageStrategy.removeItem("abstraxion_keypair");
      await storageStrategy.removeItem("abstraxion_granter");
      sessionKeypair = undefined; // Clear in-memory keypair
    },

    // SessionManager methods for account-management
    getLocalKeypair: async () => {
      return sessionKeypair;
    },

    generateAndStoreTempAccount: async () => {
      // Create a temporary wallet for testing
      const wallet = await DirectSecp256k1HdWallet.generate(24, {
        prefix: "xion",
      });
      // Store in memory for testing
      sessionKeypair = wallet as any;
      return wallet as any; // Cast to SignArbSecp256k1HdWallet
    },

    getGranter: async () => {
      const granter = await storageStrategy.getItem("abstraxion_granter");
      return granter || undefined;
    },

    setGranter: async (granter: string) => {
      await storageStrategy.setItem("abstraxion_granter", granter);
    },

    authenticate: async () => {
      // Verify grants exist in storage using real checkStorageGrants function
      // This ensures tests catch grant verification issues
      const granter = await storageStrategy.getItem("abstraxion_granter");
      if (!granter) {
        throw new Error("No granter found in storage");
      }
      
      // Use real grant verification function
      const grantCheck = await checkStorageGrants(granter, storageStrategy);
      if (!grantCheck.grantsExist) {
        throw new Error("Grants not found in storage");
      }
      
      // Note: This checks storage grants, not on-chain grants
      // For full on-chain verification, we would need to query the chain
      // but that's expensive for integration tests, so storage check is acceptable
    },

    logout: async () => {
      // Clear all session data
      await storageStrategy.removeItem("abstraxion_session");
      await storageStrategy.removeItem("abstraxion_keypair");
      await storageStrategy.removeItem("abstraxion_granter");
      sessionKeypair = undefined; // Clear in-memory keypair
    },
  };
}

/**
 * Create a SignerController for testing
 * Extracted to shared helper to reduce duplication across test files
 * 
 * @param options - Configuration options
 * @returns Configured SignerController instance
 */
export function createTestSignerController(options: {
  config: ReturnType<typeof getTestConfig>;
  signerAuth?: SignerAuthentication;
  accountStrategy: any; // CompositeAccountStrategy
  sessionManager: SessionManager;
  storageStrategy: StorageStrategy;
  treasuryAddress?: string;
  grantConfig?: { treasury?: string; feeGranter?: string };
  accountIndex?: number; // Optional account index for unique test accounts
}): SignerController {
  const {
    config,
    signerAuth: providedSignerAuth,
    accountStrategy,
    sessionManager,
    storageStrategy,
    treasuryAddress,
    grantConfig,
    accountIndex,
  } = options;

  // Use provided signerAuth or create default one
  // Use the same getSignerConfig function as connectors (no wrapper, matches production pattern)
  const signerAuth: SignerAuthentication = providedSignerAuth || {
    type: "signer",
    aaApiUrl: config.aaApiUrl,
    smartAccountContract: {
      codeId: parseInt(config.codeId, 10),
      checksum: config.checksum,
      addressPrefix: "xion",
    },
    // Use the same getSignerConfig function as createTestSecp256k1Connector
    // This matches production: getSignerConfig() returns SignerConfig directly
    // Pass accountIndex if provided, otherwise use random index to avoid account collisions
    // Range: 1-2 billion (1 billion possibilities, ~1 in a billion collision chance)
    getSignerConfig: createSecp256k1GetSignerConfig(
      TEST_MNEMONIC,
      accountIndex !== undefined ? accountIndex : Math.floor(Math.random() * 1_000_000_000) + 1_000_000_000
    ),
  };

  const controllerConfig: SignerControllerConfig = {
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
    grantConfig: grantConfig
      ? {
          ...grantConfig,
          // Always ensure feeGranter is set from config if not explicitly provided
          feeGranter: grantConfig.feeGranter || config.feeGranter,
        }
      : (treasuryAddress || config.treasuryAddress
        ? {
            treasury: treasuryAddress || config.treasuryAddress,
            feeGranter: config.feeGranter,
          }
        : undefined),
  };

  return new SignerController(controllerConfig);
}
