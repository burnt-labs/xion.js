/**
 * Test utilities for connector tests
 * Provides mock helpers, test constants, and factory functions
 */

import { AUTHENTICATOR_TYPE } from "@burnt-labs/signers";
import type { SignerConfig, Connector } from "../../src/connectors/types";
import { ConnectorType } from "../../src/connectors/types";
import type { ExternalSignerConnectorConfig } from "../../src/connectors/ExternalSignerConnector";

/**
 * Valid test signatures for different authenticator types
 * These match the expected format for each type
 */
export const TEST_SIGNATURES = {
  // EthWallet: 65 bytes (r=32, s=32, v=1) as hex with 0x prefix (132 chars total)
  ethWallet: "0x" + "a".repeat(128) + "1b", // 0x + 128 hex + 2 hex (v byte)
  ethWalletWithoutPrefix: "a".repeat(128) + "1b",

  // Secp256K1: 64 bytes as hex without 0x prefix (128 chars)
  secp256k1: "b".repeat(128), // 128 hex chars = 64 bytes
  secp256k1Base64:
    "u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7uw==", // 64 bytes in base64

  // JWT: Just a simple JWT string (format varies)
  jwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature",

  // Passkey: WebAuthn signature (simplified for testing)
  passkey: "passkey-signature-data-base64",

  // Ed25519: 64 bytes signature
  ed25519: "c".repeat(128), // 128 hex chars = 64 bytes
};

/**
 * Valid test authenticators for different types
 */
export const TEST_AUTHENTICATORS = {
  // EthWallet: Ethereum address with 0x prefix
  ethWallet: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
  ethWalletUppercase: "0x742D35CC6634C0532925A3B844BC9E7595F0BEB0",

  // Secp256K1: Compressed public key (33 bytes = 66 hex chars)
  secp256k1Hex: "02" + "1234567890abcdef".repeat(4), // 66 hex chars
  secp256k1Base64: "AhI0VniQq83vEjRWeJCrze8SNFd4kKvN7xI0V3iQq83v", // 33 bytes base64

  // JWT: Token identifier (aud.sub format or full JWT)
  jwt: "https://example.com.user123",
  jwtFull:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature",

  // Passkey: Credential ID (base64)
  passkey: "passkey-credential-id-base64",

  // Ed25519: Public key (32 bytes = 64 hex chars)
  ed25519: "d".repeat(64),
};

/**
 * Create a mock SignerConfig for testing
 */
export function createMockSignerConfig(
  authenticatorType: string,
  authenticator: string,
  signatureResult: string,
  shouldThrow: boolean = false,
): SignerConfig {
  return {
    authenticatorType: authenticatorType as any,
    authenticator,
    signMessage: async (message: string): Promise<string> => {
      if (shouldThrow) {
        throw new Error("Mock signing failed");
      }
      return signatureResult;
    },
  };
}

/**
 * Create a mock ExternalSignerConnectorConfig for testing
 */
export function createMockConnectorConfig(
  id: string,
  name: string,
  signerConfig: SignerConfig | null,
  options?: {
    shouldThrow?: boolean;
    isReady?: boolean;
  },
): ExternalSignerConnectorConfig {
  return {
    id,
    name,
    getSignerConfig: async (): Promise<SignerConfig> => {
      if (options?.shouldThrow) {
        throw new Error("Failed to get signer config");
      }
      if (!signerConfig) {
        throw new Error("Signer config is null");
      }
      return signerConfig;
    },
    isReady:
      options?.isReady !== undefined ? async () => options.isReady! : undefined,
  };
}

/**
 * Create a simple mock connector for registry testing
 * This doesn't need to be fully functional, just implement the interface
 */
export function createSimpleMockConnector(
  id: string,
  name: string,
  type: ConnectorType = ConnectorType.EXTERNAL_SIGNER,
  isAvailable: boolean = true,
): Connector {
  return {
    metadata: {
      id,
      name,
      type,
    },
    async isAvailable() {
      return isAvailable;
    },
    async connect() {
      return {
        authenticator: `mock-authenticator-${id}`,
        displayAddress: `mock-display-${id}`,
        signMessage: async (message: string) => "mock-signature",
      };
    },
    async disconnect() {},
  };
}

/**
 * Helper to create invalid signatures for error testing
 */
export const INVALID_SIGNATURES = {
  empty: "",
  tooShort: "0x1234",
  tooLong: "0x" + "f".repeat(200),
  invalidHex: "0xZZZZ",
  ethWalletWrongLength: "0x" + "a".repeat(100), // Not 130 hex chars
  secp256k1WrongLength: "b".repeat(100), // Not 128 hex chars
};

/**
 * Helper to create invalid authenticators for error testing
 */
export const INVALID_AUTHENTICATORS = {
  empty: "",
  malformedEthAddress: "0xinvalid",
  invalidHex: "0xZZZZ",
};

/**
 * Mock message for testing
 */
export const TEST_MESSAGE = "0x48656c6c6f20576f726c64"; // "Hello World" in hex with 0x prefix
export const TEST_MESSAGE_PLAIN = "Hello World";
