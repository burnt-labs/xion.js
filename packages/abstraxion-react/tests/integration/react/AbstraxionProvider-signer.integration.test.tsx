/**
 * AbstraxionProvider Integration Tests - Signer Mode
 * Tests the provider component with signer-based authentication
 *
 * NOTE: This test depends on signer mode being fully functional.
 * Some tests may be skipped or marked as TODO until signer mode is fixed.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, waitFor, screen } from "@testing-library/react";
import { AbstraxionProvider } from "../../../src/AbstraxionProvider";
import { useAbstraxionAccount } from "../../../src/hooks/useAbstraxionAccount";
import { getTestConfig } from "../fixtures";
import {
  createTestSecp256k1Connector,
  getSignerConfigFromConnectorResult,
} from "../helpers";
import type { ReactNode } from "react";

// Test component that uses the hooks
function TestComponent() {
  const account = useAbstraxionAccount();

  return (
    <div>
      <div data-testid="is-connected">
        {account.isConnected ? "connected" : "disconnected"}
      </div>
      <div data-testid="is-initializing">
        {account.isInitializing ? "initializing" : "ready"}
      </div>
      <div data-testid="is-connecting">
        {account.isConnecting ? "connecting" : "idle"}
      </div>
      <div data-testid="address">{account.data.bech32Address}</div>
      <div data-testid="error">{account.error}</div>
      <button data-testid="login-btn" onClick={() => account.login()}>
        Login
      </button>
      <button data-testid="logout-btn" onClick={() => account.logout()}>
        Logout
      </button>
    </div>
  );
}

describe("AbstraxionProvider - Signer Mode Integration Tests", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("Provider Initialization", () => {
    it("should initialize provider with signer config", async () => {
      const config = getTestConfig();
      const signerConfig = {
        chainId: config.chainId,
        rpcUrl: config.rpcUrl,
        gasPrice: config.gasPrice,
        treasury: config.treasuryAddress,
        authentication: {
          type: "signer" as const,
          aaApiUrl: config.aaApiUrl,
          smartAccountContract: {
            codeId: parseInt(config.codeId, 10),
            checksum: config.checksum,
            addressPrefix: "xion",
          },
          async getSignerConfig() {
            const connector = createTestSecp256k1Connector();
            const result = await connector.connect();
            return getSignerConfigFromConnectorResult(result);
          },
        },
      };

      render(
        <AbstraxionProvider config={signerConfig}>
          <TestComponent />
        </AbstraxionProvider>,
      );

      // Wait for initialization to complete
      await waitFor(
        () => {
          const initializing = screen.getByTestId("is-initializing");
          expect(initializing.textContent).toBe("ready");
        },
        { timeout: 10000 },
      );

      // Should start disconnected
      const connected = screen.getByTestId("is-connected");
      expect(connected.textContent).toBe("disconnected");
    });

    it("should handle signer config with indexer", async () => {
      const config = getTestConfig();
      const signerConfig = {
        chainId: config.chainId,
        rpcUrl: config.rpcUrl,
        gasPrice: config.gasPrice,
        treasury: config.treasuryAddress,
        authentication: {
          type: "signer" as const,
          aaApiUrl: config.aaApiUrl,
          smartAccountContract: {
            codeId: parseInt(config.codeId, 10),
            checksum: config.checksum,
            addressPrefix: "xion",
          },
          indexer: {
            url: config.indexerUrl,
          },
          async getSignerConfig() {
            const connector = createTestSecp256k1Connector();
            const result = await connector.connect();
            return getSignerConfigFromConnectorResult(result);
          },
        },
      };

      render(
        <AbstraxionProvider config={signerConfig}>
          <TestComponent />
        </AbstraxionProvider>,
      );

      await waitFor(
        () => {
          const initializing = screen.getByTestId("is-initializing");
          expect(initializing.textContent).toBe("ready");
        },
        { timeout: 10000 },
      );

      // Should initialize successfully with indexer config
      const connected = screen.getByTestId("is-connected");
      expect(connected.textContent).toBe("disconnected");
    });
  });

  describe("Signer Authentication Flow", () => {
    it("should attempt connection when login is called", async () => {
      const config = getTestConfig();
      const signerConfig = {
        chainId: config.chainId,
        rpcUrl: config.rpcUrl,
        gasPrice: config.gasPrice,
        treasury: config.treasuryAddress,
        authentication: {
          type: "signer" as const,
          aaApiUrl: config.aaApiUrl,
          smartAccountContract: {
            codeId: parseInt(config.codeId, 10),
            checksum: config.checksum,
            addressPrefix: "xion",
          },
          async getSignerConfig() {
            const connector = createTestSecp256k1Connector();
            const result = await connector.connect();
            return getSignerConfigFromConnectorResult(result);
          },
        },
      };

      render(
        <AbstraxionProvider config={signerConfig}>
          <TestComponent />
        </AbstraxionProvider>,
      );

      // Wait for initialization
      await waitFor(
        () => {
          const initializing = screen.getByTestId("is-initializing");
          expect(initializing.textContent).toBe("ready");
        },
        { timeout: 10000 },
      );

      // Click login button
      const loginBtn = screen.getByTestId("login-btn");
      loginBtn.click();

      // Should enter connecting state
      await waitFor(
        () => {
          const connecting = screen.getByTestId("is-connecting");
          expect(connecting.textContent).toBe("connecting");
        },
        { timeout: 5000 },
      );

      // Wait for successful connection
      await waitFor(
        () => {
          const connected = screen.getByTestId("is-connected");
          expect(connected.textContent).toBe("connected");
        },
        { timeout: 120000 },
      );

      // Verify successful connection
      const connected = screen.getByTestId("is-connected");
      const address = screen.getByTestId("address");
      const error = screen.getByTestId("error");

      expect(connected.textContent).toBe("connected");
      expect(address.textContent).toMatch(/^xion1[a-z0-9]+$/);
      expect(error.textContent).toBe("");
    }, 120000);

    it("should handle getSignerConfig function updates", async () => {
      const config = getTestConfig();
      let getSignerConfigCallCount = 0;

      const signerConfig = {
        chainId: config.chainId,
        rpcUrl: config.rpcUrl,
        gasPrice: config.gasPrice,
        treasury: config.treasuryAddress,
        authentication: {
          type: "signer" as const,
          aaApiUrl: config.aaApiUrl,
          smartAccountContract: {
            codeId: parseInt(config.codeId, 10),
            checksum: config.checksum,
            addressPrefix: "xion",
          },
          async getSignerConfig() {
            getSignerConfigCallCount++;
            const connector = createTestSecp256k1Connector();
            const result = await connector.connect();
            return getSignerConfigFromConnectorResult(result);
          },
        },
      };

      const { rerender } = render(
        <AbstraxionProvider config={signerConfig}>
          <TestComponent />
        </AbstraxionProvider>,
      );

      await waitFor(
        () => {
          const initializing = screen.getByTestId("is-initializing");
          expect(initializing.textContent).toBe("ready");
        },
        { timeout: 10000 },
      );

      // Update config with new getSignerConfig function
      const newConfig = {
        ...signerConfig,
        authentication: {
          ...signerConfig.authentication,
          async getSignerConfig() {
            getSignerConfigCallCount++;
            const connector = createTestSecp256k1Connector();
            const result = await connector.connect();
            return getSignerConfigFromConnectorResult(result);
          },
        },
      };

      rerender(
        <AbstraxionProvider config={newConfig}>
          <TestComponent />
        </AbstraxionProvider>,
      );

      // Provider should handle config update
      await waitFor(
        () => {
          const initializing = screen.getByTestId("is-initializing");
          expect(initializing.textContent).toBe("ready");
        },
        { timeout: 10000 },
      );

      // Verify that getSignerConfig was called (function reference changed)
      // We can verify this by attempting to login and ensuring it uses the new function
      const loginBtn = screen.getByTestId("login-btn");
      const initialCallCount = getSignerConfigCallCount;

      loginBtn.click();

      // Wait for connection attempt
      await waitFor(
        () => {
          const connecting = screen.getByTestId("is-connecting");
          expect(connecting.textContent).toBe("connecting");
        },
        { timeout: 5000 },
      );

      // Wait a bit for getSignerConfig to be called
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify getSignerConfig was called (call count should have increased)
      // Note: The exact call count depends on implementation, but it should be called
      expect(getSignerConfigCallCount).toBeGreaterThan(initialCallCount);
    }, 30000);
  });

  describe("Provider State Management", () => {
    it("should provide context values to children", async () => {
      const config = getTestConfig();
      const signerConfig = {
        chainId: config.chainId,
        rpcUrl: config.rpcUrl,
        gasPrice: config.gasPrice,
        authentication: {
          type: "signer" as const,
          aaApiUrl: config.aaApiUrl,
          smartAccountContract: {
            codeId: parseInt(config.codeId, 10),
            checksum: config.checksum,
            addressPrefix: "xion",
          },
          async getSignerConfig() {
            const connector = createTestSecp256k1Connector();
            const result = await connector.connect();
            return getSignerConfigFromConnectorResult(result);
          },
        },
      };

      render(
        <AbstraxionProvider config={signerConfig}>
          <TestComponent />
        </AbstraxionProvider>,
      );

      await waitFor(
        () => {
          const initializing = screen.getByTestId("is-initializing");
          expect(initializing.textContent).toBe("ready");
        },
        { timeout: 10000 },
      );

      // All context values should be accessible
      expect(screen.getByTestId("is-connected")).toBeDefined();
      expect(screen.getByTestId("is-initializing")).toBeDefined();
      expect(screen.getByTestId("is-connecting")).toBeDefined();
      expect(screen.getByTestId("address")).toBeDefined();
      expect(screen.getByTestId("login-btn")).toBeDefined();
      expect(screen.getByTestId("logout-btn")).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid signer config gracefully", async () => {
      const config = getTestConfig();
      const invalidSignerConfig = {
        chainId: config.chainId,
        rpcUrl: config.rpcUrl,
        gasPrice: config.gasPrice,
        authentication: {
          type: "signer" as const,
          aaApiUrl: "https://invalid-aa-api.com",
          smartAccountContract: {
            codeId: 999999, // Invalid code ID
            checksum: "invalid",
            addressPrefix: "xion",
          },
          async getSignerConfig() {
            throw new Error("Failed to get signer config");
          },
        },
      };

      render(
        <AbstraxionProvider config={invalidSignerConfig}>
          <TestComponent />
        </AbstraxionProvider>,
      );

      // Should still initialize (errors handled internally)
      await waitFor(
        () => {
          const initializing = screen.getByTestId("is-initializing");
          expect(initializing.textContent).toBe("ready");
        },
        { timeout: 10000 },
      );
    });
  });
});
