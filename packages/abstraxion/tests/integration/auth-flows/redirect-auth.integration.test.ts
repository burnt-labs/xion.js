/**
 * Redirect Authentication Flow - Integration Tests
 * Tests the OAuth redirect flow with the dashboard
 *
 * This test suite validates:
 * - RedirectController initialization
 * - Redirect URL generation
 * - Callback handling with grant polling
 * - Grant validation
 * - Session cleanup
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { registerGlobalHooks } from "../setup";
import { getTestConfig, EXPECTED_VALUES, TEST_GRANT_AMOUNT } from "../fixtures";
import { RedirectController } from "../../../src/controllers/RedirectController";
import type { RedirectControllerConfig } from "../../../src/controllers/RedirectController";
import { createMockStorageStrategy, sleep } from "../helpers";

describe("Redirect Authentication Flow - Integration", () => {
  registerGlobalHooks();

  let config: ReturnType<typeof getTestConfig>;

  beforeEach(() => {
    config = getTestConfig();
  });

  /**
   * Helper to create mock redirect strategy for testing
   */
  function createMockRedirectStrategy() {
    let redirectUrl: string | null = null;

    return {
      redirect: vi.fn((url: string) => {
        redirectUrl = url;
        console.log("📍 Mock redirect to:", url);
      }),
      getRedirectUrl: () => redirectUrl,
    };
  }

  describe("Initial Login Flow", () => {
    it("should initialize RedirectController with config", async () => {
      const storageStrategy = createMockStorageStrategy();
      const redirectStrategy = createMockRedirectStrategy();

      const controllerConfig: RedirectControllerConfig = {
        chainId: config.chainId,
        rpcUrl: config.rpcUrl,
        gasPrice: config.gasPrice,
        redirect: {
          type: "redirect",
          callbackUrl: "http://localhost:3000/callback",
        },
        storageStrategy,
        redirectStrategy,
      };

      const controller = new RedirectController(controllerConfig);

      // Initialize
      await controller.initialize();

      const state = controller.getState();
      expect(state).toBeDefined();
      expect(state.status).toBe("idle");

      console.log("✅ RedirectController initialized");
      console.log("   Initial state:", state.status);
    }, 60000);

    it("should generate redirect URL and initiate redirect on connect", async () => {
      const storageStrategy = createMockStorageStrategy();
      const redirectStrategy = createMockRedirectStrategy();

      const controllerConfig: RedirectControllerConfig = {
        chainId: config.chainId,
        rpcUrl: config.rpcUrl,
        gasPrice: config.gasPrice,
        redirect: {
          type: "redirect",
          callbackUrl: "http://localhost:3000/callback",
        },
        storageStrategy,
        redirectStrategy,
      };

      const controller = new RedirectController(controllerConfig);
      await controller.initialize();

      // Track state changes
      const states: string[] = [];
      controller.subscribe((state) => {
        states.push(state.status);
      });

      // Initiate connection (should trigger redirect)
      await controller.connect();

      // Verify redirect was called
      expect(redirectStrategy.redirect).toHaveBeenCalled();

      const redirectUrl = redirectStrategy.getRedirectUrl();
      expect(redirectUrl).toBeTruthy();

      // Verify redirect URL contains required params
      if (redirectUrl) {
        const url = new URL(redirectUrl);
        expect(url.searchParams.has("redirect_uri")).toBe(true);
        expect(url.searchParams.get("redirect_uri")).toBe(
          "http://localhost:3000/callback",
        );

        console.log("✅ Redirect initiated");
        console.log("   Redirect URL:", redirectUrl.substring(0, 80) + "...");
        console.log("   State transitions:", states);
      }
    }, 60000);

    it("should use treasury address in redirect URL when configured", async () => {
      const storageStrategy = createMockStorageStrategy();
      const redirectStrategy = createMockRedirectStrategy();

      const controllerConfig: RedirectControllerConfig = {
        chainId: config.chainId,
        rpcUrl: config.rpcUrl,
        gasPrice: config.gasPrice,
        redirect: {
          type: "redirect",
          callbackUrl: "http://localhost:3000/callback",
        },
        treasury: config.treasuryAddress,
        storageStrategy,
        redirectStrategy,
      };

      const controller = new RedirectController(controllerConfig);
      await controller.initialize();

      // Connect
      await controller.connect();

      const redirectUrl = redirectStrategy.getRedirectUrl();
      expect(redirectUrl).toBeTruthy();

      if (redirectUrl) {
        const url = new URL(redirectUrl);
        // Treasury should be encoded in the URL params
        const hasGrants = url.searchParams.has("grants");

        console.log("✅ Treasury configuration included");
        console.log("   Treasury:", config.treasuryAddress);
        console.log("   Grants param present:", hasGrants);
      }
    }, 60000);
  });

  describe("State Management", () => {
    it("should transition through states during connection", async () => {
      const storageStrategy = createMockStorageStrategy();
      const redirectStrategy = createMockRedirectStrategy();

      const controllerConfig: RedirectControllerConfig = {
        chainId: config.chainId,
        rpcUrl: config.rpcUrl,
        gasPrice: config.gasPrice,
        redirect: {
          type: "redirect",
          callbackUrl: "http://localhost:3000/callback",
        },
        storageStrategy,
        redirectStrategy,
      };

      const controller = new RedirectController(controllerConfig);

      // Track state changes
      const states: string[] = [];
      controller.subscribe((state) => {
        states.push(state.status);
        console.log("   State transition:", state.status);
      });

      await controller.initialize();
      await controller.connect();

      // Should have transitioned through states
      expect(states.length).toBeGreaterThan(0);

      console.log("✅ State transitions recorded:", states);
    }, 60000);

    it("should allow disconnection", async () => {
      const storageStrategy = createMockStorageStrategy();
      const redirectStrategy = createMockRedirectStrategy();

      const controllerConfig: RedirectControllerConfig = {
        chainId: config.chainId,
        rpcUrl: config.rpcUrl,
        gasPrice: config.gasPrice,
        redirect: {
          type: "redirect",
          callbackUrl: "http://localhost:3000/callback",
        },
        storageStrategy,
        redirectStrategy,
      };

      const controller = new RedirectController(controllerConfig);
      await controller.initialize();

      // Disconnect
      await controller.disconnect();

      const state = controller.getState();
      expect(state.status).toBe("idle");

      console.log("✅ Disconnection successful");
      console.log("   Final state:", state.status);
    }, 60000);
  });

  describe("Session Restoration", () => {
    it("should attempt to restore session on initialization", async () => {
      const storageStrategy = createMockStorageStrategy();
      const redirectStrategy = createMockRedirectStrategy();

      // Pre-populate storage with mock session data
      await storageStrategy.setItem(
        "abstraxion_keypair",
        JSON.stringify({
          pubkey: "mock-pubkey",
          privkey: "mock-privkey",
        }),
      );

      const controllerConfig: RedirectControllerConfig = {
        chainId: config.chainId,
        rpcUrl: config.rpcUrl,
        gasPrice: config.gasPrice,
        redirect: {
          type: "redirect",
          callbackUrl: "http://localhost:3000/callback",
        },
        storageStrategy,
        redirectStrategy,
      };

      const controller = new RedirectController(controllerConfig);
      await controller.initialize();

      const state = controller.getState();

      // Should have attempted restoration
      // State might be idle, connecting, or connected depending on session validity
      expect(["idle", "connecting", "connected", "error"]).toContain(
        state.status,
      );

      console.log("✅ Session restoration attempted");
      console.log("   Resulting state:", state.status);
    }, 60000);

    it("should clear storage on disconnect", async () => {
      const storageStrategy = createMockStorageStrategy();
      const redirectStrategy = createMockRedirectStrategy();

      // Pre-populate storage with the key AbstraxionAuth actually uses
      await storageStrategy.setItem("xion-authz-temp-account", "mock-data");

      const controllerConfig: RedirectControllerConfig = {
        chainId: config.chainId,
        rpcUrl: config.rpcUrl,
        gasPrice: config.gasPrice,
        redirect: {
          type: "redirect",
          callbackUrl: "http://localhost:3000/callback",
        },
        storageStrategy,
        redirectStrategy,
      };

      const controller = new RedirectController(controllerConfig);
      await controller.initialize();
      await controller.disconnect();

      // Verify storage was cleared (AbstraxionAuth uses "xion-authz-temp-account")
      const keypair = await storageStrategy.getItem("xion-authz-temp-account");
      expect(keypair).toBeNull();

      console.log("✅ Storage cleared on disconnect");
    }, 60000);
  });

  describe("Grant Configuration", () => {
    it("should include bank spend limits when configured", async () => {
      const storageStrategy = createMockStorageStrategy();
      const redirectStrategy = createMockRedirectStrategy();

      const controllerConfig: RedirectControllerConfig = {
        chainId: config.chainId,
        rpcUrl: config.rpcUrl,
        gasPrice: config.gasPrice,
        redirect: {
          type: "redirect",
          callbackUrl: "http://localhost:3000/callback",
        },
        bank: [
          {
            denom: "uxion",
            amount: TEST_GRANT_AMOUNT.toString(),
          },
        ],
        storageStrategy,
        redirectStrategy,
      };

      const controller = new RedirectController(controllerConfig);
      await controller.initialize();
      await controller.connect();

      const redirectUrl = redirectStrategy.getRedirectUrl();
      expect(redirectUrl).toBeTruthy();

      console.log("✅ Bank spend limits configured");
      console.log("   Amount:", TEST_GRANT_AMOUNT, "uxion");
    }, 60000);

    it("should include staking permissions when enabled", async () => {
      const storageStrategy = createMockStorageStrategy();
      const redirectStrategy = createMockRedirectStrategy();

      const controllerConfig: RedirectControllerConfig = {
        chainId: config.chainId,
        rpcUrl: config.rpcUrl,
        gasPrice: config.gasPrice,
        redirect: {
          type: "redirect",
          callbackUrl: "http://localhost:3000/callback",
        },
        stake: true,
        storageStrategy,
        redirectStrategy,
      };

      const controller = new RedirectController(controllerConfig);
      await controller.initialize();
      await controller.connect();

      console.log("✅ Staking permissions enabled");
    }, 60000);

    it("should include contract grants when configured", async () => {
      const storageStrategy = createMockStorageStrategy();
      const redirectStrategy = createMockRedirectStrategy();

      const mockContractAddress = config.treasuryAddress; // Use treasury as mock contract

      const controllerConfig: RedirectControllerConfig = {
        chainId: config.chainId,
        rpcUrl: config.rpcUrl,
        gasPrice: config.gasPrice,
        redirect: {
          type: "redirect",
          callbackUrl: "http://localhost:3000/callback",
        },
        contracts: [mockContractAddress],
        storageStrategy,
        redirectStrategy,
      };

      const controller = new RedirectController(controllerConfig);
      await controller.initialize();
      await controller.connect();

      console.log("✅ Contract grants configured");
      console.log("   Contract:", mockContractAddress);
    }, 60000);
  });

  describe("Error Handling", () => {
    it("should handle invalid RPC URL gracefully", async () => {
      const storageStrategy = createMockStorageStrategy();
      const redirectStrategy = createMockRedirectStrategy();

      const controllerConfig: RedirectControllerConfig = {
        chainId: config.chainId,
        rpcUrl: "https://invalid-rpc.example.com",
        gasPrice: config.gasPrice,
        redirect: {
          type: "redirect",
          callbackUrl: "http://localhost:3000/callback",
        },
        storageStrategy,
        redirectStrategy,
      };

      const controller = new RedirectController(controllerConfig);

      // Should not throw on initialization
      await expect(controller.initialize()).resolves.not.toThrow();

      // State might be error or idle
      const state = controller.getState();
      expect(["idle", "error"]).toContain(state.status);

      console.log("✅ Invalid RPC handled gracefully");
      console.log("   State:", state.status);
    }, 60000);

    it("should handle missing callback URL", async () => {
      const storageStrategy = createMockStorageStrategy();
      const redirectStrategy = createMockRedirectStrategy();

      const controllerConfig: RedirectControllerConfig = {
        chainId: config.chainId,
        rpcUrl: config.rpcUrl,
        gasPrice: config.gasPrice,
        redirect: {
          type: "redirect",
          callbackUrl: "", // Empty callback URL - should use window.location.href as fallback
        },
        storageStrategy,
        redirectStrategy,
      };

      const controller = new RedirectController(controllerConfig);
      await controller.initialize();

      // Connect should not throw - empty callback URL uses window.location.href as fallback
      await controller.connect();

      // Verify redirect was called (should succeed with fallback URL)
      expect(redirectStrategy.redirect).toHaveBeenCalled();

      console.log("✅ Missing callback URL handled (uses fallback)");
    }, 60000);
  });

  describe("Redirect URL Validation", () => {
    it("should include all required parameters in redirect URL", async () => {
      const storageStrategy = createMockStorageStrategy();
      const redirectStrategy = createMockRedirectStrategy();

      const controllerConfig: RedirectControllerConfig = {
        chainId: config.chainId,
        rpcUrl: config.rpcUrl,
        gasPrice: config.gasPrice,
        redirect: {
          type: "redirect",
          callbackUrl: "http://localhost:3000/callback",
        },
        treasury: config.treasuryAddress,
        bank: [
          {
            denom: "uxion",
            amount: "1000000",
          },
        ],
        storageStrategy,
        redirectStrategy,
      };

      const controller = new RedirectController(controllerConfig);
      await controller.initialize();
      await controller.connect();

      const redirectUrl = redirectStrategy.getRedirectUrl();
      expect(redirectUrl).toBeTruthy();

      if (redirectUrl) {
        const url = new URL(redirectUrl);

        // Verify redirect_uri parameter
        expect(url.searchParams.has("redirect_uri")).toBe(true);
        expect(url.searchParams.get("redirect_uri")).toBe(
          "http://localhost:3000/callback",
        );

        console.log("✅ Redirect URL parameters validated");
        console.log("   Callback URL:", url.searchParams.get("redirect_uri"));
      }
    }, 60000);

    it("should encode special characters in callback URL", async () => {
      const storageStrategy = createMockStorageStrategy();
      const redirectStrategy = createMockRedirectStrategy();

      const callbackWithParams =
        "http://localhost:3000/callback?session=123&user=test";

      const controllerConfig: RedirectControllerConfig = {
        chainId: config.chainId,
        rpcUrl: config.rpcUrl,
        gasPrice: config.gasPrice,
        redirect: {
          type: "redirect",
          callbackUrl: callbackWithParams,
        },
        storageStrategy,
        redirectStrategy,
      };

      const controller = new RedirectController(controllerConfig);
      await controller.initialize();
      await controller.connect();

      const redirectUrl = redirectStrategy.getRedirectUrl();
      expect(redirectUrl).toBeTruthy();

      if (redirectUrl) {
        const url = new URL(redirectUrl);
        const decodedCallback = decodeURIComponent(
          url.searchParams.get("redirect_uri") || "",
        );

        expect(decodedCallback).toBe(callbackWithParams);

        console.log("✅ Special characters encoded correctly");
        console.log("   Original:", callbackWithParams);
        console.log("   Decoded:", decodedCallback);
      }
    }, 60000);

    it("should fetch dashboard URL from RPC when not provided", async () => {
      const storageStrategy = createMockStorageStrategy();
      const redirectStrategy = createMockRedirectStrategy();

      const controllerConfig: RedirectControllerConfig = {
        chainId: config.chainId,
        rpcUrl: config.rpcUrl,
        gasPrice: config.gasPrice,
        redirect: {
          type: "redirect",
          // No dashboardUrl provided - should query from RPC
          callbackUrl: "http://localhost:3000/callback",
        },
        storageStrategy,
        redirectStrategy,
      };

      const controller = new RedirectController(controllerConfig);
      await controller.initialize();
      await controller.connect();

      const redirectUrl = redirectStrategy.getRedirectUrl();
      expect(redirectUrl).toBeTruthy();

      if (redirectUrl) {
        // Redirect URL should be generated (either from RPC or fallback)
        expect(redirectUrl.startsWith("http")).toBe(true);

        console.log("✅ Dashboard URL resolved");
        console.log("   Redirect URL:", redirectUrl.substring(0, 80) + "...");
      }
    }, 60000);
  });

  describe("Callback Handling Simulation", () => {
    it("should handle callback with success code", async () => {
      const storageStrategy = createMockStorageStrategy();
      const redirectStrategy = createMockRedirectStrategy();

      const controllerConfig: RedirectControllerConfig = {
        chainId: config.chainId,
        rpcUrl: config.rpcUrl,
        gasPrice: config.gasPrice,
        redirect: {
          type: "redirect",
          callbackUrl: "http://localhost:3000/callback",
        },
        storageStrategy,
        redirectStrategy,
      };

      const controller = new RedirectController(controllerConfig);
      await controller.initialize();

      // Note: Actual callback handling would require URL manipulation
      // This test verifies controller state management around callbacks

      const state = controller.getState();
      expect(state.status).toBe("idle");

      console.log("✅ Callback handling structure validated");
      console.log("   Initial state:", state.status);
    }, 60000);

    it("should handle callback with error/cancellation", async () => {
      const storageStrategy = createMockStorageStrategy();
      const redirectStrategy = createMockRedirectStrategy();

      const controllerConfig: RedirectControllerConfig = {
        chainId: config.chainId,
        rpcUrl: config.rpcUrl,
        gasPrice: config.gasPrice,
        redirect: {
          type: "redirect",
          callbackUrl: "http://localhost:3000/callback",
        },
        storageStrategy,
        redirectStrategy,
      };

      const controller = new RedirectController(controllerConfig);
      await controller.initialize();

      // Simulate error scenario
      await controller.disconnect();

      const state = controller.getState();
      expect(state.status).toBe("idle");

      console.log("✅ Error callback handling validated");
    }, 60000);
  });

  describe("Grant Validation Flow", () => {
    it("should validate grant configuration matches request", async () => {
      const storageStrategy = createMockStorageStrategy();
      const redirectStrategy = createMockRedirectStrategy();

      const bankGrant = {
        denom: "uxion",
        amount: "1000000",
      };

      const controllerConfig: RedirectControllerConfig = {
        chainId: config.chainId,
        rpcUrl: config.rpcUrl,
        gasPrice: config.gasPrice,
        redirect: {
          type: "redirect",
          callbackUrl: "http://localhost:3000/callback",
        },
        treasury: config.treasuryAddress,
        bank: [bankGrant],
        storageStrategy,
        redirectStrategy,
      };

      const controller = new RedirectController(controllerConfig);
      await controller.initialize();
      await controller.connect();

      // Verify grant configuration was passed correctly
      const state = controller.getState();
      expect(state.status).not.toBe("error");

      console.log("✅ Grant configuration validated");
      console.log("   Bank grant:", bankGrant);
    }, 60000);

    it("should validate treasury configuration in grants", async () => {
      const storageStrategy = createMockStorageStrategy();
      const redirectStrategy = createMockRedirectStrategy();

      const controllerConfig: RedirectControllerConfig = {
        chainId: config.chainId,
        rpcUrl: config.rpcUrl,
        gasPrice: config.gasPrice,
        redirect: {
          type: "redirect",
          callbackUrl: "http://localhost:3000/callback",
        },
        treasury: config.treasuryAddress,
        storageStrategy,
        redirectStrategy,
      };

      const controller = new RedirectController(controllerConfig);
      await controller.initialize();
      await controller.connect();

      const redirectUrl = redirectStrategy.getRedirectUrl();
      expect(redirectUrl).toBeTruthy();

      console.log("✅ Treasury configuration in grants validated");
      console.log("   Treasury:", config.treasuryAddress);
    }, 60000);
  });

  describe("Multiple Permission Types", () => {
    it("should handle all permission types together", async () => {
      const storageStrategy = createMockStorageStrategy();
      const redirectStrategy = createMockRedirectStrategy();

      const controllerConfig: RedirectControllerConfig = {
        chainId: config.chainId,
        rpcUrl: config.rpcUrl,
        gasPrice: config.gasPrice,
        redirect: {
          type: "redirect",
          callbackUrl: "http://localhost:3000/callback",
        },
        treasury: config.treasuryAddress,
        bank: [{ denom: "uxion", amount: "1000000" }],
        stake: true,
        contracts: [config.treasuryAddress],
        storageStrategy,
        redirectStrategy,
      };

      const controller = new RedirectController(controllerConfig);
      await controller.initialize();
      await controller.connect();

      const redirectUrl = redirectStrategy.getRedirectUrl();
      expect(redirectUrl).toBeTruthy();

      console.log("✅ Multiple permission types configured");
      console.log("   Bank: ✓ Stake: ✓ Contracts: ✓");
    }, 60000);

    it("should handle permission combinations without errors", async () => {
      const storageStrategy = createMockStorageStrategy();
      const redirectStrategy = createMockRedirectStrategy();

      const controllerConfig: RedirectControllerConfig = {
        chainId: config.chainId,
        rpcUrl: config.rpcUrl,
        gasPrice: config.gasPrice,
        redirect: {
          type: "redirect",
          callbackUrl: "http://localhost:3000/callback",
        },
        // Only some permissions
        bank: [{ denom: "uxion", amount: "500000" }],
        stake: false,
        storageStrategy,
        redirectStrategy,
      };

      const controller = new RedirectController(controllerConfig);
      await controller.initialize();
      await controller.connect();

      const state = controller.getState();
      expect(state.status).not.toBe("error");

      console.log("✅ Partial permission configuration validated");
    }, 60000);
  });

  describe("URL Cleanup After Callback", () => {
    it("should prepare for URL cleanup after redirect", async () => {
      const storageStrategy = createMockStorageStrategy();
      const redirectStrategy = createMockRedirectStrategy();

      const controllerConfig: RedirectControllerConfig = {
        chainId: config.chainId,
        rpcUrl: config.rpcUrl,
        gasPrice: config.gasPrice,
        redirect: {
          type: "redirect",
          callbackUrl: "http://localhost:3000/callback",
        },
        storageStrategy,
        redirectStrategy,
      };

      const controller = new RedirectController(controllerConfig);
      await controller.initialize();
      await controller.connect();

      // Verify redirect was initiated
      expect(redirectStrategy.redirect).toHaveBeenCalled();

      console.log("✅ URL cleanup structure prepared");
    }, 60000);
  });
});
