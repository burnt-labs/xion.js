/**
 * useAbstraxionAccount Hook Integration Tests
 * Tests the complete React integration of the useAbstraxionAccount hook
 * across both redirect and signer authentication modes
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAbstraxionAccount } from "../../../src/hooks/useAbstraxionAccount";
import { AbstraxionProvider } from "../../../src/components/AbstraxionContext";
import { testConfig } from "../fixtures";
import type { ReactNode } from "react";

describe("useAbstraxionAccount Integration Tests", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const createWrapper = (config = testConfig.redirectMode) => {
    return ({ children }: { children: ReactNode }) => (
      <AbstraxionProvider config={config}>{children}</AbstraxionProvider>
    );
  };

  describe("Hook Returns Initial State Before Login", () => {
    it("should return disconnected state initially", async () => {
      const { result } = renderHook(() => useAbstraxionAccount(), {
        wrapper: createWrapper(),
      });

      // Wait for initialization to complete
      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.data.bech32Address).toBe("");
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBe("");
    });

    it("should have login and logout functions available", async () => {
      const { result } = renderHook(() => useAbstraxionAccount(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });

      expect(result.current.login).toBeDefined();
      expect(typeof result.current.login).toBe("function");
      expect(result.current.logout).toBeDefined();
      expect(typeof result.current.logout).toBe("function");
    });
  });

  describe("Hook Updates After Login (Redirect Mode)", () => {
    it("should have callable login function in redirect mode", async () => {
      const { result } = renderHook(() => useAbstraxionAccount(), {
        wrapper: createWrapper(testConfig.redirectMode),
      });

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });

      // In redirect mode, login triggers redirect (can't test full flow in jsdom)
      // But we can verify the login function is callable without throwing
      expect(result.current.login).toBeDefined();
      expect(typeof result.current.login).toBe("function");

      // Calling login in redirect mode should not throw an error
      // Note: It will attempt to redirect, which won't work in jsdom, but that's expected
      await expect(result.current.login()).resolves.not.toThrow();
    });
  });

  describe("Hook Updates After Login (Signer Mode)", () => {
    it(
      "should successfully connect with signer authentication",
      async () => {
        const signerConfig = testConfig.signerMode;

        const { result } = renderHook(() => useAbstraxionAccount(), {
          wrapper: createWrapper(signerConfig),
        });

        // Wait for initialization
        await waitFor(() => {
          expect(result.current.isInitializing).toBe(false);
        });

        // Verify initial state
        expect(result.current.isConnected).toBe(false);
        expect(result.current.data.bech32Address).toBe("");

        // Call login with signer
        await result.current.login();

        // Wait for connection - should succeed for valid configuration
        await waitFor(
          () => {
            expect(result.current.isConnected).toBe(true);
          },
          { timeout: 120000 } // Increased timeout for network operations and account creation
        );

        // Verify successful connection
        expect(result.current.isConnected).toBe(true);
        expect(result.current.data.bech32Address).toMatch(/^xion1[a-z0-9]+$/);
        expect(result.current.data.bech32Address.length).toBeGreaterThan(30);
        expect(result.current.isError).toBe(false);
        expect(result.current.error).toBe("");
      },
      180000 // 3 minute timeout for account creation and grant setup
    );

    it(
      "should transition through connecting states during login",
      async () => {
        const signerConfig = testConfig.signerMode;

        const { result } = renderHook(() => useAbstraxionAccount(), {
          wrapper: createWrapper(signerConfig),
        });

        // Wait for initialization
        await waitFor(() => {
          expect(result.current.isInitializing).toBe(false);
        });

        // Start login
        const loginPromise = result.current.login();

        // Should enter connecting state
        await waitFor(
          () => {
            expect(result.current.isConnecting).toBe(true);
          },
          { timeout: 5000 }
        );

        // isLoading should be true when connecting
        expect(result.current.isLoading).toBe(true);

        // Wait for login to complete
        await loginPromise;

        // Should eventually settle (connected or error)
        await waitFor(
          () => {
            const settled = result.current.isConnected || result.current.isError;
            expect(settled).toBe(true);
          },
          { timeout: 60000 }
        );

        // Should no longer be connecting
        expect(result.current.isConnecting).toBe(false);
        expect(result.current.isLoading).toBe(false);

        // Should have successfully connected
        expect(result.current.isConnected).toBe(true);
        expect(result.current.isError).toBe(false);
      },
      120000
    );
  });

  describe("Hook Handles Logout", () => {
    it(
      "should disconnect and clear account data (if connection succeeded)",
      async () => {
        const signerConfig = testConfig.signerMode;

        const { result } = renderHook(() => useAbstraxionAccount(), {
          wrapper: createWrapper(signerConfig),
        });

        // Login first
        await waitFor(() => expect(result.current.isInitializing).toBe(false));
        await result.current.login();

        // Wait for successful connection
        await waitFor(() => {
          expect(result.current.isConnected).toBe(true);
        }, {
          timeout: 120000,
        });

        // Verify connection succeeded
        expect(result.current.isConnected).toBe(true);
        expect(result.current.isError).toBe(false);

        // Connection succeeded - test logout
        const addressBeforeLogout = result.current.data.bech32Address;
        expect(addressBeforeLogout).toMatch(/^xion1[a-z0-9]+$/);

        // Logout
        await result.current.logout();

        await waitFor(() => {
          expect(result.current.isConnected).toBe(false);
        });

        // Verify account data is cleared
        expect(result.current.data.bech32Address).toBe("");
        expect(result.current.isConnecting).toBe(false);
        expect(result.current.isLoading).toBe(false);
        console.log("✅ Logout successful");
      },
      120000
    );

    it(
      "should clear localStorage on logout (if connection succeeded)",
      async () => {
        const signerConfig = testConfig.signerMode;

        const { result } = renderHook(() => useAbstraxionAccount(), {
          wrapper: createWrapper(signerConfig),
        });

        // Login first
        await waitFor(() => expect(result.current.isInitializing).toBe(false));
        await result.current.login();

        // Wait for successful connection
        await waitFor(() => {
          expect(result.current.isConnected).toBe(true);
        }, {
          timeout: 120000,
        });

        // Verify connection succeeded
        expect(result.current.isConnected).toBe(true);
        expect(result.current.isError).toBe(false);

        // Verify some session data exists in localStorage
        // (The exact key names depend on the implementation)
        const storageKeys = Object.keys(localStorage);
        const hasSessionData = storageKeys.some((key) =>
          key.includes("abstraxion")
        );
        expect(hasSessionData).toBe(true);

        // Logout
        await result.current.logout();

        await waitFor(() => {
          expect(result.current.isConnected).toBe(false);
        });

        // Verify localStorage is cleared
        // Note: Some implementations may keep certain keys, but session data should be gone
        const storageKeysAfter = Object.keys(localStorage);
        const hasSessionDataAfter = storageKeysAfter.some(
          (key) =>
            key.includes("abstraxion") &&
            !key.includes("config") &&
            !key.includes("settings")
        );
        expect(hasSessionDataAfter).toBe(false);
        console.log("✅ localStorage cleared successfully");
      },
      120000
    );
  });

  describe("Hook Persists Session on Remount", () => {
    it(
      "should restore session from localStorage (if connection succeeded)",
      async () => {
        const signerConfig = testConfig.signerMode;

        // First render: login
        const { result: firstResult, unmount } = renderHook(
          () => useAbstraxionAccount(),
          {
            wrapper: createWrapper(signerConfig),
          }
        );

        await waitFor(() =>
          expect(firstResult.current.isInitializing).toBe(false)
        );
        await firstResult.current.login();

        // Wait for successful connection
        await waitFor(() => {
          expect(firstResult.current.isConnected).toBe(true);
        }, {
          timeout: 120000,
        });

        // Verify connection succeeded
        expect(firstResult.current.isConnected).toBe(true);
        expect(firstResult.current.isError).toBe(false);

        const originalAddress = firstResult.current.data.bech32Address;
        expect(originalAddress).toMatch(/^xion1[a-z0-9]+$/);

        // Verify session data is in localStorage
        const storageKeys = Object.keys(localStorage);
        expect(storageKeys.length).toBeGreaterThan(0);

        // Unmount
        unmount();

        // Second render: should restore session
        const { result: secondResult } = renderHook(
          () => useAbstraxionAccount(),
          {
            wrapper: createWrapper(signerConfig),
          }
        );

        // Wait for initialization - session should be restored
        await waitFor(
          () => {
            expect(secondResult.current.isConnected).toBe(true);
          },
          { timeout: 30000 }
        );

        // Verify same account address is restored
        expect(secondResult.current.data.bech32Address).toBe(originalAddress);
        expect(secondResult.current.isError).toBe(false);
        console.log("✅ Session restored successfully");
      },
      120000
    );
  });

  describe("Hook State Consistency", () => {
    it("should have consistent loading states", async () => {
      const { result } = renderHook(() => useAbstraxionAccount(), {
        wrapper: createWrapper(),
      });

      // Initially initializing
      if (result.current.isInitializing) {
        expect(result.current.isLoading).toBe(true);
      }

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });

      // When not initializing and not connecting, isLoading should be false
      if (!result.current.isConnecting) {
        expect(result.current.isLoading).toBe(false);
      }
    });

    it("should not be connected when there's an error", async () => {
      const { result } = renderHook(() => useAbstraxionAccount(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });

      // When there's an error, should not be connected
      if (result.current.isError) {
        expect(result.current.isConnected).toBe(false);
      }
    });

    it("should have empty address when not connected", async () => {
      const { result } = renderHook(() => useAbstraxionAccount(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });

      if (!result.current.isConnected) {
        expect(result.current.data.bech32Address).toBe("");
      }
    });
  });
});
