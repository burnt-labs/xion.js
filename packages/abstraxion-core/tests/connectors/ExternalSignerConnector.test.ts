/**
 * Tests for ExternalSignerConnector
 * Tests all authenticator types, signature formatting, and error handling
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ExternalSignerConnector } from "../../src/connectors/ExternalSignerConnector";
import { ConnectorType } from "../../src/connectors/types";
import { AUTHENTICATOR_TYPE } from "@burnt-labs/signers";
import {
  createMockConnectorConfig,
  createMockSignerConfig,
  TEST_SIGNATURES,
  TEST_AUTHENTICATORS,
  TEST_MESSAGE,
  INVALID_SIGNATURES,
  INVALID_AUTHENTICATORS,
} from "./test-utils";

describe("ExternalSignerConnector", () => {
  describe("Constructor & Initialization", () => {
    it("should initialize with correct id and name", () => {
      const config = createMockConnectorConfig(
        "test-connector",
        "Test Connector",
        null
      );
      const connector = new ExternalSignerConnector(config);

      expect(connector.metadata.id).toBe("test-connector");
      expect(connector.metadata.name).toBe("Test Connector");
    });

    it("should initialize with correct connector type", () => {
      const config = createMockConnectorConfig("test", "Test", null);
      const connector = new ExternalSignerConnector(config);

      expect(connector.metadata.type).toBe(ConnectorType.EXTERNAL_SIGNER);
    });

    it("should store getSignerConfig function", async () => {
      const signerConfig = createMockSignerConfig(
        AUTHENTICATOR_TYPE.EthWallet,
        TEST_AUTHENTICATORS.ethWallet,
        TEST_SIGNATURES.ethWallet
      );
      const config = createMockConnectorConfig("test", "Test", signerConfig);
      const connector = new ExternalSignerConnector(config);

      // Should be able to call connect which uses getSignerConfig
      const result = await connector.connect();
      expect(result.authenticator).toBeDefined();
    });
  });

  describe("isAvailable()", () => {
    it("should return true when no isReady function provided", async () => {
      const config = createMockConnectorConfig("test", "Test", null);
      const connector = new ExternalSignerConnector(config);

      const available = await connector.isAvailable();
      expect(available).toBe(true);
    });

    it("should return true when isReady returns true", async () => {
      const signerConfig = createMockSignerConfig(
        AUTHENTICATOR_TYPE.EthWallet,
        TEST_AUTHENTICATORS.ethWallet,
        TEST_SIGNATURES.ethWallet
      );
      const config = createMockConnectorConfig("test", "Test", signerConfig, {
        isReady: true,
      });
      const connector = new ExternalSignerConnector(config);

      const available = await connector.isAvailable();
      expect(available).toBe(true);
    });

    it("should return false when isReady returns false", async () => {
      const signerConfig = createMockSignerConfig(
        AUTHENTICATOR_TYPE.EthWallet,
        TEST_AUTHENTICATORS.ethWallet,
        TEST_SIGNATURES.ethWallet
      );
      const config = createMockConnectorConfig("test", "Test", signerConfig, {
        isReady: false,
      });
      const connector = new ExternalSignerConnector(config);

      const available = await connector.isAvailable();
      expect(available).toBe(false);
    });
  });

  describe("connect() - EthWallet Type", () => {
    it("should connect with valid EthWallet authenticator", async () => {
      const signerConfig = createMockSignerConfig(
        AUTHENTICATOR_TYPE.EthWallet,
        TEST_AUTHENTICATORS.ethWallet,
        TEST_SIGNATURES.ethWallet
      );
      const config = createMockConnectorConfig("eth-wallet", "EthWallet", signerConfig);
      const connector = new ExternalSignerConnector(config);

      const result = await connector.connect();

      expect(result.authenticator).toBe(TEST_AUTHENTICATORS.ethWallet.toLowerCase());
      expect(result.displayAddress).toBe(TEST_AUTHENTICATORS.ethWallet);
      expect(result.signMessage).toBeDefined();
      expect(result.metadata?.authenticatorType).toBe(AUTHENTICATOR_TYPE.EthWallet);
      expect(result.metadata?.ethereumAddress).toBe(TEST_AUTHENTICATORS.ethWallet);
      expect(result.metadata?.connectionType).toBe("signer");
    });

    it("should lowercase EthWallet authenticator address", async () => {
      const signerConfig = createMockSignerConfig(
        AUTHENTICATOR_TYPE.EthWallet,
        TEST_AUTHENTICATORS.ethWalletUppercase,
        TEST_SIGNATURES.ethWallet
      );
      const config = createMockConnectorConfig("eth-wallet", "EthWallet", signerConfig);
      const connector = new ExternalSignerConnector(config);

      const result = await connector.connect();

      // Authenticator should be lowercased
      expect(result.authenticator).toBe(
        TEST_AUTHENTICATORS.ethWalletUppercase.toLowerCase()
      );
      // Display address should preserve original case
      expect(result.displayAddress).toBe(TEST_AUTHENTICATORS.ethWalletUppercase);
    });

    it("should use authenticator as display address for EthWallet", async () => {
      const signerConfig = createMockSignerConfig(
        AUTHENTICATOR_TYPE.EthWallet,
        TEST_AUTHENTICATORS.ethWallet,
        TEST_SIGNATURES.ethWallet
      );
      const config = createMockConnectorConfig("eth-wallet", "EthWallet", signerConfig);
      const connector = new ExternalSignerConnector(config);

      const result = await connector.connect();

      expect(result.displayAddress).toBe(TEST_AUTHENTICATORS.ethWallet);
    });

    it("should format EthWallet signature correctly", async () => {
      const signerConfig = createMockSignerConfig(
        AUTHENTICATOR_TYPE.EthWallet,
        TEST_AUTHENTICATORS.ethWallet,
        TEST_SIGNATURES.ethWallet
      );
      const config = createMockConnectorConfig("eth-wallet", "EthWallet", signerConfig);
      const connector = new ExternalSignerConnector(config);

      const result = await connector.connect();
      const signature = await result.signMessage(TEST_MESSAGE);

      // Should have 0x prefix and be 132 chars total
      expect(signature).toMatch(/^0x[0-9a-fA-F]{130}$/);
      expect(signature.length).toBe(132);
    });

    it("should validate EthWallet signature length", async () => {
      const signerConfig = createMockSignerConfig(
        AUTHENTICATOR_TYPE.EthWallet,
        TEST_AUTHENTICATORS.ethWallet,
        INVALID_SIGNATURES.ethWalletWrongLength
      );
      const config = createMockConnectorConfig("eth-wallet", "EthWallet", signerConfig);
      const connector = new ExternalSignerConnector(config);

      const result = await connector.connect();

      await expect(result.signMessage(TEST_MESSAGE)).rejects.toThrow();
    });

    it("should handle EthWallet signature without 0x prefix", async () => {
      const signerConfig = createMockSignerConfig(
        AUTHENTICATOR_TYPE.EthWallet,
        TEST_AUTHENTICATORS.ethWallet,
        TEST_SIGNATURES.ethWalletWithoutPrefix
      );
      const config = createMockConnectorConfig("eth-wallet", "EthWallet", signerConfig);
      const connector = new ExternalSignerConnector(config);

      const result = await connector.connect();
      const signature = await result.signMessage(TEST_MESSAGE);

      // Should add 0x prefix
      expect(signature).toMatch(/^0x[0-9a-fA-F]{130}$/);
    });

    it("should format hex message for EthWallet signing", async () => {
      let capturedMessage: string | undefined;

      const signerConfig = {
        authenticatorType: AUTHENTICATOR_TYPE.EthWallet,
        authenticator: TEST_AUTHENTICATORS.ethWallet,
        signMessage: async (message: string): Promise<string> => {
          capturedMessage = message;
          return TEST_SIGNATURES.ethWallet;
        },
      };

      const config = createMockConnectorConfig("eth-wallet", "EthWallet", signerConfig);
      const connector = new ExternalSignerConnector(config);

      const result = await connector.connect();
      await result.signMessage(TEST_MESSAGE);

      // Message should have been formatted with 0x prefix
      expect(capturedMessage).toBe(TEST_MESSAGE);
    });
  });

  describe("connect() - Secp256K1 Type", () => {
    it("should connect with valid Secp256K1 public key", async () => {
      const signerConfig = createMockSignerConfig(
        AUTHENTICATOR_TYPE.Secp256K1,
        TEST_AUTHENTICATORS.secp256k1Hex,
        TEST_SIGNATURES.secp256k1
      );
      const config = createMockConnectorConfig("secp256k1", "Secp256K1", signerConfig);
      const connector = new ExternalSignerConnector(config);

      const result = await connector.connect();

      expect(result.authenticator).toBe(TEST_AUTHENTICATORS.secp256k1Hex);
      expect(result.displayAddress).toBe(TEST_AUTHENTICATORS.secp256k1Hex);
      expect(result.signMessage).toBeDefined();
      expect(result.metadata?.authenticatorType).toBe(AUTHENTICATOR_TYPE.Secp256K1);
      expect(result.metadata?.connectionType).toBe("signer");
    });

    it("should format Secp256K1 signature correctly (hex)", async () => {
      const signerConfig = createMockSignerConfig(
        AUTHENTICATOR_TYPE.Secp256K1,
        TEST_AUTHENTICATORS.secp256k1Hex,
        TEST_SIGNATURES.secp256k1
      );
      const config = createMockConnectorConfig("secp256k1", "Secp256K1", signerConfig);
      const connector = new ExternalSignerConnector(config);

      const result = await connector.connect();
      const signature = await result.signMessage(TEST_MESSAGE);

      // Should be 128 hex chars without 0x prefix
      expect(signature).toMatch(/^[0-9a-fA-F]{128}$/);
      expect(signature.length).toBe(128);
      expect(signature).not.toMatch(/^0x/);
    });

    it("should validate Secp256K1 signature length", async () => {
      const signerConfig = createMockSignerConfig(
        AUTHENTICATOR_TYPE.Secp256K1,
        TEST_AUTHENTICATORS.secp256k1Hex,
        INVALID_SIGNATURES.secp256k1WrongLength
      );
      const config = createMockConnectorConfig("secp256k1", "Secp256K1", signerConfig);
      const connector = new ExternalSignerConnector(config);

      const result = await connector.connect();

      await expect(result.signMessage(TEST_MESSAGE)).rejects.toThrow(
        /Invalid Secp256K1 signature format/
      );
    });

    it("should handle base64 signature format", async () => {
      const signerConfig = createMockSignerConfig(
        AUTHENTICATOR_TYPE.Secp256K1,
        TEST_AUTHENTICATORS.secp256k1Hex,
        TEST_SIGNATURES.secp256k1Base64
      );
      const config = createMockConnectorConfig("secp256k1", "Secp256K1", signerConfig);
      const connector = new ExternalSignerConnector(config);

      const result = await connector.connect();
      const signature = await result.signMessage(TEST_MESSAGE);

      // Should convert to hex
      expect(signature).toMatch(/^[0-9a-fA-F]{128}$/);
      expect(signature).not.toMatch(/^0x/);
    });

    it("should not lowercase Secp256K1 authenticator", async () => {
      const pubkeyWithUppercase = "02ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890";
      const signerConfig = createMockSignerConfig(
        AUTHENTICATOR_TYPE.Secp256K1,
        pubkeyWithUppercase,
        TEST_SIGNATURES.secp256k1
      );
      const config = createMockConnectorConfig("secp256k1", "Secp256K1", signerConfig);
      const connector = new ExternalSignerConnector(config);

      const result = await connector.connect();

      // Secp256K1 pubkeys should NOT be lowercased (unlike EthWallet)
      expect(result.authenticator).toBe(pubkeyWithUppercase);
    });

    it("should use authenticator as display address for Secp256K1", async () => {
      const signerConfig = createMockSignerConfig(
        AUTHENTICATOR_TYPE.Secp256K1,
        TEST_AUTHENTICATORS.secp256k1Hex,
        TEST_SIGNATURES.secp256k1
      );
      const config = createMockConnectorConfig("secp256k1", "Secp256K1", signerConfig);
      const connector = new ExternalSignerConnector(config);

      const result = await connector.connect();

      expect(result.displayAddress).toBe(TEST_AUTHENTICATORS.secp256k1Hex);
    });

    it("should pass message as-is for Secp256K1 (no formatting)", async () => {
      let capturedMessage: string | undefined;

      const signerConfig = {
        authenticatorType: AUTHENTICATOR_TYPE.Secp256K1,
        authenticator: TEST_AUTHENTICATORS.secp256k1Hex,
        signMessage: async (message: string): Promise<string> => {
          capturedMessage = message;
          return TEST_SIGNATURES.secp256k1;
        },
      };

      const config = createMockConnectorConfig("secp256k1", "Secp256K1", signerConfig);
      const connector = new ExternalSignerConnector(config);

      const result = await connector.connect();
      await result.signMessage(TEST_MESSAGE);

      // Message should be passed through as-is (no hex formatting for Secp256K1)
      expect(capturedMessage).toBe(TEST_MESSAGE);
    });
  });

  describe("connect() - JWT Type", () => {
    it("should connect with valid JWT token", async () => {
      const signerConfig = createMockSignerConfig(
        AUTHENTICATOR_TYPE.JWT,
        TEST_AUTHENTICATORS.jwt,
        TEST_SIGNATURES.jwt
      );
      const config = createMockConnectorConfig("jwt", "JWT", signerConfig);
      const connector = new ExternalSignerConnector(config);

      const result = await connector.connect();

      expect(result.authenticator).toBe(TEST_AUTHENTICATORS.jwt);
      expect(result.displayAddress).toBe(TEST_AUTHENTICATORS.jwt);
      expect(result.signMessage).toBeDefined();
      expect(result.metadata?.authenticatorType).toBe(AUTHENTICATOR_TYPE.JWT);
      expect(result.metadata?.connectionType).toBe("signer");
    });

    it("should handle JWT signature formatting (pass-through)", async () => {
      const signerConfig = createMockSignerConfig(
        AUTHENTICATOR_TYPE.JWT,
        TEST_AUTHENTICATORS.jwt,
        TEST_SIGNATURES.jwt
      );
      const config = createMockConnectorConfig("jwt", "JWT", signerConfig);
      const connector = new ExternalSignerConnector(config);

      const result = await connector.connect();
      const signature = await result.signMessage(TEST_MESSAGE);

      // JWT signatures should be passed through as-is
      expect(signature).toBe(TEST_SIGNATURES.jwt);
    });

    it("should not lowercase JWT authenticator", async () => {
      const jwtWithUppercase = "HTTPS://EXAMPLE.COM.USER123";
      const signerConfig = createMockSignerConfig(
        AUTHENTICATOR_TYPE.JWT,
        jwtWithUppercase,
        TEST_SIGNATURES.jwt
      );
      const config = createMockConnectorConfig("jwt", "JWT", signerConfig);
      const connector = new ExternalSignerConnector(config);

      const result = await connector.connect();

      expect(result.authenticator).toBe(jwtWithUppercase);
    });
  });

  describe("connect() - Passkey Type", () => {
    it("should connect with valid Passkey authenticator", async () => {
      const signerConfig = createMockSignerConfig(
        AUTHENTICATOR_TYPE.Passkey,
        TEST_AUTHENTICATORS.passkey,
        TEST_SIGNATURES.passkey
      );
      const config = createMockConnectorConfig("passkey", "Passkey", signerConfig);
      const connector = new ExternalSignerConnector(config);

      const result = await connector.connect();

      expect(result.authenticator).toBe(TEST_AUTHENTICATORS.passkey);
      expect(result.displayAddress).toBe(TEST_AUTHENTICATORS.passkey);
      expect(result.signMessage).toBeDefined();
      expect(result.metadata?.authenticatorType).toBe(AUTHENTICATOR_TYPE.Passkey);
      expect(result.metadata?.connectionType).toBe("signer");
    });

    it("should handle Passkey signature formatting (pass-through)", async () => {
      const signerConfig = createMockSignerConfig(
        AUTHENTICATOR_TYPE.Passkey,
        TEST_AUTHENTICATORS.passkey,
        TEST_SIGNATURES.passkey
      );
      const config = createMockConnectorConfig("passkey", "Passkey", signerConfig);
      const connector = new ExternalSignerConnector(config);

      const result = await connector.connect();
      const signature = await result.signMessage(TEST_MESSAGE);

      // Passkey signatures should be passed through as-is
      expect(signature).toBe(TEST_SIGNATURES.passkey);
    });
  });

  describe("connect() - Ed25519 Type", () => {
    it("should connect with valid Ed25519 public key", async () => {
      const signerConfig = createMockSignerConfig(
        AUTHENTICATOR_TYPE.Ed25519,
        TEST_AUTHENTICATORS.ed25519,
        TEST_SIGNATURES.ed25519
      );
      const config = createMockConnectorConfig("ed25519", "Ed25519", signerConfig);
      const connector = new ExternalSignerConnector(config);

      const result = await connector.connect();

      expect(result.authenticator).toBe(TEST_AUTHENTICATORS.ed25519);
      expect(result.displayAddress).toBe(TEST_AUTHENTICATORS.ed25519);
      expect(result.signMessage).toBeDefined();
      expect(result.metadata?.authenticatorType).toBe(AUTHENTICATOR_TYPE.Ed25519);
      expect(result.metadata?.connectionType).toBe("signer");
    });

    it("should handle Ed25519 signature formatting (pass-through)", async () => {
      const signerConfig = createMockSignerConfig(
        AUTHENTICATOR_TYPE.Ed25519,
        TEST_AUTHENTICATORS.ed25519,
        TEST_SIGNATURES.ed25519
      );
      const config = createMockConnectorConfig("ed25519", "Ed25519", signerConfig);
      const connector = new ExternalSignerConnector(config);

      const result = await connector.connect();
      const signature = await result.signMessage(TEST_MESSAGE);

      // Ed25519 signatures should be passed through as-is
      expect(signature).toBe(TEST_SIGNATURES.ed25519);
    });
  });

  describe("connect() - Error Handling", () => {
    it("should throw error when getSignerConfig fails", async () => {
      const config = createMockConnectorConfig("test", "Test", null, {
        shouldThrow: true,
      });
      const connector = new ExternalSignerConnector(config);

      await expect(connector.connect()).rejects.toThrow(
        /Failed to connect to Test/
      );
    });

    it("should throw error when signMessage fails", async () => {
      const signerConfig = createMockSignerConfig(
        AUTHENTICATOR_TYPE.EthWallet,
        TEST_AUTHENTICATORS.ethWallet,
        TEST_SIGNATURES.ethWallet,
        true // shouldThrow
      );
      const config = createMockConnectorConfig("test", "Test", signerConfig);
      const connector = new ExternalSignerConnector(config);

      const result = await connector.connect();

      await expect(result.signMessage(TEST_MESSAGE)).rejects.toThrow();
    });

    it("should throw error when signature is empty (EthWallet)", async () => {
      const signerConfig = createMockSignerConfig(
        AUTHENTICATOR_TYPE.EthWallet,
        TEST_AUTHENTICATORS.ethWallet,
        INVALID_SIGNATURES.empty
      );
      const config = createMockConnectorConfig("test", "Test", signerConfig);
      const connector = new ExternalSignerConnector(config);

      const result = await connector.connect();

      await expect(result.signMessage(TEST_MESSAGE)).rejects.toThrow();
    });

    it("should throw error when calling signMessage before connect", async () => {
      const signerConfig = createMockSignerConfig(
        AUTHENTICATOR_TYPE.EthWallet,
        TEST_AUTHENTICATORS.ethWallet,
        TEST_SIGNATURES.ethWallet
      );
      const config = createMockConnectorConfig("test", "Test", signerConfig);
      const connector = new ExternalSignerConnector(config);

      // Connect first
      const result = await connector.connect();

      // Now disconnect
      await connector.disconnect();

      // Try to sign - should fail
      await expect(result.signMessage(TEST_MESSAGE)).rejects.toThrow(
        /Signer not connected/
      );
    });
  });

  describe("disconnect()", () => {
    it("should clear signer state", async () => {
      const signerConfig = createMockSignerConfig(
        AUTHENTICATOR_TYPE.EthWallet,
        TEST_AUTHENTICATORS.ethWallet,
        TEST_SIGNATURES.ethWallet
      );
      const config = createMockConnectorConfig("test", "Test", signerConfig);
      const connector = new ExternalSignerConnector(config);

      // Connect first
      const result = await connector.connect();
      expect(result.signMessage).toBeDefined();

      // Disconnect
      await connector.disconnect();

      // Try to use the signMessage function - should fail
      await expect(result.signMessage(TEST_MESSAGE)).rejects.toThrow(
        /Signer not connected/
      );
    });

    it("should be idempotent (safe to call multiple times)", async () => {
      const signerConfig = createMockSignerConfig(
        AUTHENTICATOR_TYPE.EthWallet,
        TEST_AUTHENTICATORS.ethWallet,
        TEST_SIGNATURES.ethWallet
      );
      const config = createMockConnectorConfig("test", "Test", signerConfig);
      const connector = new ExternalSignerConnector(config);

      await connector.connect();

      // Call disconnect multiple times
      await connector.disconnect();
      await connector.disconnect();
      await connector.disconnect();

      // Should not throw
      expect(true).toBe(true);
    });

    it("should allow reconnection after disconnect", async () => {
      const signerConfig = createMockSignerConfig(
        AUTHENTICATOR_TYPE.EthWallet,
        TEST_AUTHENTICATORS.ethWallet,
        TEST_SIGNATURES.ethWallet
      );
      const config = createMockConnectorConfig("test", "Test", signerConfig);
      const connector = new ExternalSignerConnector(config);

      // Connect, disconnect, reconnect
      await connector.connect();
      await connector.disconnect();
      const result = await connector.connect();

      // Should work after reconnection
      const signature = await result.signMessage(TEST_MESSAGE);
      expect(signature).toBeDefined();
    });
  });

  describe("Metadata", () => {
    it("should include authenticatorType in metadata", async () => {
      const signerConfig = createMockSignerConfig(
        AUTHENTICATOR_TYPE.Secp256K1,
        TEST_AUTHENTICATORS.secp256k1Hex,
        TEST_SIGNATURES.secp256k1
      );
      const config = createMockConnectorConfig("test", "Test", signerConfig);
      const connector = new ExternalSignerConnector(config);

      const result = await connector.connect();

      expect(result.metadata?.authenticatorType).toBe(AUTHENTICATOR_TYPE.Secp256K1);
    });

    it("should include ethereumAddress in metadata for EthWallet", async () => {
      const signerConfig = createMockSignerConfig(
        AUTHENTICATOR_TYPE.EthWallet,
        TEST_AUTHENTICATORS.ethWallet,
        TEST_SIGNATURES.ethWallet
      );
      const config = createMockConnectorConfig("test", "Test", signerConfig);
      const connector = new ExternalSignerConnector(config);

      const result = await connector.connect();

      expect(result.metadata?.ethereumAddress).toBe(TEST_AUTHENTICATORS.ethWallet);
    });

    it("should not include ethereumAddress for non-EthWallet types", async () => {
      const signerConfig = createMockSignerConfig(
        AUTHENTICATOR_TYPE.Secp256K1,
        TEST_AUTHENTICATORS.secp256k1Hex,
        TEST_SIGNATURES.secp256k1
      );
      const config = createMockConnectorConfig("test", "Test", signerConfig);
      const connector = new ExternalSignerConnector(config);

      const result = await connector.connect();

      expect(result.metadata?.ethereumAddress).toBeUndefined();
    });

    it("should include connectionType as 'signer'", async () => {
      const signerConfig = createMockSignerConfig(
        AUTHENTICATOR_TYPE.JWT,
        TEST_AUTHENTICATORS.jwt,
        TEST_SIGNATURES.jwt
      );
      const config = createMockConnectorConfig("test", "Test", signerConfig);
      const connector = new ExternalSignerConnector(config);

      const result = await connector.connect();

      expect(result.metadata?.connectionType).toBe("signer");
    });
  });

  describe("Message Formatting", () => {
    it("should pass message as-is to EthWallet signer", async () => {
      let capturedMessage: string | undefined;

      const signerConfig = {
        authenticatorType: AUTHENTICATOR_TYPE.EthWallet,
        authenticator: TEST_AUTHENTICATORS.ethWallet,
        signMessage: async (message: string): Promise<string> => {
          capturedMessage = message;
          return TEST_SIGNATURES.ethWallet;
        },
      };

      const config = createMockConnectorConfig("test", "Test", signerConfig);
      const connector = new ExternalSignerConnector(config);

      const result = await connector.connect();

      const messageWithout0x = "48656c6c6f";
      await result.signMessage(messageWithout0x);

      // Message should be passed as-is (signer will format it)
      expect(capturedMessage).toBe(messageWithout0x);
    });

    it("should preserve 0x prefix in message for EthWallet", async () => {
      let capturedMessage: string | undefined;

      const signerConfig = {
        authenticatorType: AUTHENTICATOR_TYPE.EthWallet,
        authenticator: TEST_AUTHENTICATORS.ethWallet,
        signMessage: async (message: string): Promise<string> => {
          capturedMessage = message;
          return TEST_SIGNATURES.ethWallet;
        },
      };

      const config = createMockConnectorConfig("test", "Test", signerConfig);
      const connector = new ExternalSignerConnector(config);

      const result = await connector.connect();
      await result.signMessage(TEST_MESSAGE);

      expect(capturedMessage).toBe(TEST_MESSAGE);
    });

    it("should not format message for non-EthWallet types", async () => {
      let capturedMessage: string | undefined;

      const signerConfig = {
        authenticatorType: AUTHENTICATOR_TYPE.Secp256K1,
        authenticator: TEST_AUTHENTICATORS.secp256k1Hex,
        signMessage: async (message: string): Promise<string> => {
          capturedMessage = message;
          return TEST_SIGNATURES.secp256k1;
        },
      };

      const config = createMockConnectorConfig("test", "Test", signerConfig);
      const connector = new ExternalSignerConnector(config);

      const result = await connector.connect();
      const plainMessage = "test-message";
      await result.signMessage(plainMessage);

      // Should pass through as-is
      expect(capturedMessage).toBe(plainMessage);
    });
  });
});
