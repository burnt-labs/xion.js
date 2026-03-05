/**
 * Unit tests for PopupController
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the external dependencies before importing the controller
vi.mock("@burnt-labs/abstraxion-core", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@burnt-labs/abstraxion-core")>();
  return {
    ...actual,
    AbstraxionAuth: vi.fn().mockImplementation(() => ({
      configureAbstraxionInstance: vi.fn(),
      logout: vi.fn().mockResolvedValue(undefined),
      generateAndStoreTempAccount: vi.fn(),
      getKeypairAddress: vi.fn(),
      setGranter: vi.fn(),
      getSigner: vi.fn(),
      abstractAccount: null,
    })),
  };
});

vi.mock("@burnt-labs/account-management", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@burnt-labs/account-management")>();
  return {
    ...actual,
    ConnectionOrchestrator: vi.fn().mockImplementation(() => ({
      restoreSession: vi.fn().mockResolvedValue({ restored: false }),
      destroy: vi.fn(),
    })),
    isSessionRestorationError: vi.fn().mockReturnValue(false),
    isSessionRestored: vi.fn().mockReturnValue(false),
    getAccountInfoFromRestored: vi.fn(),
  };
});

vi.mock("@burnt-labs/constants", () => ({
  fetchConfig: vi
    .fn()
    .mockResolvedValue({ dashboardUrl: "https://dashboard.burnt.com" }),
  getDaoDaoIndexerUrl: vi.fn().mockReturnValue("https://indexer.daodao.zone"),
}));

vi.mock("@cosmjs/stargate", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@cosmjs/stargate")>();
  return {
    ...actual,
    GasPrice: {
      fromString: vi.fn((str: string) => ({ toString: () => str })),
    },
  };
});

import { PopupController } from "../PopupController";
import type { PopupControllerConfig } from "../PopupController";
import { AbstraxionAuth } from "@burnt-labs/abstraxion-core";

describe("PopupController", () => {
  let mockLogout: ReturnType<typeof vi.fn>;

  const createController = (): PopupController => {
    const config: PopupControllerConfig = {
      chainId: "xion-testnet-1",
      rpcUrl: "https://rpc.xion-testnet-1.burnt.com",
      gasPrice: "0.001uxion",
      popup: {
        type: "popup",
        authAppUrl: "https://dashboard.burnt.com",
      },
      storageStrategy: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      redirectStrategy: {
        getCurrentUrl: vi.fn().mockReturnValue("https://myapp.com"),
        redirect: vi.fn(),
      },
    };

    const controller = new PopupController(config);

    // Grab the mock logout from the AbstraxionAuth instance
    const authInstance = (AbstraxionAuth as ReturnType<typeof vi.fn>).mock
      .results[
      (AbstraxionAuth as ReturnType<typeof vi.fn>).mock.results.length - 1
    ].value;
    mockLogout = authInstance.logout;

    return controller;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("connect()", () => {
    it("should reject when popup is blocked (window.open returns null)", async () => {
      // Set up global window mock for node environment
      const mockWindow = {
        open: vi.fn().mockReturnValue(null),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        location: { origin: "https://myapp.com" },
      };
      (globalThis as unknown as { window: typeof mockWindow }).window =
        mockWindow;

      const controller = createController();

      // Mock AbstraxionAuth methods needed for connect
      const authInstance = (AbstraxionAuth as ReturnType<typeof vi.fn>).mock
        .results[
        (AbstraxionAuth as ReturnType<typeof vi.fn>).mock.results.length - 1
      ].value;
      authInstance.generateAndStoreTempAccount.mockResolvedValue({});
      authInstance.getKeypairAddress.mockResolvedValue("xion1grantee");

      await expect(controller.connect()).rejects.toThrow(
        "Popup was blocked by the browser",
      );

      // State ends as error (RESET then SET_ERROR in catch block)
      expect(controller.getState().status).toBe("error");

      delete (globalThis as unknown as { window?: unknown }).window;
    });
  });

  describe("disconnect()", () => {
    it("should call logout and dispatch RESET", async () => {
      const controller = createController();

      await controller.disconnect();

      expect(mockLogout).toHaveBeenCalled();
      expect(controller.getState().status).toBe("idle");
    });

    it("should still dispatch RESET when logout throws", async () => {
      const controller = createController();

      mockLogout.mockRejectedValueOnce(new Error("Logout failed"));

      await controller.disconnect();

      expect(mockLogout).toHaveBeenCalled();
      // State should still be reset even though logout threw
      expect(controller.getState().status).toBe("idle");
    });
  });

  describe("destroy()", () => {
    it("should call pendingCleanup if set", async () => {
      const controller = createController();

      // Simulate a pending cleanup by setting it via the private field
      const mockCleanup = vi.fn();
      (controller as unknown as { pendingCleanup: (() => void) | null }).pendingCleanup = mockCleanup;

      controller.destroy();

      expect(mockCleanup).toHaveBeenCalled();
    });

    it("should not throw when no pendingCleanup is set", () => {
      const controller = createController();

      // destroy() should work fine with no pending cleanup
      expect(() => controller.destroy()).not.toThrow();
    });
  });
});
