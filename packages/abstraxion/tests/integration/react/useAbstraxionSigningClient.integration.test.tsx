/**
 * useAbstraxionSigningClient Hook Integration Tests
 * Tests the signing client hook that provides GranteeSignerClient for transaction signing
 * 
 * NOTE: This test depends on signer mode being fully functional.
 * The signing client is only available when connected via signer authentication.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAbstraxionSigningClient } from "../../../src/hooks/useAbstraxionSigningClient";
import { useAbstraxionAccount } from "../../../src/hooks/useAbstraxionAccount";
import { AbstraxionProvider } from "../../../src/components/AbstraxionContext";
import { getTestConfig } from "../fixtures";
import { createTestSecp256k1Connector, getSignerConfigFromConnectorResult } from "../helpers";
import type { ReactNode } from "react";

describe("useAbstraxionSigningClient Integration Tests", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const createWrapper = (config: any) => {
    return ({ children }: { children: ReactNode }) => (
      <AbstraxionProvider config={config}>{children}</AbstraxionProvider>
    );
  };

  describe("Hook Returns Signing Client When Connected", () => {
    it(
      "should return undefined client when not connected",
      async () => {
        const config = getTestConfig();
        const { result } = renderHook(() => useAbstraxionSigningClient(), {
          wrapper: createWrapper({
            chainId: config.chainId,
            rpcUrl: config.rpcUrl,
            authentication: {
              type: "signer",
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
          }),
        });

        // Wait for initialization
        await waitFor(() => {
          expect(result.current.client).toBeUndefined();
        }, { timeout: 5000 });

        // When not connected, client should be undefined
        expect(result.current.client).toBeUndefined();
        expect(result.current.signArb).toBeUndefined();
        expect(result.current.rpcUrl).toBeDefined();
      },
      10000
    );

    it(
      "should return signing client after successful connection",
      async () => {
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

        const { result: signingResult } = renderHook(() => useAbstraxionSigningClient(), {
          wrapper: createWrapper(signerConfig),
        });

        // Wait for initialization
        await waitFor(
          () => {
            expect(signingResult.current.rpcUrl).toBeDefined();
          },
          { timeout: 5000 }
        );

        expect(signingResult.current.rpcUrl).toBe(config.rpcUrl);
        
        // Initially undefined until connected
        expect(signingResult.current.client).toBeUndefined();
        expect(signingResult.current.signArb).toBeUndefined();

        // Login via useAbstraxionAccount hook
        const { result: accountResult } = renderHook(() => useAbstraxionAccount(), {
          wrapper: createWrapper(signerConfig),
        });

        await waitFor(() => {
          expect(accountResult.current.isInitializing).toBe(false);
        }, { timeout: 5000 });

        await accountResult.current.login();

        // Wait for connection
        await waitFor(
          () => {
            expect(accountResult.current.isConnected).toBe(true);
          },
          { timeout: 120000 }
        );

        // Now signing client should be available
        await waitFor(
          () => {
            expect(signingResult.current.client).toBeDefined();
            expect(signingResult.current.signArb).toBeDefined();
          },
          { timeout: 5000 }
        );

        expect(signingResult.current.client).toBeDefined();
        expect(signingResult.current.signArb).toBeDefined();
        expect(typeof signingResult.current.signArb).toBe("function");
      },
      180000
    );
  });

  describe("Signing Client Functionality", () => {
    it(
      "should provide signArb function when account is available",
      async () => {
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

        const { result } = renderHook(() => useAbstraxionSigningClient(), {
          wrapper: createWrapper(signerConfig),
        });

        // Wait for hook to initialize
        await waitFor(
          () => {
            expect(result.current.rpcUrl).toBeDefined();
          },
          { timeout: 5000 }
        );

        expect(result.current.rpcUrl).toBe(config.rpcUrl);
        
        // Initially undefined until connected
        expect(result.current.client).toBeUndefined();
        expect(result.current.signArb).toBeUndefined();

        // Login via useAbstraxionAccount hook
        const { result: accountResult } = renderHook(() => useAbstraxionAccount(), {
          wrapper: createWrapper(signerConfig),
        });

        await waitFor(() => {
          expect(accountResult.current.isInitializing).toBe(false);
        }, { timeout: 5000 });

        await accountResult.current.login();

        // Wait for connection
        await waitFor(
          () => {
            expect(accountResult.current.isConnected).toBe(true);
          },
          { timeout: 120000 }
        );

        // Verify client and signArb are available
        await waitFor(
          () => {
            expect(result.current.client).toBeDefined();
            expect(result.current.signArb).toBeDefined();
          },
          { timeout: 5000 }
        );

        expect(result.current.client).toBeDefined();
        expect(result.current.signArb).toBeDefined();
        expect(typeof result.current.signArb).toBe("function");

        // Test signing a message with signArb
        if (result.current.signArb && accountResult.current.data.bech32Address) {
          const testMessage = "test-message-for-signing";
          const signature = await result.current.signArb(
            accountResult.current.data.bech32Address,
            testMessage
          );
          expect(signature).toBeDefined();
          expect(typeof signature).toBe("string");
          expect(signature.length).toBeGreaterThan(0);
        }
      },
      10000
    );

    it(
      "should provide GranteeSignerClient for transaction signing",
      async () => {
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

        const { result } = renderHook(() => useAbstraxionSigningClient(), {
          wrapper: createWrapper(signerConfig),
        });

        // Wait for hook to initialize
        await waitFor(
          () => {
            expect(result.current.rpcUrl).toBeDefined();
          },
          { timeout: 5000 }
        );

        expect(result.current.rpcUrl).toBe(config.rpcUrl);
        
        // Initially undefined until connected
        expect(result.current.client).toBeUndefined();

        // Login via useAbstraxionAccount hook
        const { result: accountResult } = renderHook(() => useAbstraxionAccount(), {
          wrapper: createWrapper(signerConfig),
        });

        await waitFor(() => {
          expect(accountResult.current.isInitializing).toBe(false);
        }, { timeout: 5000 });

        await accountResult.current.login();

        // Wait for connection
        await waitFor(
          () => {
            expect(accountResult.current.isConnected).toBe(true);
          },
          { timeout: 120000 }
        );

        // Verify client is GranteeSignerClient instance
        await waitFor(
          () => {
            expect(result.current.client).toBeDefined();
          },
          { timeout: 5000 }
        );

        expect(result.current.client).toBeDefined();
        
        // Verify client has methods for transaction signing
        if (result.current.client) {
          expect(result.current.client).toHaveProperty("signAndBroadcast");
          expect(typeof result.current.client.signAndBroadcast).toBe("function");
        }
      },
      10000
    );
  });

  describe("Hook State Management", () => {
    it("should update client when connection state changes", async () => {
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

      const { result } = renderHook(() => useAbstraxionSigningClient(), {
        wrapper: createWrapper(signerConfig),
      });

      // Initially undefined
      await waitFor(
        () => {
          expect(result.current.rpcUrl).toBeDefined();
        },
        { timeout: 5000 }
      );

      expect(result.current.client).toBeUndefined();

      // Login via useAbstraxionAccount hook
      const { result: accountResult } = renderHook(() => useAbstraxionAccount(), {
        wrapper: createWrapper(signerConfig),
      });

      await waitFor(() => {
        expect(accountResult.current.isInitializing).toBe(false);
      }, { timeout: 5000 });

      await accountResult.current.login();

      // Wait for connection
      await waitFor(
        () => {
          expect(accountResult.current.isConnected).toBe(true);
        },
        { timeout: 120000 }
      );

      // Verify client becomes available
      await waitFor(
        () => {
          expect(result.current.client).toBeDefined();
        },
        { timeout: 5000 }
      );

      expect(result.current.client).toBeDefined();

      // Logout
      await accountResult.current.logout();

      // Wait for logout
      await waitFor(
        () => {
          expect(accountResult.current.isConnected).toBe(false);
        },
        { timeout: 10000 }
      );

      // Verify client becomes undefined again
      await waitFor(
        () => {
          expect(result.current.client).toBeUndefined();
        },
        { timeout: 5000 }
      );

      expect(result.current.client).toBeUndefined();
      expect(result.current.signArb).toBeUndefined();
    });

    it("should maintain rpcUrl even when disconnected", async () => {
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

      const { result } = renderHook(() => useAbstraxionSigningClient(), {
        wrapper: createWrapper(signerConfig),
      });

      // rpcUrl should always be available
      await waitFor(
        () => {
          expect(result.current.rpcUrl).toBeDefined();
        },
        { timeout: 5000 }
      );

      expect(result.current.rpcUrl).toBe(config.rpcUrl);

      // Even when disconnected, rpcUrl should remain
      expect(result.current.rpcUrl).toBe(config.rpcUrl);
    });
  });
});

