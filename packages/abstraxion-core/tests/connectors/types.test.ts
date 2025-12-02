/**
 * Tests for connector types
 * Validates type interfaces and enums at runtime
 */

import { describe, it, expect } from "vitest";
import { ConnectorType } from "../../src/connectors/types";
import type { Connector, ConnectorMetadata, SignerConfig, ConnectorConnectionResult } from "../../src/connectors/types";
import { AUTHENTICATOR_TYPE } from "@burnt-labs/signers";
import { TEST_AUTHENTICATORS, TEST_SIGNATURES } from "./test-utils";

describe("Connector Types", () => {
  describe("ConnectorType Enum", () => {
    it("should have COSMOS_WALLET type", () => {
      expect(ConnectorType.COSMOS_WALLET).toBe("cosmos-wallet");
    });

    it("should have ETHEREUM_WALLET type", () => {
      expect(ConnectorType.ETHEREUM_WALLET).toBe("ethereum-wallet");
    });

    it("should have EXTERNAL_SIGNER type", () => {
      expect(ConnectorType.EXTERNAL_SIGNER).toBe("external-signer");
    });

    it("should have exactly 3 types", () => {
      const types = Object.values(ConnectorType);
      expect(types).toHaveLength(3);
    });
  });

  describe("ConnectorMetadata Interface", () => {
    it("should enforce required properties", () => {
      const metadata: ConnectorMetadata = {
        id: "test-connector",
        name: "Test Connector",
        type: ConnectorType.EXTERNAL_SIGNER,
      };

      expect(metadata.id).toBe("test-connector");
      expect(metadata.name).toBe("Test Connector");
      expect(metadata.type).toBe(ConnectorType.EXTERNAL_SIGNER);
    });

    it("should allow optional icon property", () => {
      const metadata: ConnectorMetadata = {
        id: "test",
        name: "Test",
        type: ConnectorType.EXTERNAL_SIGNER,
        icon: "https://example.com/icon.png",
      };

      expect(metadata.icon).toBe("https://example.com/icon.png");
    });

    it("should accept all ConnectorType values", () => {
      const metadatas: ConnectorMetadata[] = [
        { id: "1", name: "Cosmos", type: ConnectorType.COSMOS_WALLET },
        { id: "2", name: "Ethereum", type: ConnectorType.ETHEREUM_WALLET },
        { id: "3", name: "External", type: ConnectorType.EXTERNAL_SIGNER },
      ];

      expect(metadatas).toHaveLength(3);
      expect(metadatas[0].type).toBe(ConnectorType.COSMOS_WALLET);
      expect(metadatas[1].type).toBe(ConnectorType.ETHEREUM_WALLET);
      expect(metadatas[2].type).toBe(ConnectorType.EXTERNAL_SIGNER);
    });
  });

  describe("SignerConfig Interface", () => {
    it("should support all authenticator types", () => {
      const configs: SignerConfig[] = [
        {
          authenticatorType: AUTHENTICATOR_TYPE.EthWallet,
          authenticator: TEST_AUTHENTICATORS.ethWallet,
          signMessage: async (msg: string) => TEST_SIGNATURES.ethWallet,
        },
        {
          authenticatorType: AUTHENTICATOR_TYPE.Secp256K1,
          authenticator: TEST_AUTHENTICATORS.secp256k1Hex,
          signMessage: async (msg: string) => TEST_SIGNATURES.secp256k1,
        },
        {
          authenticatorType: AUTHENTICATOR_TYPE.JWT,
          authenticator: TEST_AUTHENTICATORS.jwt,
          signMessage: async (msg: string) => TEST_SIGNATURES.jwt,
        },
        {
          authenticatorType: AUTHENTICATOR_TYPE.Passkey,
          authenticator: TEST_AUTHENTICATORS.passkey,
          signMessage: async (msg: string) => TEST_SIGNATURES.passkey,
        },
        {
          authenticatorType: AUTHENTICATOR_TYPE.Ed25519,
          authenticator: TEST_AUTHENTICATORS.ed25519,
          signMessage: async (msg: string) => TEST_SIGNATURES.ed25519,
        },
      ];

      expect(configs).toHaveLength(5);
      expect(configs[0].authenticatorType).toBe(AUTHENTICATOR_TYPE.EthWallet);
      expect(configs[1].authenticatorType).toBe(AUTHENTICATOR_TYPE.Secp256K1);
      expect(configs[2].authenticatorType).toBe(AUTHENTICATOR_TYPE.JWT);
      expect(configs[3].authenticatorType).toBe(AUTHENTICATOR_TYPE.Passkey);
      expect(configs[4].authenticatorType).toBe(AUTHENTICATOR_TYPE.Ed25519);
    });

    it("should enforce authenticator string requirement", () => {
      const config: SignerConfig = {
        authenticatorType: AUTHENTICATOR_TYPE.EthWallet,
        authenticator: "0x1234567890123456789012345678901234567890",
        signMessage: async (msg: string) => "signature",
      };

      expect(typeof config.authenticator).toBe("string");
      expect(config.authenticator.length).toBeGreaterThan(0);
    });

    it("should enforce signMessage function signature", async () => {
      const config: SignerConfig = {
        authenticatorType: AUTHENTICATOR_TYPE.EthWallet,
        authenticator: TEST_AUTHENTICATORS.ethWallet,
        signMessage: async (message: string): Promise<string> => {
          expect(typeof message).toBe("string");
          return TEST_SIGNATURES.ethWallet;
        },
      };

      const result = await config.signMessage("test-message");
      expect(typeof result).toBe("string");
    });
  });

  describe("ConnectorConnectionResult Interface", () => {
    it("should enforce required properties", () => {
      const result: ConnectorConnectionResult = {
        authenticator: TEST_AUTHENTICATORS.ethWallet.toLowerCase(),
        signMessage: async (msg: string) => TEST_SIGNATURES.ethWallet,
      };

      expect(result.authenticator).toBeDefined();
      expect(result.signMessage).toBeDefined();
      expect(typeof result.signMessage).toBe("function");
    });

    it("should allow optional displayAddress", () => {
      const result: ConnectorConnectionResult = {
        authenticator: TEST_AUTHENTICATORS.ethWallet.toLowerCase(),
        displayAddress: TEST_AUTHENTICATORS.ethWallet,
        signMessage: async (msg: string) => TEST_SIGNATURES.ethWallet,
      };

      expect(result.displayAddress).toBe(TEST_AUTHENTICATORS.ethWallet);
    });

    it("should allow optional metadata", () => {
      const result: ConnectorConnectionResult = {
        authenticator: TEST_AUTHENTICATORS.ethWallet.toLowerCase(),
        signMessage: async (msg: string) => TEST_SIGNATURES.ethWallet,
        metadata: {
          authenticatorType: AUTHENTICATOR_TYPE.EthWallet,
          ethereumAddress: TEST_AUTHENTICATORS.ethWallet,
          connectionType: "signer",
        },
      };

      expect(result.metadata?.authenticatorType).toBe(AUTHENTICATOR_TYPE.EthWallet);
      expect(result.metadata?.ethereumAddress).toBe(TEST_AUTHENTICATORS.ethWallet);
      expect(result.metadata?.connectionType).toBe("signer");
    });

    it("should support all legacy connectionType values", () => {
      const connectionTypes: Array<"metamask" | "shuttle" | "okx" | "signer"> = [
        "metamask",
        "shuttle",
        "okx",
        "signer",
      ];

      connectionTypes.forEach((connectionType) => {
        const result: ConnectorConnectionResult = {
          authenticator: "test",
          signMessage: async () => "sig",
          metadata: { connectionType },
        };

        expect(result.metadata?.connectionType).toBe(connectionType);
      });
    });

    it("should support authenticatorIndex in metadata", () => {
      const result: ConnectorConnectionResult = {
        authenticator: "test",
        signMessage: async () => "sig",
        metadata: {
          authenticatorIndex: 0,
        },
      };

      expect(result.metadata?.authenticatorIndex).toBe(0);
    });

    it("should support codeId in metadata", () => {
      const result: ConnectorConnectionResult = {
        authenticator: "test",
        signMessage: async () => "sig",
        metadata: {
          codeId: 123,
        },
      };

      expect(result.metadata?.codeId).toBe(123);
    });
  });

  describe("Connector Interface", () => {
    it("should enforce required properties and methods", () => {
      const connector: Connector = {
        metadata: {
          id: "test-connector",
          name: "Test Connector",
          type: ConnectorType.EXTERNAL_SIGNER,
        },
        async isAvailable() {
          return true;
        },
        async connect(chainId?: string) {
          return {
            authenticator: "test-authenticator",
            signMessage: async (msg: string) => "signature",
          };
        },
        async disconnect() {},
      };

      expect(connector.metadata).toBeDefined();
      expect(connector.isAvailable).toBeDefined();
      expect(connector.connect).toBeDefined();
      expect(connector.disconnect).toBeDefined();
    });

    it("should support optional chainId parameter in connect", async () => {
      const connector: Connector = {
        metadata: {
          id: "test",
          name: "Test",
          type: ConnectorType.COSMOS_WALLET,
        },
        async isAvailable() {
          return true;
        },
        async connect(chainId?: string) {
          return {
            authenticator: chainId ? `auth-${chainId}` : "auth-default",
            signMessage: async (msg: string) => "sig",
          };
        },
        async disconnect() {},
      };

      // Test with chainId
      const resultWithChainId = await connector.connect("xion-testnet-1");
      expect(resultWithChainId.authenticator).toBe("auth-xion-testnet-1");

      // Test without chainId
      const resultWithoutChainId = await connector.connect();
      expect(resultWithoutChainId.authenticator).toBe("auth-default");
    });

    it("should return boolean from isAvailable", async () => {
      const connectorAvailable: Connector = {
        metadata: { id: "1", name: "Available", type: ConnectorType.EXTERNAL_SIGNER },
        async isAvailable() { return true; },
        async connect() {
          return { authenticator: "test", signMessage: async () => "sig" };
        },
        async disconnect() {},
      };

      const connectorUnavailable: Connector = {
        metadata: { id: "2", name: "Unavailable", type: ConnectorType.EXTERNAL_SIGNER },
        async isAvailable() { return false; },
        async connect() {
          return { authenticator: "test", signMessage: async () => "sig" };
        },
        async disconnect() {},
      };

      expect(await connectorAvailable.isAvailable()).toBe(true);
      expect(await connectorUnavailable.isAvailable()).toBe(false);
    });

    it("should return ConnectorConnectionResult from connect", async () => {
      const connector: Connector = {
        metadata: { id: "test", name: "Test", type: ConnectorType.EXTERNAL_SIGNER },
        async isAvailable() { return true; },
        async connect() {
          return {
            authenticator: TEST_AUTHENTICATORS.ethWallet.toLowerCase(),
            displayAddress: TEST_AUTHENTICATORS.ethWallet,
            signMessage: async (msg: string) => TEST_SIGNATURES.ethWallet,
            metadata: {
              authenticatorType: AUTHENTICATOR_TYPE.EthWallet,
              connectionType: "signer",
            },
          };
        },
        async disconnect() {},
      };

      const result = await connector.connect();
      expect(result.authenticator).toBeDefined();
      expect(result.displayAddress).toBeDefined();
      expect(result.signMessage).toBeDefined();
      expect(result.metadata).toBeDefined();
    });
  });
});
