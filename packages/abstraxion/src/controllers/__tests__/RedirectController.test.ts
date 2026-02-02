/**
 * Unit tests for RedirectController signWithMetaAccount
 */

import { describe, it, expect, vi } from "vitest";

// Mock the external dependencies before importing the controller
vi.mock("@burnt-labs/abstraxion-core", () => ({
  AbstraxionAuth: vi.fn().mockImplementation(() => ({
    configureAbstraxionInstance: vi.fn(),
    logout: vi.fn(),
  })),
}));

vi.mock("@burnt-labs/account-management", () => ({
  ConnectionOrchestrator: vi.fn().mockImplementation(() => ({
    restoreSession: vi.fn().mockResolvedValue({ restored: false }),
    initiateRedirect: vi.fn(),
    completeRedirect: vi.fn(),
    destroy: vi.fn(),
  })),
  isSessionRestorationError: vi.fn().mockReturnValue(false),
  isSessionRestored: vi.fn().mockReturnValue(false),
  getAccountInfoFromRestored: vi.fn(),
}));

vi.mock("@burnt-labs/constants", () => ({
  getDaoDaoIndexerUrl: vi.fn().mockReturnValue("https://indexer.daodao.zone"),
}));

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

  describe("signWithMetaAccount", () => {
    it("should throw 'not supported' error", async () => {
      const controller = createController();

      await expect(
        controller.signWithMetaAccount(
          "xion1abc123",
          [{ typeUrl: "/cosmos.bank.v1beta1.MsgSend", value: {} }],
          "auto",
        ),
      ).rejects.toThrow(
        "Direct signing is not supported with redirect mode.",
      );
    });

    it("should explain why redirect mode cannot support direct signing", async () => {
      const controller = createController();

      try {
        await controller.signWithMetaAccount(
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
        await controller.signWithMetaAccount(
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
});
