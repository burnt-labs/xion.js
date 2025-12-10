/**
 * Loading State Management Integration Tests
 * Tests that loading states are properly managed without flashing
 * 
 * These tests verify:
 * - isLoading is correctly derived from state machine states
 * - No flashing between loading states (smooth transitions)
 * - Multiple hooks stay in sync during state transitions
 * - Loading states match AccountState machine states
 * 
 * Based on how demo-app uses loading states and AccountState from account-management
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { render, screen, waitFor as waitForScreen } from "@testing-library/react";
import {
  useAbstraxionAccount,
  useAbstraxionSigningClient,
  useAbstraxionClient,
} from "../../../src/hooks";
import { AbstraxionProvider } from "../../../src/components/AbstraxionContext";
import { getTestConfig } from "../fixtures";
import { createTestSecp256k1Connector, getSignerConfigFromConnectorResult } from "../helpers";
import type { ReactNode } from "react";

describe("Loading State Management Integration Tests", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const createWrapper = (config: any) => {
    return ({ children }: { children: ReactNode }) => (
      <AbstraxionProvider config={config}>{children}</AbstraxionProvider>
    );
  };

  describe("isLoading Derivation", () => {
    it("should derive isLoading from isInitializing and isConnecting", async () => {
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

      const { result } = renderHook(() => useAbstraxionAccount(), {
        wrapper: createWrapper(signerConfig),
      });

      // Initially should be initializing (isLoading = true)
      expect(result.current.isInitializing).toBe(true);
      expect(result.current.isLoading).toBe(true);

      // Wait for initialization to complete
      await waitFor(
        () => {
          expect(result.current.isInitializing).toBe(false);
        },
        { timeout: 10000 }
      );

      // After initialization, if not connecting, isLoading should be false
      if (!result.current.isConnecting) {
        expect(result.current.isLoading).toBe(false);
      }

      // Start login
      await act(async () => {
        await result.current.login();
      });

      // Should enter connecting state (isLoading = true)
      await waitFor(
        () => {
          expect(result.current.isConnecting).toBe(true);
        },
        { timeout: 5000 }
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isInitializing).toBe(false);

      // Wait for connection
      await waitFor(
        () => {
          expect(result.current.isConnected).toBe(true);
        },
        { timeout: 120000 }
      );

      // After connection, isLoading should be false
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.isInitializing).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it("should maintain isLoading consistency during state transitions", async () => {
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

      const { result } = renderHook(() => useAbstraxionAccount(), {
        wrapper: createWrapper(signerConfig),
      });

      const loadingStates: boolean[] = [];
      const initializingStates: boolean[] = [];
      const connectingStates: boolean[] = [];

      // Track state changes
      const checkStates = () => {
        loadingStates.push(result.current.isLoading);
        initializingStates.push(result.current.isInitializing);
        connectingStates.push(result.current.isConnecting);
      };

      // Initial state
      checkStates();
      expect(result.current.isLoading).toBe(result.current.isInitializing || result.current.isConnecting);

      // Wait for initialization
      await waitFor(
        () => {
          checkStates();
          expect(result.current.isInitializing).toBe(false);
        },
        { timeout: 10000 }
      );

      // Start login
      await act(async () => {
        await result.current.login();
      });

      // Track through connecting state
      await waitFor(
        () => {
          checkStates();
          expect(result.current.isConnecting).toBe(true);
        },
        { timeout: 5000 }
      );

      // Track through connection
      await waitFor(
        () => {
          checkStates();
          expect(result.current.isConnected).toBe(true);
        },
        { timeout: 120000 }
      );

      // Verify isLoading was always consistent
      for (let i = 0; i < loadingStates.length; i++) {
        const expectedLoading = initializingStates[i] || connectingStates[i];
        expect(loadingStates[i]).toBe(expectedLoading);
      }

      // Verify no flashing: isLoading should not toggle rapidly
      let toggleCount = 0;
      for (let i = 1; i < loadingStates.length; i++) {
        if (loadingStates[i] !== loadingStates[i - 1]) {
          toggleCount++;
        }
      }
      // Should have smooth transitions, not rapid toggling
      expect(toggleCount).toBeLessThan(5); // Allow for: initializing→idle→connecting→connected
    });
  });

  describe("No Flashing Loading States", () => {
    it("should not flash loading state during initialization", async () => {
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

      const { result } = renderHook(() => useAbstraxionAccount(), {
        wrapper: createWrapper(signerConfig),
      });

      // Track isLoading changes
      const isLoadingHistory: boolean[] = [];
      let checkInterval: NodeJS.Timeout;

      // Monitor isLoading for 2 seconds during initialization
      await new Promise<void>((resolve) => {
        checkInterval = setInterval(() => {
          isLoadingHistory.push(result.current.isLoading);
        }, 50); // Check every 50ms

        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, 2000);
      });

      // isLoading should start as true and stay true during initialization
      expect(isLoadingHistory[0]).toBe(true);
      
      // Should not have rapid false→true→false flashes
      let flashCount = 0;
      for (let i = 1; i < isLoadingHistory.length; i++) {
        if (isLoadingHistory[i] !== isLoadingHistory[i - 1]) {
          flashCount++;
        }
      }
      // Allow one transition (true→false when initialization completes)
      expect(flashCount).toBeLessThanOrEqual(2);
    });

    it("should not flash loading state during connection", async () => {
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

      const { result } = renderHook(() => useAbstraxionAccount(), {
        wrapper: createWrapper(signerConfig),
      });

      // Wait for initialization
      await waitFor(
        () => {
          expect(result.current.isInitializing).toBe(false);
        },
        { timeout: 10000 }
      );

      // Track isLoading during connection
      const isLoadingHistory: boolean[] = [];
      let checkInterval: NodeJS.Timeout;

      // Start login
      const loginPromise = act(async () => {
        await result.current.login();
      });

      // Monitor isLoading during connection
      await new Promise<void>((resolve) => {
        checkInterval = setInterval(() => {
          isLoadingHistory.push(result.current.isLoading);
        }, 50); // Check every 50ms

        // Stop monitoring after connection completes or timeout
        Promise.race([
          waitFor(
            () => {
              expect(result.current.isConnected).toBe(true);
            },
            { timeout: 120000 }
          ),
          new Promise((r) => setTimeout(r, 5000)), // Max 5 seconds of monitoring
        ]).then(() => {
          clearInterval(checkInterval);
          resolve();
        });
      });

      await loginPromise;

      // isLoading should transition smoothly: false → true → false
      // Should not have rapid toggling
      let toggleCount = 0;
      for (let i = 1; i < isLoadingHistory.length; i++) {
        if (isLoadingHistory[i] !== isLoadingHistory[i - 1]) {
          toggleCount++;
        }
      }
      // Should have smooth transitions, not rapid toggling
      expect(toggleCount).toBeLessThan(5);
    });
  });

  describe("Multiple Hooks State Synchronization", () => {
    it("should keep useAbstraxionAccount and useAbstraxionSigningClient in sync", async () => {
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

      const wrapper = createWrapper(signerConfig);
      const { result: accountResult } = renderHook(() => useAbstraxionAccount(), { wrapper });
      const { result: signingResult } = renderHook(() => useAbstraxionSigningClient(), { wrapper });

      // Wait for initialization
      await waitFor(
        () => {
          expect(accountResult.current.isInitializing).toBe(false);
        },
        { timeout: 10000 }
      );

      // Both hooks should reflect same connection state
      expect(accountResult.current.isConnected).toBe(false);
      expect(signingResult.current.client).toBeUndefined();

      // Start login
      await act(async () => {
        await accountResult.current.login();
      });

      // Wait for connection
      await waitFor(
        () => {
          expect(accountResult.current.isConnected).toBe(true);
        },
        { timeout: 120000 }
      );

      // Both hooks should reflect connected state
      expect(accountResult.current.isConnected).toBe(true);
      await waitFor(
        () => {
          expect(signingResult.current.client).toBeDefined();
        },
        { timeout: 5000 }
      );

      // Logout
      await act(async () => {
        await accountResult.current.logout();
      });

      // Wait for logout
      await waitFor(
        () => {
          expect(accountResult.current.isConnected).toBe(false);
        },
        { timeout: 10000 }
      );

      // Both hooks should reflect disconnected state
      expect(accountResult.current.isConnected).toBe(false);
      expect(signingResult.current.client).toBeUndefined();
    });

    it("should keep all hooks synchronized during state transitions", async () => {
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

      const wrapper = createWrapper(signerConfig);
      const { result: accountResult } = renderHook(() => useAbstraxionAccount(), { wrapper });
      const { result: signingResult } = renderHook(() => useAbstraxionSigningClient(), { wrapper });
      const { result: queryResult } = renderHook(() => useAbstraxionClient(), { wrapper });

      // Wait for initialization
      await waitFor(
        () => {
          expect(accountResult.current.isInitializing).toBe(false);
        },
        { timeout: 10000 }
      );

      // Query client should be ready (independent of connection)
      await waitFor(
        () => {
          expect(queryResult.current.client).toBeDefined();
        },
        { timeout: 10000 }
      );

      // Account and signing client should be disconnected
      expect(accountResult.current.isConnected).toBe(false);
      expect(signingResult.current.client).toBeUndefined();

      // Start login
      await act(async () => {
        await accountResult.current.login();
      });

      // During connection, isLoading should be true
      await waitFor(
        () => {
          expect(accountResult.current.isConnecting).toBe(true);
        },
        { timeout: 5000 }
      );

      expect(accountResult.current.isLoading).toBe(true);
      expect(accountResult.current.isConnecting).toBe(true);

      // Wait for connection
      await waitFor(
        () => {
          expect(accountResult.current.isConnected).toBe(true);
        },
        { timeout: 120000 }
      );

      // All hooks should reflect connected state
      expect(accountResult.current.isConnected).toBe(true);
      await waitFor(
        () => {
          expect(signingResult.current.client).toBeDefined();
        },
        { timeout: 5000 }
      );
      expect(queryResult.current.client).toBeDefined(); // Query client should still be available
    });
  });

  describe("Loading State Consistency with AccountState Machine", () => {
    it("should match AccountState machine states", async () => {
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

      const { result } = renderHook(() => useAbstraxionAccount(), {
        wrapper: createWrapper(signerConfig),
      });

      // Initial state: initializing
      expect(result.current.isInitializing).toBe(true);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.isLoading).toBe(true); // isLoading = isInitializing || isConnecting

      // Wait for initialization
      await waitFor(
        () => {
          expect(result.current.isInitializing).toBe(false);
        },
        { timeout: 10000 }
      );

      // After initialization: idle (not initializing, not connecting)
      expect(result.current.isInitializing).toBe(false);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.isLoading).toBe(false);

      // Start login
      await act(async () => {
        await result.current.login();
      });

      // Connecting state
      await waitFor(
        () => {
          expect(result.current.isConnecting).toBe(true);
        },
        { timeout: 5000 }
      );

      expect(result.current.isInitializing).toBe(false);
      expect(result.current.isConnecting).toBe(true);
      expect(result.current.isLoading).toBe(true); // isLoading = isInitializing || isConnecting

      // Wait for connection
      await waitFor(
        () => {
          expect(result.current.isConnected).toBe(true);
        },
        { timeout: 120000 }
      );

      // Connected state
      expect(result.current.isInitializing).toBe(false);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.isConnected).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it("should handle configuring-permissions state correctly", async () => {
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

      const { result } = renderHook(() => useAbstraxionAccount(), {
        wrapper: createWrapper(signerConfig),
      });

      // Wait for initialization
      await waitFor(
        () => {
          expect(result.current.isInitializing).toBe(false);
        },
        { timeout: 10000 }
      );

      // Start login
      await act(async () => {
        await result.current.login();
      });

      // During connection (which includes configuring-permissions), isConnecting should be true
      await waitFor(
        () => {
          expect(result.current.isConnecting).toBe(true);
        },
        { timeout: 5000 }
      );

      // isConnecting includes both "connecting" and "configuring-permissions" states
      // So isLoading should be true
      expect(result.current.isConnecting).toBe(true);
      expect(result.current.isLoading).toBe(true);

      // Wait for connection
      await waitFor(
        () => {
          expect(result.current.isConnected).toBe(true);
        },
        { timeout: 120000 }
      );

      // After connection, isConnecting should be false
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("Loading State UI Patterns (like demo-app)", () => {
    it("should support disabling buttons during loading", async () => {
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

      function TestComponent() {
        const account = useAbstraxionAccount();
        return (
          <button
            data-testid="login-btn"
            disabled={account.isLoading}
            onClick={() => account.login()}
          >
            {account.isLoading ? "Loading..." : "Login"}
          </button>
        );
      }

      render(
        <AbstraxionProvider config={signerConfig}>
          <TestComponent />
        </AbstraxionProvider>
      );

      // Button should be disabled during initialization
      const button = screen.getByTestId("login-btn");
      expect(button).toBeDisabled();

      // Wait for initialization
      await waitForScreen(
        () => {
          expect(button).not.toBeDisabled();
        },
        { timeout: 10000 }
      );

      // Click login
      button.click();

      // Button should be disabled during connection
      await waitForScreen(
        () => {
          expect(button).toBeDisabled();
        },
        { timeout: 5000 }
      );

      // Wait for connection
      await waitForScreen(
        () => {
          expect(button).not.toBeDisabled();
        },
        { timeout: 120000 }
      );
    });

    it("should support showing loading overlays during transitions", async () => {
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

      function TestComponent() {
        const account = useAbstraxionAccount();
        const showLoadingOverlay =
          account.isInitializing ||
          account.isConnecting ||
          account.isReturningFromAuth ||
          account.isLoggingIn;

        return (
          <div>
            <div data-testid="content">Main Content</div>
            {showLoadingOverlay && (
              <div data-testid="loading-overlay">Loading...</div>
            )}
          </div>
        );
      }

      render(
        <AbstraxionProvider config={signerConfig}>
          <TestComponent />
        </AbstraxionProvider>
      );

      // Should show loading overlay during initialization
      expect(screen.getByTestId("loading-overlay")).toBeDefined();

      // Wait for initialization
      await waitForScreen(
        () => {
          expect(screen.queryByTestId("loading-overlay")).toBeNull();
        },
        { timeout: 10000 }
      );

      // Start login
      const accountHook = renderHook(() => useAbstraxionAccount(), {
        wrapper: createWrapper(signerConfig),
      });

      await act(async () => {
        await accountHook.result.current.login();
      });

      // Should show loading overlay during connection
      await waitForScreen(
        () => {
          expect(screen.getByTestId("loading-overlay")).toBeDefined();
        },
        { timeout: 5000 }
      );

      // Wait for connection
      await waitForScreen(
        () => {
          expect(screen.queryByTestId("loading-overlay")).toBeNull();
        },
        { timeout: 120000 }
      );
    });
  });
});

