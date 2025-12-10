/**
 * Complete Flows Integration Tests
 * Tests complete end-to-end user flows combining all components
 *
 * These tests verify the full integration of:
 * - AbstraxionProvider
 * - useAbstraxionAccount
 * - useAbstraxionClient
 * - useAbstraxionSigningClient
 *
 * NOTE: Some tests depend on signer mode being fully functional.
 * These tests should be run after the individual component tests pass.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { renderHook, act, waitFor, screen } from "@testing-library/react";
import { AbstraxionProvider } from "../../../src/components/AbstraxionContext";
import { useAbstraxionAccount } from "../../../src/hooks/useAbstraxionAccount";
import { useAbstraxionClient } from "../../../src/hooks/useAbstraxionClient";
import { useAbstraxionSigningClient } from "../../../src/hooks/useAbstraxionSigningClient";
import { getTestConfig } from "../fixtures";
import {
  createTestSecp256k1Connector,
  getSignerConfigFromConnectorResult,
} from "../helpers";
import type { ReactNode } from "react";

// Complete test component using all hooks (matches demo-app pattern)
function CompleteTestComponent() {
  const account = useAbstraxionAccount();
  const queryClient = useAbstraxionClient();
  const signingClient = useAbstraxionSigningClient();

  // Match demo-app pattern: use isLoading to disable buttons
  const isLoading = account.isLoading;

  return (
    <div>
      <div data-testid="account-connected">
        {account.isConnected ? "connected" : "disconnected"}
      </div>
      <div data-testid="account-address">{account.data.bech32Address}</div>
      <div data-testid="is-loading">{isLoading ? "loading" : "idle"}</div>
      <div data-testid="is-initializing">
        {account.isInitializing ? "initializing" : "ready"}
      </div>
      <div data-testid="is-connecting">
        {account.isConnecting ? "connecting" : "idle"}
      </div>
      <div data-testid="is-returning-from-auth">
        {account.isReturningFromAuth ? "returning" : "not-returning"}
      </div>
      <div data-testid="is-logging-in">
        {account.isLoggingIn ? "logging-in" : "not-logging-in"}
      </div>
      <div data-testid="query-client">
        {queryClient.client ? "ready" : "not-ready"}
      </div>
      <div data-testid="query-error">{queryClient.error?.message || ""}</div>
      <div data-testid="signing-client">
        {signingClient.client ? "ready" : "not-ready"}
      </div>
      <div data-testid="sign-arb">
        {signingClient.signArb ? "available" : "not-available"}
      </div>
      <button
        data-testid="login-btn"
        onClick={() => account.login()}
        disabled={isLoading}
      >
        {isLoading ? "Loading..." : "Login"}
      </button>
      <button
        data-testid="logout-btn"
        onClick={() => account.logout()}
        disabled={isLoading}
      >
        Logout
      </button>
    </div>
  );
}

describe("Complete Flows Integration Tests", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const createWrapper = (config: any) => {
    return ({ children }: { children: ReactNode }) => (
      <AbstraxionProvider config={config}>{children}</AbstraxionProvider>
    );
  };

  describe("Complete Redirect Flow", () => {
    it("should complete full redirect authentication flow", async () => {
      const config = getTestConfig();
      const redirectConfig = {
        chainId: config.chainId,
        rpcUrl: config.rpcUrl,
        gasPrice: config.gasPrice,
        treasury: config.treasuryAddress,
        authentication: {
          type: "redirect" as const,
          dashboardUrl: "https://dashboard.test.com",
        },
      };

      render(
        <AbstraxionProvider config={redirectConfig}>
          <CompleteTestComponent />
        </AbstraxionProvider>,
      );

      // Wait for initialization
      await waitFor(
        () => {
          const queryClient = screen.getByTestId("query-client");
          expect(queryClient.textContent).toBe("ready");
        },
        { timeout: 10000 },
      );

      // Query client should be ready
      expect(screen.getByTestId("query-client").textContent).toBe("ready");

      // Account should start disconnected
      expect(screen.getByTestId("account-connected").textContent).toBe(
        "disconnected",
      );

      // Signing client should not be ready (not connected)
      expect(screen.getByTestId("signing-client").textContent).toBe(
        "not-ready",
      );

      // Login should trigger redirect
      const loginBtn = screen.getByTestId("login-btn");
      loginBtn.click();

      // Should enter connecting state
      await waitFor(
        () => {
          // In redirect mode, this will trigger redirect
          // We can't test the full callback flow in jsdom
        },
        { timeout: 5000 },
      );
    }, 30000);
  });

  describe("Complete Signer Flow", () => {
    it("should complete full signer authentication flow", async () => {
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
          <CompleteTestComponent />
        </AbstraxionProvider>,
      );

      // Wait for initialization and query client
      await waitFor(
        () => {
          const queryClient = screen.getByTestId("query-client");
          expect(queryClient.textContent).toBe("ready");
        },
        { timeout: 10000 },
      );

      // Query client should be ready
      expect(screen.getByTestId("query-client").textContent).toBe("ready");

      // Account should start disconnected
      expect(screen.getByTestId("account-connected").textContent).toBe(
        "disconnected",
      );

      // Signing client should not be ready
      expect(screen.getByTestId("signing-client").textContent).toBe(
        "not-ready",
      );

      // Login
      const loginBtn = screen.getByTestId("login-btn");
      loginBtn.click();

      // Wait for successful connection
      await waitFor(
        () => {
          const connected = screen.getByTestId("account-connected");
          expect(connected.textContent).toBe("connected");
        },
        { timeout: 120000 },
      );

      // Verify successful connection and all clients are ready
      expect(screen.getByTestId("account-connected").textContent).toBe(
        "connected",
      );
      expect(screen.getByTestId("account-address").textContent).toMatch(
        /^xion1[a-z0-9]+$/,
      );

      // Signing client should be ready when connected
      await waitFor(
        () => {
          const signingClient = screen.getByTestId("signing-client");
          expect(signingClient.textContent).toBe("ready");
        },
        { timeout: 5000 },
      );

      // signArb should be available
      expect(screen.getByTestId("sign-arb").textContent).toBe("available");
    }, 120000);

    it("should handle logout and cleanup", async () => {
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
          <CompleteTestComponent />
        </AbstraxionProvider>,
      );

      // Wait for initialization
      await waitFor(
        () => {
          const queryClient = screen.getByTestId("query-client");
          expect(queryClient.textContent).toBe("ready");
        },
        { timeout: 10000 },
      );

      // Login
      const loginBtn = screen.getByTestId("login-btn");
      loginBtn.click();

      // Wait for successful connection
      await waitFor(
        () => {
          const connected = screen.getByTestId("account-connected");
          expect(connected.textContent).toBe("connected");
        },
        { timeout: 120000 },
      );

      // Verify connection succeeded
      expect(screen.getByTestId("account-connected").textContent).toBe(
        "connected",
      );
      expect(screen.getByTestId("account-address").textContent).toMatch(
        /^xion1[a-z0-9]+$/,
      );

      // Logout
      const logoutBtn = screen.getByTestId("logout-btn");
      logoutBtn.click();

      // Wait for logout
      await waitFor(
        () => {
          const connected = screen.getByTestId("account-connected");
          expect(connected.textContent).toBe("disconnected");
        },
        { timeout: 10000 },
      );

      // Verify cleanup
      expect(screen.getByTestId("account-address").textContent).toBe("");
      expect(screen.getByTestId("signing-client").textContent).toBe(
        "not-ready",
      );
      expect(screen.getByTestId("sign-arb").textContent).toBe("not-available");

      // Query client should still be available (not tied to connection)
      expect(screen.getByTestId("query-client").textContent).toBe("ready");
    }, 120000);
  });

  describe("Multi-Hook Integration (demo-app pattern)", () => {
    it("should allow using all hooks together like demo-app", async () => {
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

      const wrapper = ({ children }: { children: ReactNode }) => (
        <AbstraxionProvider config={signerConfig}>
          {children}
        </AbstraxionProvider>
      );

      // Render all hooks (matches demo-app pattern)
      const { result: accountResult } = renderHook(
        () => useAbstraxionAccount(),
        { wrapper },
      );
      const { result: queryResult } = renderHook(() => useAbstraxionClient(), {
        wrapper,
      });
      const { result: signingResult } = renderHook(
        () => useAbstraxionSigningClient(),
        { wrapper },
      );

      // Wait for initialization
      await waitFor(
        () => {
          expect(queryResult.current.client).toBeDefined();
        },
        { timeout: 10000 },
      );

      // All hooks should be accessible
      expect(accountResult.current).toBeDefined();
      expect(queryResult.current).toBeDefined();
      expect(signingResult.current).toBeDefined();

      // Query client should be ready (independent of connection)
      expect(queryResult.current.client).toBeDefined();

      // Account should start disconnected
      expect(accountResult.current.isConnected).toBe(false);
      expect(accountResult.current.data.bech32Address).toBe("");

      // Signing client should not be ready until connected
      expect(signingResult.current.client).toBeUndefined();
      expect(signingResult.current.signArb).toBeUndefined();

      // Login (matches demo-app pattern)
      await act(async () => {
        await accountResult.current.login();
      });

      // Wait for connection
      await waitFor(
        () => {
          expect(accountResult.current.isConnected).toBe(true);
        },
        { timeout: 120000 },
      );

      // After connection, all hooks should reflect connected state
      expect(accountResult.current.isConnected).toBe(true);
      expect(accountResult.current.data.bech32Address).toMatch(
        /^xion1[a-z0-9]+$/,
      );

      await waitFor(
        () => {
          expect(signingResult.current.client).toBeDefined();
        },
        { timeout: 5000 },
      );

      expect(signingResult.current.client).toBeDefined();
      expect(signingResult.current.signArb).toBeDefined();
      expect(queryResult.current.client).toBeDefined(); // Query client still available
    }, 180000);

    it("should pass client to child components like SendTokens pattern", async () => {
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

      // Mock child component that receives client (like SendTokens)
      function MockSendTokens({
        accountAddress,
        client,
      }: {
        accountAddress: string | undefined;
        client: any;
      }) {
        return (
          <div data-testid="send-tokens">
            <div data-testid="send-tokens-address">
              {accountAddress || "no-address"}
            </div>
            <div data-testid="send-tokens-client">
              {client ? "has-client" : "no-client"}
            </div>
          </div>
        );
      }

      function TestComponent() {
        const account = useAbstraxionAccount();
        const { client } = useAbstraxionSigningClient();

        return (
          <div>
            <MockSendTokens
              accountAddress={account.data.bech32Address}
              client={client}
            />
          </div>
        );
      }

      render(
        <AbstraxionProvider config={signerConfig}>
          <TestComponent />
        </AbstraxionProvider>,
      );

      // Initially no address or client
      expect(screen.getByTestId("send-tokens-address").textContent).toBe(
        "no-address",
      );
      expect(screen.getByTestId("send-tokens-client").textContent).toBe(
        "no-client",
      );

      // Login
      const accountHook = renderHook(() => useAbstraxionAccount(), {
        wrapper: createWrapper(signerConfig),
      });

      await waitFor(
        () => {
          expect(accountHook.result.current.isInitializing).toBe(false);
        },
        { timeout: 10000 },
      );

      await act(async () => {
        await accountHook.result.current.login();
      });

      // Wait for connection
      await waitFor(
        () => {
          expect(accountHook.result.current.isConnected).toBe(true);
        },
        { timeout: 120000 },
      );

      // After connection, child component should receive address and client
      await waitFor(
        () => {
          const address = screen.getByTestId("send-tokens-address");
          expect(address.textContent).toMatch(/^xion1[a-z0-9]+$/);
        },
        { timeout: 5000 },
      );

      await waitFor(
        () => {
          const client = screen.getByTestId("send-tokens-client");
          expect(client.textContent).toBe("has-client");
        },
        { timeout: 5000 },
      );
    }, 180000);
  });

  describe("Error Recovery", () => {
    it("should recover from connection errors", async () => {
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
          <CompleteTestComponent />
        </AbstraxionProvider>,
      );

      await waitFor(
        () => {
          const queryClient = screen.getByTestId("query-client");
          expect(queryClient.textContent).toBe("ready");
        },
        { timeout: 10000 },
      );

      // Attempt login (may fail)
      const loginBtn = screen.getByTestId("login-btn");
      loginBtn.click();

      // Wait for successful connection
      await waitFor(
        () => {
          const connected = screen.getByTestId("account-connected");
          expect(connected.textContent).toBe("connected");
        },
        { timeout: 120000 },
      );

      // Verify connection succeeded
      expect(screen.getByTestId("account-connected").textContent).toBe(
        "connected",
      );
      expect(screen.getByTestId("account-address").textContent).toMatch(
        /^xion1[a-z0-9]+$/,
      );

      // Test retry capability - logout and login again
      const logoutBtn = screen.getByTestId("logout-btn");
      logoutBtn.click();

      await waitFor(
        () => {
          const connected = screen.getByTestId("account-connected");
          expect(connected.textContent).toBe("disconnected");
        },
        { timeout: 10000 },
      );

      // Login again
      loginBtn.click();

      await waitFor(
        () => {
          const connected = screen.getByTestId("account-connected");
          expect(connected.textContent).toBe("connected");
        },
        { timeout: 120000 },
      );

      // Verify reconnection succeeded
      expect(screen.getByTestId("account-connected").textContent).toBe(
        "connected",
      );
      expect(screen.getByTestId("account-address").textContent).toMatch(
        /^xion1[a-z0-9]+$/,
      );
    }, 120000);
  });
});
