/**
 * Tests for ConnectorRegistry
 * Tests connector registration, retrieval, filtering, and management
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ConnectorRegistry } from "../ConnectorRegistry";
import { ConnectorType } from "../types";
import { createSimpleMockConnector } from "./test-utils";

describe("ConnectorRegistry", () => {
  let registry: ConnectorRegistry;

  beforeEach(() => {
    registry = new ConnectorRegistry();
  });

  describe("Constructor", () => {
    it("should initialize with empty connector map", () => {
      const connectors = registry.getAll();
      expect(connectors).toEqual([]);
    });
  });

  describe("register()", () => {
    it("should register a new connector", () => {
      const connector = createSimpleMockConnector("test-1", "Test Connector 1");
      registry.register(connector);

      const retrieved = registry.get("test-1");
      expect(retrieved).toBe(connector);
    });

    it("should register multiple connectors", () => {
      const connector1 = createSimpleMockConnector("test-1", "Test 1");
      const connector2 = createSimpleMockConnector("test-2", "Test 2");

      registry.register(connector1);
      registry.register(connector2);

      expect(registry.get("test-1")).toBe(connector1);
      expect(registry.get("test-2")).toBe(connector2);
    });

    it("should allow duplicate IDs and overwrite previous connector", () => {
      const connector1 = createSimpleMockConnector("same-id", "First");
      const connector2 = createSimpleMockConnector("same-id", "Second");

      // Spy on console.warn
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      registry.register(connector1);
      registry.register(connector2);

      // Should warn about overwriting
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Connector with ID "same-id" already registered',
        ),
      );

      // Second connector should win
      const retrieved = registry.get("same-id");
      expect(retrieved).toBe(connector2);
      expect(retrieved?.metadata.name).toBe("Second");

      warnSpy.mockRestore();
    });
  });

  describe("registerAll()", () => {
    it("should register multiple connectors at once", () => {
      const connectors = [
        createSimpleMockConnector("test-1", "Test 1"),
        createSimpleMockConnector("test-2", "Test 2"),
        createSimpleMockConnector("test-3", "Test 3"),
      ];

      registry.registerAll(connectors);

      expect(registry.get("test-1")).toBe(connectors[0]);
      expect(registry.get("test-2")).toBe(connectors[1]);
      expect(registry.get("test-3")).toBe(connectors[2]);
    });

    it("should handle empty array", () => {
      registry.registerAll([]);
      expect(registry.getAll()).toEqual([]);
    });
  });

  describe("get()", () => {
    it("should retrieve connector by ID", () => {
      const connector = createSimpleMockConnector("retrieve-me", "Test");
      registry.register(connector);

      const retrieved = registry.get("retrieve-me");
      expect(retrieved).toBe(connector);
    });

    it("should return undefined for non-existent connector", () => {
      const retrieved = registry.get("does-not-exist");
      expect(retrieved).toBeUndefined();
    });

    it("should return most recently registered connector for duplicate IDs", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const connector1 = createSimpleMockConnector("dup", "First");
      const connector2 = createSimpleMockConnector("dup", "Second");

      registry.register(connector1);
      registry.register(connector2);

      const retrieved = registry.get("dup");
      expect(retrieved).toBe(connector2);

      warnSpy.mockRestore();
    });
  });

  describe("getAll()", () => {
    it("should return all registered connectors", () => {
      const connector1 = createSimpleMockConnector("test-1", "Test 1");
      const connector2 = createSimpleMockConnector("test-2", "Test 2");
      const connector3 = createSimpleMockConnector("test-3", "Test 3");

      registry.register(connector1);
      registry.register(connector2);
      registry.register(connector3);

      const all = registry.getAll();
      expect(all).toHaveLength(3);
      expect(all).toContain(connector1);
      expect(all).toContain(connector2);
      expect(all).toContain(connector3);
    });

    it("should return empty array when no connectors registered", () => {
      const all = registry.getAll();
      expect(all).toEqual([]);
    });

    it("should return connectors in insertion order", () => {
      const connector1 = createSimpleMockConnector("a", "A");
      const connector2 = createSimpleMockConnector("b", "B");
      const connector3 = createSimpleMockConnector("c", "C");

      registry.register(connector1);
      registry.register(connector2);
      registry.register(connector3);

      const all = registry.getAll();
      expect(all[0]).toBe(connector1);
      expect(all[1]).toBe(connector2);
      expect(all[2]).toBe(connector3);
    });
  });

  describe("getByType()", () => {
    it("should filter connectors by type", () => {
      const externalSigner = createSimpleMockConnector(
        "ext-1",
        "External",
        ConnectorType.EXTERNAL_SIGNER,
      );
      const cosmosWallet = createSimpleMockConnector(
        "cosmos-1",
        "Cosmos",
        ConnectorType.COSMOS_WALLET,
      );
      const ethWallet = createSimpleMockConnector(
        "eth-1",
        "Ethereum",
        ConnectorType.ETHEREUM_WALLET,
      );

      registry.register(externalSigner);
      registry.register(cosmosWallet);
      registry.register(ethWallet);

      const externalSigners = registry.getByType(ConnectorType.EXTERNAL_SIGNER);
      expect(externalSigners).toHaveLength(1);
      expect(externalSigners[0]).toBe(externalSigner);

      const cosmosWallets = registry.getByType(ConnectorType.COSMOS_WALLET);
      expect(cosmosWallets).toHaveLength(1);
      expect(cosmosWallets[0]).toBe(cosmosWallet);
    });

    it("should return empty array for type with no matches", () => {
      const connector = createSimpleMockConnector(
        "test",
        "Test",
        ConnectorType.EXTERNAL_SIGNER,
      );
      registry.register(connector);

      const cosmosWallets = registry.getByType(ConnectorType.COSMOS_WALLET);
      expect(cosmosWallets).toEqual([]);
    });

    it("should return multiple connectors of the same type", () => {
      const ext1 = createSimpleMockConnector(
        "ext-1",
        "External 1",
        ConnectorType.EXTERNAL_SIGNER,
      );
      const ext2 = createSimpleMockConnector(
        "ext-2",
        "External 2",
        ConnectorType.EXTERNAL_SIGNER,
      );
      const cosmos = createSimpleMockConnector(
        "cosmos-1",
        "Cosmos",
        ConnectorType.COSMOS_WALLET,
      );

      registry.register(ext1);
      registry.register(ext2);
      registry.register(cosmos);

      const externalSigners = registry.getByType(ConnectorType.EXTERNAL_SIGNER);
      expect(externalSigners).toHaveLength(2);
      expect(externalSigners).toContain(ext1);
      expect(externalSigners).toContain(ext2);
    });
  });

  describe("getAvailableIds()", () => {
    it("should return IDs of available connectors", async () => {
      const available1 = createSimpleMockConnector(
        "avail-1",
        "Available 1",
        ConnectorType.EXTERNAL_SIGNER,
        true,
      );
      const available2 = createSimpleMockConnector(
        "avail-2",
        "Available 2",
        ConnectorType.EXTERNAL_SIGNER,
        true,
      );
      const unavailable = createSimpleMockConnector(
        "unavail",
        "Unavailable",
        ConnectorType.EXTERNAL_SIGNER,
        false,
      );

      registry.register(available1);
      registry.register(available2);
      registry.register(unavailable);

      const availableIds = await registry.getAvailableIds();
      expect(availableIds).toHaveLength(2);
      expect(availableIds).toContain("avail-1");
      expect(availableIds).toContain("avail-2");
      expect(availableIds).not.toContain("unavail");
    });

    it("should return empty array when no connectors are available", async () => {
      const unavailable1 = createSimpleMockConnector(
        "unavail-1",
        "Unavailable 1",
        ConnectorType.EXTERNAL_SIGNER,
        false,
      );
      const unavailable2 = createSimpleMockConnector(
        "unavail-2",
        "Unavailable 2",
        ConnectorType.EXTERNAL_SIGNER,
        false,
      );

      registry.register(unavailable1);
      registry.register(unavailable2);

      const availableIds = await registry.getAvailableIds();
      expect(availableIds).toEqual([]);
    });

    it("should return empty array when registry is empty", async () => {
      const availableIds = await registry.getAvailableIds();
      expect(availableIds).toEqual([]);
    });
  });

  describe("getAvailable()", () => {
    it("should return available connectors", async () => {
      const available1 = createSimpleMockConnector(
        "avail-1",
        "Available 1",
        ConnectorType.EXTERNAL_SIGNER,
        true,
      );
      const available2 = createSimpleMockConnector(
        "avail-2",
        "Available 2",
        ConnectorType.EXTERNAL_SIGNER,
        true,
      );
      const unavailable = createSimpleMockConnector(
        "unavail",
        "Unavailable",
        ConnectorType.EXTERNAL_SIGNER,
        false,
      );

      registry.register(available1);
      registry.register(available2);
      registry.register(unavailable);

      const availableConnectors = await registry.getAvailable();
      expect(availableConnectors).toHaveLength(2);
      expect(availableConnectors).toContain(available1);
      expect(availableConnectors).toContain(available2);
      expect(availableConnectors).not.toContain(unavailable);
    });

    it("should return empty array when no connectors are available", async () => {
      const unavailable = createSimpleMockConnector(
        "unavail",
        "Unavailable",
        ConnectorType.EXTERNAL_SIGNER,
        false,
      );
      registry.register(unavailable);

      const availableConnectors = await registry.getAvailable();
      expect(availableConnectors).toEqual([]);
    });
  });

  describe("clear()", () => {
    it("should remove all connectors", () => {
      const connector1 = createSimpleMockConnector("test-1", "Test 1");
      const connector2 = createSimpleMockConnector("test-2", "Test 2");

      registry.register(connector1);
      registry.register(connector2);

      expect(registry.getAll()).toHaveLength(2);

      registry.clear();

      expect(registry.getAll()).toEqual([]);
      expect(registry.get("test-1")).toBeUndefined();
      expect(registry.get("test-2")).toBeUndefined();
    });

    it("should be idempotent (safe to call multiple times)", () => {
      const connector = createSimpleMockConnector("test", "Test");
      registry.register(connector);

      registry.clear();
      registry.clear();
      registry.clear();

      expect(registry.getAll()).toEqual([]);
    });

    it("should allow re-registration after clearing", () => {
      const connector1 = createSimpleMockConnector("test", "First");
      registry.register(connector1);
      registry.clear();

      const connector2 = createSimpleMockConnector("test", "Second");
      registry.register(connector2);

      const retrieved = registry.get("test");
      expect(retrieved).toBe(connector2);
      expect(retrieved?.metadata.name).toBe("Second");
    });
  });

  describe("Multi-connector Scenarios", () => {
    it("should handle multiple different connector types", () => {
      const externalSigner = createSimpleMockConnector(
        "turnkey",
        "Turnkey",
        ConnectorType.EXTERNAL_SIGNER,
      );
      const cosmosWallet = createSimpleMockConnector(
        "keplr",
        "Keplr",
        ConnectorType.COSMOS_WALLET,
      );
      const ethWallet = createSimpleMockConnector(
        "metamask",
        "MetaMask",
        ConnectorType.ETHEREUM_WALLET,
      );

      registry.register(externalSigner);
      registry.register(cosmosWallet);
      registry.register(ethWallet);

      // All should be retrievable
      expect(registry.get("turnkey")).toBe(externalSigner);
      expect(registry.get("keplr")).toBe(cosmosWallet);
      expect(registry.get("metamask")).toBe(ethWallet);

      // Type filtering should work
      expect(registry.getByType(ConnectorType.EXTERNAL_SIGNER)).toHaveLength(1);
      expect(registry.getByType(ConnectorType.COSMOS_WALLET)).toHaveLength(1);
      expect(registry.getByType(ConnectorType.ETHEREUM_WALLET)).toHaveLength(1);

      // Total count should be 3
      expect(registry.getAll()).toHaveLength(3);
    });

    it("should isolate connector states", async () => {
      const connector1 = createSimpleMockConnector("conn-1", "Connector 1");
      const connector2 = createSimpleMockConnector("conn-2", "Connector 2");

      registry.register(connector1);
      registry.register(connector2);

      // Connect one connector
      const result1 = await connector1.connect();
      expect(result1.authenticator).toBe("mock-authenticator-conn-1");

      // Other connector should be independent
      const result2 = await connector2.connect();
      expect(result2.authenticator).toBe("mock-authenticator-conn-2");

      // Disconnect one shouldn't affect the other
      await connector1.disconnect();

      // connector2 should still work
      const result2Again = await connector2.connect();
      expect(result2Again.authenticator).toBe("mock-authenticator-conn-2");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty registry operations", () => {
      expect(registry.getAll()).toEqual([]);
      expect(registry.get("anything")).toBeUndefined();
      expect(registry.getByType(ConnectorType.EXTERNAL_SIGNER)).toEqual([]);
    });

    it("should handle non-existent IDs gracefully", () => {
      const connector = createSimpleMockConnector("exists", "Exists");
      registry.register(connector);

      expect(registry.get("does-not-exist")).toBeUndefined();
      expect(registry.get("")).toBeUndefined();
    });

    it("should handle multiple operations in sequence", () => {
      const c1 = createSimpleMockConnector("1", "One");
      const c2 = createSimpleMockConnector("2", "Two");
      const c3 = createSimpleMockConnector("3", "Three");

      // Register
      registry.register(c1);
      expect(registry.getAll()).toHaveLength(1);

      // Register more
      registry.register(c2);
      registry.register(c3);
      expect(registry.getAll()).toHaveLength(3);

      // Clear
      registry.clear();
      expect(registry.getAll()).toHaveLength(0);

      // Re-register
      registry.register(c1);
      expect(registry.getAll()).toHaveLength(1);
      expect(registry.get("1")).toBe(c1);
    });
  });
});
