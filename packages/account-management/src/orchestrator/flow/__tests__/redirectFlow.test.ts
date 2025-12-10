/**
 * Unit tests for redirectFlow
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { initiateRedirect, completeRedirect } from "../redirectFlow";
import type { SessionManager } from "../../types";

// Mock fetchConfig from abstraxion-core
vi.mock("@burnt-labs/abstraxion-core", () => ({
  fetchConfig: vi.fn(),
}));

describe("redirectFlow", () => {
  let mockSessionManager: SessionManager;
  let mockKeypair: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockKeypair = {
      getAccounts: vi
        .fn()
        .mockResolvedValue([
          { address: "xion1grantee", pubkey: new Uint8Array() },
        ]),
    };

    mockSessionManager = {
      getLocalKeypair: vi.fn(),
      generateAndStoreTempAccount: vi.fn(),
      getGranter: vi.fn(),
      setGranter: vi.fn(),
      authenticate: vi.fn(),
      logout: vi.fn(),
      redirectToDashboard: vi.fn(),
      completeLogin: vi.fn(),
      getSigner: vi.fn(),
    };
  });

  describe("initiateRedirect", () => {
    it("should throw error when sessionManager does not support redirect", async () => {
      const sessionManagerWithoutRedirect = {
        ...mockSessionManager,
        redirectToDashboard: undefined,
      } as any;

      await expect(
        initiateRedirect(
          sessionManagerWithoutRedirect,
          "https://rpc.example.com",
        ),
      ).rejects.toThrow("SessionManager does not support redirect flow");
    });

    it("should generate and store temp account", async () => {
      const { fetchConfig } = await import("@burnt-labs/abstraxion-core");
      (fetchConfig as any).mockResolvedValueOnce({
        dashboardUrl: "https://dashboard.example.com",
      });

      await initiateRedirect(mockSessionManager, "https://rpc.example.com");

      expect(
        mockSessionManager.generateAndStoreTempAccount,
      ).toHaveBeenCalledOnce();
    });

    it("should call redirectToDashboard", async () => {
      const { fetchConfig } = await import("@burnt-labs/abstraxion-core");
      (fetchConfig as any).mockResolvedValueOnce({
        dashboardUrl: "https://dashboard.example.com",
      });

      await initiateRedirect(mockSessionManager, "https://rpc.example.com");

      expect(mockSessionManager.redirectToDashboard).toHaveBeenCalledOnce();
    });

    it("should return provided dashboardUrl when specified", async () => {
      const result = await initiateRedirect(
        mockSessionManager,
        "https://rpc.example.com",
        "https://custom.dashboard.com",
      );

      expect(result.dashboardUrl).toBe("https://custom.dashboard.com");
    });

    it("should fetch dashboardUrl from RPC when not provided", async () => {
      const { fetchConfig } = await import("@burnt-labs/abstraxion-core");
      (fetchConfig as any).mockResolvedValueOnce({
        dashboardUrl: "https://fetched.dashboard.com",
      });

      const result = await initiateRedirect(
        mockSessionManager,
        "https://rpc.example.com",
      );

      expect(fetchConfig).toHaveBeenCalledWith("https://rpc.example.com");
      expect(result.dashboardUrl).toBe("https://fetched.dashboard.com");
    });

    it("should handle empty dashboardUrl from fetchConfig", async () => {
      const { fetchConfig } = await import("@burnt-labs/abstraxion-core");
      (fetchConfig as any).mockResolvedValueOnce({});

      const result = await initiateRedirect(
        mockSessionManager,
        "https://rpc.example.com",
      );

      expect(result.dashboardUrl).toBe("");
    });

    it("should generate keypair before redirecting", async () => {
      const { fetchConfig } = await import("@burnt-labs/abstraxion-core");
      (fetchConfig as any).mockResolvedValueOnce({
        dashboardUrl: "https://dashboard.example.com",
      });

      const callOrder: string[] = [];
      mockSessionManager.generateAndStoreTempAccount = vi.fn(async () => {
        callOrder.push("generate");
      });
      mockSessionManager.redirectToDashboard = vi.fn(async () => {
        callOrder.push("redirect");
      });

      await initiateRedirect(mockSessionManager, "https://rpc.example.com");

      expect(callOrder).toEqual(["generate", "redirect"]);
    });
  });

  describe("completeRedirect", () => {
    beforeEach(() => {
      mockSessionManager.completeLogin = vi.fn().mockResolvedValue({
        keypair: mockKeypair,
        granter: "xion1granter",
      });
      mockSessionManager.getSigner = vi.fn().mockResolvedValue({
        signAndBroadcast: vi.fn(),
      });
    });

    it("should throw error when sessionManager does not support redirect", async () => {
      const sessionManagerWithoutComplete = {
        ...mockSessionManager,
        completeLogin: undefined,
      } as any;

      await expect(
        completeRedirect(sessionManagerWithoutComplete),
      ).rejects.toThrow("SessionManager does not support redirect flow");
    });

    it("should throw error when sessionManager missing getSigner", async () => {
      const sessionManagerWithoutSigner = {
        ...mockSessionManager,
        getSigner: undefined,
      } as any;

      await expect(
        completeRedirect(sessionManagerWithoutSigner),
      ).rejects.toThrow("SessionManager does not support redirect flow");
    });

    it("should call completeLogin", async () => {
      await completeRedirect(mockSessionManager);

      expect(mockSessionManager.completeLogin).toHaveBeenCalledOnce();
    });

    it("should throw error when completeLogin returns null", async () => {
      mockSessionManager.completeLogin = vi.fn().mockResolvedValue(null);

      await expect(completeRedirect(mockSessionManager)).rejects.toThrow(
        "Login redirected to dashboard instead of completing",
      );
    });

    it("should get grantee address from keypair", async () => {
      await completeRedirect(mockSessionManager);

      expect(mockKeypair.getAccounts).toHaveBeenCalledOnce();
    });

    it("should get signing client", async () => {
      await completeRedirect(mockSessionManager);

      expect(mockSessionManager.getSigner).toHaveBeenCalledOnce();
    });

    it("should throw error when getSigner returns null", async () => {
      mockSessionManager.getSigner = vi.fn().mockResolvedValue(null);

      await expect(completeRedirect(mockSessionManager)).rejects.toThrow(
        "Failed to get signing client after redirect",
      );
    });

    it("should return complete restoration result", async () => {
      const result = await completeRedirect(mockSessionManager);

      expect(result).toEqual({
        restored: true,
        keypair: mockKeypair,
        granterAddress: "xion1granter",
        granteeAddress: "xion1grantee",
        signingClient: expect.objectContaining({
          signAndBroadcast: expect.any(Function),
        }),
      });
    });

    it("should handle completeLogin with keypair and granter", async () => {
      const customKeypair = {
        getAccounts: vi
          .fn()
          .mockResolvedValue([
            { address: "xion1custom", pubkey: new Uint8Array() },
          ]),
      };

      mockSessionManager.completeLogin = vi.fn().mockResolvedValue({
        keypair: customKeypair,
        granter: "xion1customgranter",
      });

      const result = await completeRedirect(mockSessionManager);

      expect(result.granterAddress).toBe("xion1customgranter");
      expect(result.granteeAddress).toBe("xion1custom");
    });
  });
});
