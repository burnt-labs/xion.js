/**
 * @vitest-environment jsdom
 */

/**
 * RedirectController callback + signing tests
 *
 * Tests the redirect callback flow (returning from dashboard with ?granted=true),
 * sign result detection from URL params, and promptSignAndBroadcast redirect.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock external dependencies
vi.mock("@burnt-labs/abstraxion-core", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@burnt-labs/abstraxion-core")>();
  return {
    ...actual,
    AbstraxionAuth: vi.fn().mockImplementation(() => ({
      configureAbstraxionInstance: vi.fn(),
      logout: vi.fn().mockResolvedValue(undefined),
      getLocalKeypair: vi.fn().mockResolvedValue({
        getAccounts: vi.fn().mockResolvedValue([
          {
            address: "xion1grantee123",
            algo: "secp256k1",
            pubkey: new Uint8Array(),
          },
        ]),
      }),
      setGranter: vi.fn().mockResolvedValue(undefined),
      getSigner: vi.fn().mockResolvedValue({ signAndBroadcast: vi.fn() }),
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
      initiateRedirect: vi.fn().mockResolvedValue({
        dashboardUrl: "https://dashboard.burnt.com?grantee=xion1grantee123",
      }),
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

vi.mock("@burnt-labs/signers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@burnt-labs/signers")>();
  return {
    ...actual,
    toBase64: vi.fn((str: string) => Buffer.from(str).toString("base64")),
  };
});

import { RedirectController } from "../RedirectController";
import type { RedirectControllerConfig } from "../RedirectController";

describe("RedirectController — callback & signing", () => {
  let replaceStateSpy: ReturnType<typeof vi.fn>;

  const createConfig = (
    overrides?: Partial<RedirectControllerConfig>,
  ): RedirectControllerConfig => ({
    chainId: "xion-testnet-1",
    rpcUrl: "https://rpc.xion-testnet-1.burnt.com",
    gasPrice: "0.001uxion",
    redirect: {
      type: "redirect",
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
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    replaceStateSpy = vi.fn();

    // Reset window.location for each test
    Object.defineProperty(window, "location", {
      value: {
        search: "",
        href: "https://myapp.com",
        pathname: "/",
        origin: "https://myapp.com",
      },
      writable: true,
      configurable: true,
    });

    Object.defineProperty(window, "history", {
      value: { replaceState: replaceStateSpy },
      writable: true,
      configurable: true,
    });

    Object.defineProperty(window, "sessionStorage", {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
      configurable: true,
    });
  });

  describe("isReturningFromRedirect()", () => {
    it("returns true when URL has granted=true", () => {
      Object.defineProperty(window, "location", {
        value: {
          search: "?granted=true&granter=xion1granter456",
          href: "https://myapp.com?granted=true&granter=xion1granter456",
          pathname: "/",
        },
        writable: true,
        configurable: true,
      });

      const controller = new RedirectController(createConfig());
      expect(controller.isReturningFromRedirect()).toBe(true);
    });

    it("returns false when URL has no granted param", () => {
      const controller = new RedirectController(createConfig());
      expect(controller.isReturningFromRedirect()).toBe(false);
    });
  });

  describe("initialize() — redirect callback", () => {
    it("should complete connection when returning from dashboard redirect", async () => {
      Object.defineProperty(window, "location", {
        value: {
          search: "?granted=true&granter=xion1granter456",
          href: "https://myapp.com?granted=true&granter=xion1granter456",
          pathname: "/",
        },
        writable: true,
        configurable: true,
      });

      const controller = new RedirectController(createConfig());
      await controller.initialize();

      expect(controller.getState().status).toBe("connected");
      // URL params should be cleaned
      expect(replaceStateSpy).toHaveBeenCalled();
    });

    it("should set error when keypair is missing after redirect", async () => {
      Object.defineProperty(window, "location", {
        value: {
          search: "?granted=true&granter=xion1granter456",
          href: "https://myapp.com?granted=true&granter=xion1granter456",
          pathname: "/",
        },
        writable: true,
        configurable: true,
      });

      // Make getLocalKeypair return null
      const { AbstraxionAuth } = await import("@burnt-labs/abstraxion-core");
      const mockAuth = AbstraxionAuth as ReturnType<typeof vi.fn>;
      const originalImpl = mockAuth.getMockImplementation()!;
      mockAuth.mockImplementationOnce(() => ({
        ...originalImpl(),
        getLocalKeypair: vi.fn().mockResolvedValue(null),
      }));

      const controller = new RedirectController(createConfig());
      await controller.initialize();

      expect(controller.getState().status).toBe("error");
    });

    it("should set error when granter is missing from URL", async () => {
      Object.defineProperty(window, "location", {
        value: {
          search: "?granted=true",
          href: "https://myapp.com?granted=true",
          pathname: "/",
        },
        writable: true,
        configurable: true,
      });

      const controller = new RedirectController(createConfig());
      await controller.initialize();

      expect(controller.getState().status).toBe("error");
    });
  });

  describe("detectSignResult()", () => {
    it("should detect successful signing from tx_hash param", async () => {
      Object.defineProperty(window, "location", {
        value: {
          search: "?tx_hash=ABCDEF123",
          href: "https://myapp.com?tx_hash=ABCDEF123",
          pathname: "/",
        },
        writable: true,
        configurable: true,
      });

      const controller = new RedirectController(createConfig());
      await controller.initialize();

      const result = controller.getSignResult();
      expect(result).toEqual({
        success: true,
        transactionHash: "ABCDEF123",
      });

      // URL should be cleaned
      expect(replaceStateSpy).toHaveBeenCalled();
    });

    it("should detect sign rejection", async () => {
      Object.defineProperty(window, "location", {
        value: {
          search: "?sign_rejected=true",
          href: "https://myapp.com?sign_rejected=true",
          pathname: "/",
        },
        writable: true,
        configurable: true,
      });

      const controller = new RedirectController(createConfig());
      await controller.initialize();

      const result = controller.getSignResult();
      expect(result).toEqual({
        success: false,
        error: "Transaction rejected",
      });
    });

    it("should detect sign error with message", async () => {
      Object.defineProperty(window, "location", {
        value: {
          search: "?sign_error=Insufficient%20funds",
          href: "https://myapp.com?sign_error=Insufficient%20funds",
          pathname: "/",
        },
        writable: true,
        configurable: true,
      });

      const controller = new RedirectController(createConfig());
      await controller.initialize();

      const result = controller.getSignResult();
      expect(result).toEqual({
        success: false,
        error: "Insufficient funds",
      });
    });

    it("should clear sign result and notify subscribers", async () => {
      Object.defineProperty(window, "location", {
        value: {
          search: "?tx_hash=ABCDEF123",
          href: "https://myapp.com?tx_hash=ABCDEF123",
          pathname: "/",
        },
        writable: true,
        configurable: true,
      });

      const controller = new RedirectController(createConfig());
      await controller.initialize();

      const subscriber = vi.fn();
      controller.subscribeToSignResult(subscriber);

      controller.clearSignResult();

      expect(controller.getSignResult()).toBeNull();
      expect(subscriber).toHaveBeenCalled();
    });
  });

  describe("signAndBroadcastWithMetaAccount()", () => {
    it("should throw explaining redirect mode limitations", async () => {
      const controller = new RedirectController(createConfig());

      await expect(
        controller.signAndBroadcastWithMetaAccount(
          "xion1granter",
          [{ typeUrl: "/cosmos.bank.v1beta1.MsgSend", value: {} }],
          "auto",
        ),
      ).rejects.toThrow("Direct signing is not supported with redirect mode");
    });
  });

  describe("promptSignAndBroadcast()", () => {
    it("should navigate to dashboard signing page", async () => {
      const controller = new RedirectController(createConfig());

      // promptSignAndBroadcast sets window.location.href — we can check what it was set to
      // Since it's a fire-and-forget redirect, we just verify it doesn't throw immediately
      const signPromise = controller.promptSignAndBroadcast(
        "xion1granter456",
        [{ typeUrl: "/cosmos.bank.v1beta1.MsgSend", value: {} }],
        "auto",
        "memo",
      );

      // The method should have set window.location.href
      expect(window.location.href).toContain("dashboard.burnt.com");
      expect(window.location.href).toContain("mode=sign");
      expect(window.location.href).toContain("granter=xion1granter456");

      // Clean up — the promise will reject after 10s timeout
      // We don't wait for that in tests
      signPromise.catch(() => {
        // Expected timeout rejection
      });

      controller.destroy();
    });
  });

  describe("connect()", () => {
    it("should dispatch START_REDIRECT via orchestrator", async () => {
      const controller = new RedirectController(createConfig());

      await controller.connect();

      // State should be "redirecting" after START_REDIRECT dispatch
      // (the actual redirect happens via orchestrator.initiateRedirect)
      const state = controller.getState();
      expect(state.status).toBe("redirecting");
    });
  });
});
