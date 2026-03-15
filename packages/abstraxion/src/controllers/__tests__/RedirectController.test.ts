/**
 * Unit tests for RedirectController signAndBroadcastWithMetaAccount
 */

import { describe, it, expect, vi } from "vitest";

// Mock the external dependencies before importing the controller
vi.mock("@burnt-labs/abstraxion-core", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@burnt-labs/abstraxion-core")>();
  return {
    ...actual,
    AbstraxionAuth: vi.fn().mockImplementation(() => ({
      configureAbstraxionInstance: vi.fn(),
      logout: vi.fn(),
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
      initiateRedirect: vi.fn(),
      completeRedirect: vi.fn(),
      destroy: vi.fn(),
    })),
    isSessionRestorationError: vi.fn().mockReturnValue(false),
    isSessionRestored: vi.fn().mockReturnValue(false),
    getAccountInfoFromRestored: vi.fn(),
  };
});

vi.mock("@burnt-labs/constants", () => ({
  getDaoDaoIndexerUrl: vi.fn().mockReturnValue("https://indexer.daodao.zone"),
}));

import { AbstraxionAuth } from "@burnt-labs/abstraxion-core";
import { RedirectController } from "../RedirectController";
import type { RedirectControllerConfig } from "../RedirectController";

describe("RedirectController", () => {
  const createController = (): RedirectController => {
    const config: RedirectControllerConfig = {
      chainId: "xion-testnet-1",
      rpcUrl: "https://rpc.xion-testnet-1.burnt.com",
      gasPrice: "0.001uxion",
      redirect: {
        type: "redirect",
        callbackUrl: "https://myapp.com/callback",
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

    return new RedirectController(config);
  };

  describe("signAndBroadcastWithMetaAccount", () => {
    it("should throw 'not supported' error", async () => {
      const controller = createController();

      await expect(
        controller.signAndBroadcastWithMetaAccount(
          "xion1abc123",
          [{ typeUrl: "/cosmos.bank.v1beta1.MsgSend", value: {} }],
          "auto",
        ),
      ).rejects.toThrow("Direct signing is not supported with redirect mode.");
    });

    it("should explain why redirect mode cannot support direct signing", async () => {
      const controller = createController();

      try {
        await controller.signAndBroadcastWithMetaAccount(
          "xion1abc123",
          [{ typeUrl: "/cosmos.bank.v1beta1.MsgSend", value: {} }],
          "auto",
        );
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        // Check that the error message explains the limitation
        expect((error as Error).message).toContain("session key");
        expect((error as Error).message).toContain("signer mode");
      }
    });

    it("should suggest alternative modes for requireAuth transactions", async () => {
      const controller = createController();

      try {
        await controller.signAndBroadcastWithMetaAccount(
          "xion1abc123",
          [{ typeUrl: "/cosmos.bank.v1beta1.MsgSend", value: {} }],
          "auto",
        );
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        // Check that the error message suggests alternatives
        expect((error as Error).message).toContain("iframe mode");
        expect((error as Error).message).toContain("requireAuth: true");
      }
    });
  });

  describe("disconnect", () => {
    const getLatestAuthInstance = () => {
      const mockResults = (
        AbstraxionAuth as unknown as ReturnType<typeof vi.fn>
      ).mock.results;
      return mockResults[mockResults.length - 1].value;
    };

    it("should call logout and dispatch EXPLICITLY_DISCONNECTED", async () => {
      const controller = createController();
      const mockInstance = getLatestAuthInstance();
      mockInstance.logout.mockResolvedValue(undefined);

      await controller.disconnect();

      expect(mockInstance.logout).toHaveBeenCalled();
      expect(controller.getState().status).toBe("disconnected");
    });

    it("should still dispatch EXPLICITLY_DISCONNECTED when logout throws", async () => {
      const controller = createController();
      const mockInstance = getLatestAuthInstance();
      mockInstance.logout.mockRejectedValue(new Error("logout failed"));

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      await controller.disconnect();

      expect(mockInstance.logout).toHaveBeenCalled();
      expect(controller.getState().status).toBe("disconnected");

      warnSpy.mockRestore();
    });
  });
});
