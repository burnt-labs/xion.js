/**
 * AbstraxionProvider Integration Tests - Redirect Mode
 * Tests the provider component with redirect-based authentication
 * 
 * This can proceed independently as redirect mode doesn't depend on signer fixes
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, waitFor, screen } from "@testing-library/react";
import { AbstraxionProvider } from "../../../src/components/AbstraxionContext";
import { useAbstraxionAccount } from "../../../src/hooks/useAbstraxionAccount";
import { getTestConfig } from "../fixtures";
import type { ReactNode } from "react";

// Test component that uses the hooks
function TestComponent() {
  const account = useAbstraxionAccount();
  
  return (
    <div>
      <div data-testid="is-connected">{account.isConnected ? "connected" : "disconnected"}</div>
      <div data-testid="is-initializing">{account.isInitializing ? "initializing" : "ready"}</div>
      <div data-testid="is-connecting">{account.isConnecting ? "connecting" : "idle"}</div>
      <div data-testid="address">{account.data.bech32Address}</div>
      <div data-testid="error">{account.error}</div>
      <button data-testid="login-btn" onClick={() => account.login()}>Login</button>
      <button data-testid="logout-btn" onClick={() => account.logout()}>Logout</button>
    </div>
  );
}

describe("AbstraxionProvider - Redirect Mode Integration Tests", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    
    // Mock window.location for redirect tests
    delete (window as any).location;
    (window as any).location = {
      href: "http://localhost:3000",
      assign: vi.fn(),
      replace: vi.fn(),
    };
  });

  describe("Provider Initialization", () => {
    it("should initialize provider with redirect config", async () => {
      const config = getTestConfig();
      const redirectConfig = {
        chainId: config.chainId,
        rpcUrl: config.rpcUrl,
        gasPrice: config.gasPrice,
        authentication: {
          type: "redirect" as const,
          dashboardUrl: "https://dashboard.test.com",
        },
      };

      render(
        <AbstraxionProvider config={redirectConfig}>
          <TestComponent />
        </AbstraxionProvider>
      );

      // Wait for initialization to complete
      await waitFor(
        () => {
          const initializing = screen.getByTestId("is-initializing");
          expect(initializing.textContent).toBe("ready");
        },
        { timeout: 10000 }
      );

      // Should start disconnected
      const connected = screen.getByTestId("is-connected");
      expect(connected.textContent).toBe("disconnected");
    });

    it("should handle missing dashboardUrl gracefully", async () => {
      const config = getTestConfig();
      const redirectConfig = {
        chainId: config.chainId,
        rpcUrl: config.rpcUrl,
        gasPrice: config.gasPrice,
        authentication: {
          type: "redirect" as const,
          // No dashboardUrl - should use default
        },
      };

      render(
        <AbstraxionProvider config={redirectConfig}>
          <TestComponent />
        </AbstraxionProvider>
      );

      await waitFor(
        () => {
          const initializing = screen.getByTestId("is-initializing");
          expect(initializing.textContent).toBe("ready");
        },
        { timeout: 10000 }
      );

      // Should still initialize successfully
      const connected = screen.getByTestId("is-connected");
      expect(connected.textContent).toBe("disconnected");
    });
  });

  describe("Redirect Authentication Flow", () => {
    it("should trigger redirect when login is called", async () => {
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
          <TestComponent />
        </AbstraxionProvider>
      );

      // Wait for initialization
      await waitFor(
        () => {
          const initializing = screen.getByTestId("is-initializing");
          expect(initializing.textContent).toBe("ready");
        },
        { timeout: 10000 }
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
        { timeout: 5000 }
      );

      // In redirect mode, login should trigger redirect
      // Note: Actual redirect won't work in jsdom, but we can verify the state change
      expect(window.location.assign).toHaveBeenCalled();
    });

    it("should handle redirect callback when returning from auth", async () => {
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

      // Simulate returning from redirect with granted=true
      const originalSearch = window.location.search;
      Object.defineProperty(window, "location", {
        value: {
          ...window.location,
          search: "?granted=true&granter=xion1test",
        },
        writable: true,
      });

      render(
        <AbstraxionProvider config={redirectConfig}>
          <TestComponent />
        </AbstraxionProvider>
      );

      // Provider should detect redirect callback
      await waitFor(
        () => {
          const connecting = screen.getByTestId("is-connecting");
          // Should enter connecting state when returning from redirect
          expect(connecting.textContent).toBe("connecting");
        },
        { timeout: 10000 }
      );

      // Restore original location
      Object.defineProperty(window, "location", {
        value: {
          ...window.location,
          search: originalSearch,
        },
        writable: true,
      });
    });
  });

  describe("Provider State Management", () => {
    it("should provide context values to children", async () => {
      const config = getTestConfig();
      const redirectConfig = {
        chainId: config.chainId,
        rpcUrl: config.rpcUrl,
        gasPrice: config.gasPrice,
        authentication: {
          type: "redirect" as const,
          dashboardUrl: "https://dashboard.test.com",
        },
      };

      render(
        <AbstraxionProvider config={redirectConfig}>
          <TestComponent />
        </AbstraxionProvider>
      );

      await waitFor(
        () => {
          const initializing = screen.getByTestId("is-initializing");
          expect(initializing.textContent).toBe("ready");
        },
        { timeout: 10000 }
      );

      // All context values should be accessible
      expect(screen.getByTestId("is-connected")).toBeDefined();
      expect(screen.getByTestId("is-initializing")).toBeDefined();
      expect(screen.getByTestId("is-connecting")).toBeDefined();
      expect(screen.getByTestId("address")).toBeDefined();
      expect(screen.getByTestId("login-btn")).toBeDefined();
      expect(screen.getByTestId("logout-btn")).toBeDefined();
    });

    it("should handle config changes", async () => {
      const config = getTestConfig();
      const redirectConfig = {
        chainId: config.chainId,
        rpcUrl: config.rpcUrl,
        gasPrice: config.gasPrice,
        authentication: {
          type: "redirect" as const,
          dashboardUrl: "https://dashboard.test.com",
        },
      };

      const { rerender } = render(
        <AbstraxionProvider config={redirectConfig}>
          <TestComponent />
        </AbstraxionProvider>
      );

      await waitFor(
        () => {
          const initializing = screen.getByTestId("is-initializing");
          expect(initializing.textContent).toBe("ready");
        },
        { timeout: 10000 }
      );

      // Change config
      const newConfig = {
        ...redirectConfig,
        gasPrice: "0.002uxion",
      };

      rerender(
        <AbstraxionProvider config={newConfig}>
          <TestComponent />
        </AbstraxionProvider>
      );

      // Provider should handle config change
      await waitFor(
        () => {
          const initializing = screen.getByTestId("is-initializing");
          expect(initializing.textContent).toBe("ready");
        },
        { timeout: 10000 }
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid RPC URL", async () => {
      const redirectConfig = {
        chainId: "xion-testnet-1",
        rpcUrl: "https://invalid-rpc-url.com",
        gasPrice: "0.001uxion",
        authentication: {
          type: "redirect" as const,
          dashboardUrl: "https://dashboard.test.com",
        },
      };

      render(
        <AbstraxionProvider config={redirectConfig}>
          <TestComponent />
        </AbstraxionProvider>
      );

      // Should still initialize (errors handled internally)
      await waitFor(
        () => {
          const initializing = screen.getByTestId("is-initializing");
          expect(initializing.textContent).toBe("ready");
        },
        { timeout: 10000 }
      );
    });
  });
});

