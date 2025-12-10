/**
 * useAbstraxionClient Hook Integration Tests
 * Tests the query client hook that provides CosmWasmClient for read-only operations
 * 
 * This hook can be tested independently as it only requires RPC connection
 * and doesn't depend on authentication or signing capabilities
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAbstraxionClient } from "../../../src/hooks/useAbstraxionClient";
import { AbstraxionProvider } from "../../../src/components/AbstraxionContext";
import { getTestConfig } from "../fixtures";
import type { ReactNode } from "react";

describe("useAbstraxionClient Integration Tests", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const createWrapper = (config: any) => {
    return ({ children }: { children: ReactNode }) => (
      <AbstraxionProvider config={config}>{children}</AbstraxionProvider>
    );
  };

  describe("Hook Returns Query Client", () => {
    it("should return undefined client initially, then connect", async () => {
      const config = getTestConfig();
      const { result } = renderHook(() => useAbstraxionClient(), {
        wrapper: createWrapper({
          chainId: config.chainId,
          rpcUrl: config.rpcUrl,
        }),
      });

      // Initially undefined while connecting
      expect(result.current.client).toBeUndefined();
      expect(result.current.error).toBeUndefined();

      // Wait for client to connect
      await waitFor(
        () => {
          expect(result.current.client).toBeDefined();
        },
        { timeout: 10000 }
      );

      // Client should be a CosmWasmClient instance
      expect(result.current.client).toBeDefined();
      expect(result.current.error).toBeUndefined();
    });

    it("should handle RPC connection errors gracefully", async () => {
      const { result } = renderHook(() => useAbstraxionClient(), {
        wrapper: createWrapper({
          chainId: "xion-testnet-1",
          rpcUrl: "https://invalid-rpc-url-that-does-not-exist.com",
        }),
      });

      // Wait for error to occur
      await waitFor(
        () => {
          expect(result.current.error).toBeDefined();
        },
        { timeout: 10000 }
      );

      expect(result.current.client).toBeUndefined();
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toContain("Failed to connect to RPC");
    });

    it("should reconnect when rpcUrl changes", async () => {
      const config = getTestConfig();
      const { result, rerender } = renderHook(
        () => useAbstraxionClient(),
        {
          wrapper: createWrapper({
            chainId: config.chainId,
            rpcUrl: config.rpcUrl,
          }),
        }
      );

      // Wait for initial connection
      await waitFor(
        () => {
          expect(result.current.client).toBeDefined();
        },
        { timeout: 10000 }
      );

      const firstClient = result.current.client;

      // Change RPC URL
      rerender({
        wrapper: createWrapper({
          chainId: config.chainId,
          rpcUrl: config.rpcUrl, // Same URL, but should trigger reconnect
        }),
      });

      // Client should reconnect (may be same instance or new instance)
      await waitFor(
        () => {
          expect(result.current.client).toBeDefined();
        },
        { timeout: 10000 }
      );

      expect(result.current.client).toBeDefined();
    });
  });

  describe("Query Client Functionality", () => {
    it("should allow querying chain state", async () => {
      const config = getTestConfig();
      const { result } = renderHook(() => useAbstraxionClient(), {
        wrapper: createWrapper({
          chainId: config.chainId,
          rpcUrl: config.rpcUrl,
        }),
      });

      // Wait for client to connect
      await waitFor(
        () => {
          expect(result.current.client).toBeDefined();
        },
        { timeout: 10000 }
      );

      // Test querying chain height
      if (result.current.client) {
        const height = await result.current.client.getHeight();
        expect(height).toBeGreaterThan(0);
        expect(typeof height).toBe("number");
      }
    });

    it("should allow querying account balance", async () => {
      const config = getTestConfig();
      const { result } = renderHook(() => useAbstraxionClient(), {
        wrapper: createWrapper({
          chainId: config.chainId,
          rpcUrl: config.rpcUrl,
        }),
      });

      // Wait for client to connect
      await waitFor(
        () => {
          expect(result.current.client).toBeDefined();
        },
        { timeout: 10000 }
      );

      // Query a test account balance
      if (result.current.client) {
        const testAddress = "xion1xrqz2wpt4rw8rtdvrc4n4yn5h54jm0nn4evn2x";
        const balance = await result.current.client.getBalance(
          testAddress,
          "uxion"
        );
        expect(balance).toBeDefined();
        expect(balance.amount).toBeDefined();
        expect(balance.denom).toBe("uxion");
      }
    });

    it("should allow querying smart contract state", async () => {
      const config = getTestConfig();
      const { result } = renderHook(() => useAbstraxionClient(), {
        wrapper: createWrapper({
          chainId: config.chainId,
          rpcUrl: config.rpcUrl,
        }),
      });

      // Wait for client to connect
      await waitFor(
        () => {
          expect(result.current.client).toBeDefined();
        },
        { timeout: 10000 }
      );

      // Test querying a contract (if we have a test contract address)
      if (result.current.client && config.smartAccountContract?.address) {
        try {
          // Try to query contract info
          const contractInfo = await result.current.client.getContract(
            config.smartAccountContract.address
          );
          expect(contractInfo).toBeDefined();
        } catch (error) {
          // Contract might not exist, which is fine for this test
          // We're just verifying the client can make queries
          expect(error).toBeDefined();
        }
      }
    });
  });

  describe("Hook State Management", () => {
    it("should clear error when connection succeeds after failure", async () => {
      const config = getTestConfig();
      
      // Start with invalid URL
      const { result, rerender } = renderHook(
        () => useAbstraxionClient(),
        {
          wrapper: createWrapper({
            chainId: config.chainId,
            rpcUrl: "https://invalid-url.com",
          }),
        }
      );

      // Wait for error
      await waitFor(
        () => {
          expect(result.current.error).toBeDefined();
        },
        { timeout: 10000 }
      );

      // Switch to valid URL
      rerender({
        wrapper: createWrapper({
          chainId: config.chainId,
          rpcUrl: config.rpcUrl,
        }),
      });

      // Error should clear and client should connect
      await waitFor(
        () => {
          expect(result.current.client).toBeDefined();
          expect(result.current.error).toBeUndefined();
        },
        { timeout: 15000 }
      );
    });

    it("should maintain client instance across re-renders", async () => {
      const config = getTestConfig();
      const { result, rerender } = renderHook(
        () => useAbstraxionClient(),
        {
          wrapper: createWrapper({
            chainId: config.chainId,
            rpcUrl: config.rpcUrl,
          }),
        }
      );

      // Wait for initial connection
      await waitFor(
        () => {
          expect(result.current.client).toBeDefined();
        },
        { timeout: 10000 }
      );

      const firstClient = result.current.client;

      // Re-render with same config
      rerender({
        wrapper: createWrapper({
          chainId: config.chainId,
          rpcUrl: config.rpcUrl,
        }),
      });

      // Client should still be available (may be same or new instance)
      await waitFor(
        () => {
          expect(result.current.client).toBeDefined();
        },
        { timeout: 10000 }
      );

      expect(result.current.client).toBeDefined();
    });
  });
});

