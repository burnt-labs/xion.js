/**
 * PopupController happy-path tests
 *
 * Tests the full popup connect flow: open popup → postMessage → connected,
 * and the signing flow: open signing popup → SIGN_SUCCESS → resolved.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock external dependencies (same pattern as existing PopupController.test.ts)
vi.mock("@burnt-labs/abstraxion-core", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@burnt-labs/abstraxion-core")>();
  return {
    ...actual,
    AbstraxionAuth: vi.fn().mockImplementation(() => ({
      configureAbstraxionInstance: vi.fn(),
      logout: vi.fn().mockResolvedValue(undefined),
      generateAndStoreTempAccount: vi.fn().mockResolvedValue({
        getAccounts: vi.fn().mockResolvedValue([
          {
            address: "xion1grantee123",
            algo: "secp256k1",
            pubkey: new Uint8Array(),
          },
        ]),
      }),
      getKeypairAddress: vi.fn().mockResolvedValue("xion1grantee123"),
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

import { PopupController } from "../PopupController";
import type { PopupControllerConfig } from "../PopupController";
import { DashboardMessageType } from "@burnt-labs/abstraxion-core";

/**
 * Minimal window mock with working event dispatch.
 * Tracks message listeners so simulatePostMessage can dispatch to them.
 */
function createWindowMock() {
  const messageListeners: Array<(event: MessageEvent) => void> = [];
  let mockPopup = { closed: false, close: vi.fn() };

  const win = {
    open: vi.fn().mockImplementation(() => mockPopup),
    addEventListener: vi.fn(
      (type: string, handler: (event: MessageEvent) => void) => {
        if (type === "message") messageListeners.push(handler);
      },
    ),
    removeEventListener: vi.fn(
      (type: string, handler: (event: MessageEvent) => void) => {
        if (type === "message") {
          const idx = messageListeners.indexOf(handler);
          if (idx >= 0) messageListeners.splice(idx, 1);
        }
      },
    ),
    location: {
      origin: "https://myapp.com",
      href: "https://myapp.com",
    },
  };

  function simulatePostMessage(data: Record<string, unknown>, origin: string) {
    const event = { data, origin } as MessageEvent;
    for (const listener of [...messageListeners]) {
      listener(event);
    }
  }

  return {
    win,
    mockPopup,
    simulatePostMessage,
    setMockPopup: (p: typeof mockPopup) => {
      mockPopup = p;
      win.open.mockImplementation(() => mockPopup);
    },
  };
}

describe("PopupController — happy paths", () => {
  let windowMock: ReturnType<typeof createWindowMock>;

  const createConfig = (
    overrides?: Partial<PopupControllerConfig>,
  ): PopupControllerConfig => ({
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
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    windowMock = createWindowMock();
    (globalThis as any).window = windowMock.win;
  });

  afterEach(() => {
    delete (globalThis as any).window;
  });

  // connect() has async steps (generateAndStoreTempAccount, getKeypairAddress)
  // before it sets up the message listener. We need to yield to the microtask
  // queue so those complete before we dispatch postMessages.
  async function waitForListenerSetup() {
    await new Promise((r) => setTimeout(r, 0));
  }

  it("should transition to connected on CONNECT_SUCCESS", async () => {
    const controller = new PopupController(createConfig());

    const connectPromise = controller.connect();
    await waitForListenerSetup();

    windowMock.simulatePostMessage(
      {
        type: DashboardMessageType.CONNECT_SUCCESS,
        address: "xion1granter456",
      },
      "https://dashboard.burnt.com",
    );

    await connectPromise;
    expect(controller.getState().status).toBe("connected");
  });

  it("should reject on CONNECT_REJECTED", async () => {
    const controller = new PopupController(createConfig());

    const connectPromise = controller.connect();
    await waitForListenerSetup();

    windowMock.simulatePostMessage(
      { type: DashboardMessageType.CONNECT_REJECTED },
      "https://dashboard.burnt.com",
    );

    await expect(connectPromise).rejects.toThrow("Connection rejected by user");
    expect(controller.getState().status).toBe("idle");
  });

  it("should reject when popup is closed without completing auth", async () => {
    vi.useFakeTimers();
    const controller = new PopupController(createConfig());

    const connectPromise = controller.connect();
    await vi.advanceTimersByTimeAsync(0); // flush microtasks

    // Simulate popup being closed
    windowMock.mockPopup.closed = true;
    vi.advanceTimersByTime(600);

    await expect(connectPromise).rejects.toThrow(
      "Authentication popup was closed",
    );
    expect(controller.getState().status).toBe("idle");

    vi.useRealTimers();
  });

  it("should ignore messages from wrong origin", async () => {
    vi.useFakeTimers();
    const controller = new PopupController(createConfig());

    const connectPromise = controller.connect();
    await vi.advanceTimersByTimeAsync(0);

    // Message from wrong origin should be ignored
    windowMock.simulatePostMessage(
      { type: DashboardMessageType.CONNECT_SUCCESS, address: "xion1attacker" },
      "https://evil.com",
    );

    // Should still be waiting — close popup to end test
    windowMock.mockPopup.closed = true;
    vi.advanceTimersByTime(600);

    await expect(connectPromise).rejects.toThrow(
      "Authentication popup was closed",
    );
    vi.useRealTimers();
  });

  // ─── No-grants path ─────────────────────────────────────────────────────────
  // When no treasury/contracts/stake/bank are configured, the popup URL must
  // NOT include any grant params. The dashboard should send CONNECT_SUCCESS
  // immediately after the user authenticates (no approval step).
  // See: App.tsx popup no-grants resolution useEffect.

  it("should build popup URL without grant params when no grants are configured", async () => {
    const controller = new PopupController(createConfig()); // No grants in default config

    const connectPromise = controller.connect();
    await waitForListenerSetup();

    const openCall = windowMock.win.open.mock.calls[0];
    const popupUrl = new URL(openCall[0] as string);

    // Required params always present
    expect(popupUrl.searchParams.get("grantee")).toBe("xion1grantee123");
    expect(popupUrl.searchParams.get("mode")).toBe("popup");
    expect(popupUrl.searchParams.get("redirect_uri")).toBeTruthy();

    // Grant params must be absent when not configured
    expect(popupUrl.searchParams.has("treasury")).toBe(false);
    expect(popupUrl.searchParams.has("stake")).toBe(false);
    expect(popupUrl.searchParams.has("bank")).toBe(false);
    expect(popupUrl.searchParams.has("contracts")).toBe(false);

    // Dashboard sends CONNECT_SUCCESS without a prior grant approval step
    windowMock.simulatePostMessage(
      { type: DashboardMessageType.CONNECT_SUCCESS, address: "xion1granter456" },
      "https://dashboard.burnt.com",
    );

    await connectPromise;
    expect(controller.getState().status).toBe("connected");
  });

  it("should complete connection on CONNECT_SUCCESS even with no grants configured", async () => {
    const controller = new PopupController(createConfig()); // No grants

    const connectPromise = controller.connect();
    await waitForListenerSetup();

    windowMock.simulatePostMessage(
      { type: DashboardMessageType.CONNECT_SUCCESS, address: "xion1granter456" },
      "https://dashboard.burnt.com",
    );

    await connectPromise;

    const state = controller.getState();
    expect(state.status).toBe("connected");
    // Granter address is stored from the CONNECT_SUCCESS message
    if (state.status === "connected") {
      expect(state.account.granterAddress).toBe("xion1granter456");
    }
  });

  it("should build popup URL with correct query params", async () => {
    const config = createConfig({
      treasury: "xion1treasury",
      bank: [{ denom: "uxion", amount: "1000000" }],
      stake: true,
      contracts: ["xion1contract1"],
    });

    const controller = new PopupController(config);

    const connectPromise = controller.connect();
    await waitForListenerSetup();

    const openCall = windowMock.win.open.mock.calls[0];
    const popupUrl = new URL(openCall[0] as string);

    expect(popupUrl.origin).toBe("https://dashboard.burnt.com");
    expect(popupUrl.searchParams.get("grantee")).toBe("xion1grantee123");
    expect(popupUrl.searchParams.get("mode")).toBe("popup");
    expect(popupUrl.searchParams.get("treasury")).toBe("xion1treasury");
    expect(popupUrl.searchParams.get("stake")).toBe("true");

    const bankParam = JSON.parse(popupUrl.searchParams.get("bank")!);
    expect(bankParam).toEqual([{ denom: "uxion", amount: "1000000" }]);

    const contractsParam = JSON.parse(popupUrl.searchParams.get("contracts")!);
    expect(contractsParam).toEqual(["xion1contract1"]);

    // Complete the test
    windowMock.simulatePostMessage(
      {
        type: DashboardMessageType.CONNECT_SUCCESS,
        address: "xion1granter456",
      },
      "https://dashboard.burnt.com",
    );

    await connectPromise;
  });

  it("should skip connect when already connected", async () => {
    const controller = new PopupController(createConfig());

    const connectPromise = controller.connect();
    await waitForListenerSetup();
    windowMock.simulatePostMessage(
      {
        type: DashboardMessageType.CONNECT_SUCCESS,
        address: "xion1granter456",
      },
      "https://dashboard.burnt.com",
    );
    await connectPromise;

    // Second connect should return immediately
    await controller.connect();
    expect(windowMock.win.open).toHaveBeenCalledTimes(1);
  });

  describe("promptSignAndBroadcast()", () => {
    it("should resolve with tx hash on SIGN_SUCCESS", async () => {
      const controller = new PopupController(createConfig());

      const signPromise = controller.promptSignAndBroadcast(
        "xion1granter456",
        [{ typeUrl: "/cosmos.bank.v1beta1.MsgSend", value: {} }],
        "auto",
        "test memo",
      );

      windowMock.simulatePostMessage(
        { type: DashboardMessageType.SIGN_SUCCESS, txHash: "ABCDEF1234567890" },
        "https://dashboard.burnt.com",
      );

      const result = await signPromise;
      expect(result.code).toBe(0);
      expect(result.transactionHash).toBe("ABCDEF1234567890");
    });

    it("should reject on SIGN_REJECTED", async () => {
      const controller = new PopupController(createConfig());

      const signPromise = controller.promptSignAndBroadcast(
        "xion1granter456",
        [{ typeUrl: "/cosmos.bank.v1beta1.MsgSend", value: {} }],
        "auto",
      );

      windowMock.simulatePostMessage(
        { type: DashboardMessageType.SIGN_REJECTED },
        "https://dashboard.burnt.com",
      );

      await expect(signPromise).rejects.toThrow(
        "Transaction was rejected by user",
      );
    });

    it("should reject on SIGN_ERROR with message", async () => {
      const controller = new PopupController(createConfig());

      const signPromise = controller.promptSignAndBroadcast(
        "xion1granter456",
        [{ typeUrl: "/cosmos.bank.v1beta1.MsgSend", value: {} }],
        "auto",
      );

      windowMock.simulatePostMessage(
        {
          type: DashboardMessageType.SIGN_ERROR,
          message: "Insufficient funds",
        },
        "https://dashboard.burnt.com",
      );

      await expect(signPromise).rejects.toThrow("Insufficient funds");
    });

    it("should build signing popup URL with encoded tx", async () => {
      const controller = new PopupController(createConfig());

      const signPromise = controller.promptSignAndBroadcast(
        "xion1granter456",
        [{ typeUrl: "/cosmos.bank.v1beta1.MsgSend", value: { amount: "100" } }],
        "auto",
        "memo",
      );

      const openCall = windowMock.win.open.mock.calls[0];
      const signUrl = new URL(openCall[0] as string);

      expect(signUrl.searchParams.get("mode")).toBe("sign");
      expect(signUrl.searchParams.get("granter")).toBe("xion1granter456");
      expect(signUrl.searchParams.get("tx")).toBeTruthy();

      windowMock.simulatePostMessage(
        { type: DashboardMessageType.SIGN_SUCCESS, txHash: "ABC" },
        "https://dashboard.burnt.com",
      );
      await signPromise;
    });
  });
});
