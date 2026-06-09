/**
 * @vitest-environment jsdom
 */

/**
 * IframeController happy-path tests
 *
 * Tests the embedded iframe flow: mount iframe → IFRAME_READY → CONNECT → connected,
 * disconnect flow, and signAndBroadcastWithMetaAccount flow.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock external dependencies — use importOriginal to avoid missing-export errors
const mockSendRequest = vi.fn();
const mockEmit = vi.fn();

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
      getSigner: vi.fn().mockResolvedValue({
        signAndBroadcast: vi.fn(),
      }),
      abstractAccount: null,
    })),
    MessageChannelManager: vi.fn().mockImplementation(() => ({
      sendRequest: mockSendRequest,
    })),
    GranteeSignerClient: {
      connectWithSigner: vi.fn(),
    },
    TypedEventEmitter: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      off: vi.fn(),
      emit: mockEmit,
      removeAllListeners: vi.fn(),
    })),
  };
});

vi.mock("@cosmjs/stargate", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@cosmjs/stargate")>();
  return {
    ...actual,
    GasPrice: {
      fromString: vi.fn((str: string) => ({ toString: () => str })),
    },
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
  getDaoDaoIndexerUrl: vi.fn().mockReturnValue("https://indexer.example.com"),
}));

import { IframeController } from "../IframeController";
import type { IframeControllerConfig } from "../IframeController";
import { DashboardMessageType } from "@burnt-labs/abstraxion-core";

describe("IframeController — happy paths", () => {
  let container: HTMLDivElement;

  const createConfig = (
    overrides?: Partial<IframeControllerConfig>,
  ): IframeControllerConfig => ({
    chainId: "xion-testnet-1",
    rpcUrl: "https://rpc.xion-testnet-1.burnt.com",
    gasPrice: "0.001uxion",
    iframe: {
      type: "embedded",
      iframeUrl: "https://dashboard.xion.burnt.com",
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
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  // connect() has async steps before registering the IFRAME_READY listener.
  // Yield to microtasks so those complete before dispatching events.
  async function waitForListenerSetup() {
    await new Promise((r) => setTimeout(r, 0));
  }

  function simulateIframeReady() {
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: DashboardMessageType.IFRAME_READY },
        origin: "https://dashboard.xion.burnt.com",
      }),
    );
  }

  it("should mount iframe to container and transition to connected", async () => {
    mockSendRequest.mockResolvedValueOnce({ address: "xion1granter789" });

    const controller = new IframeController(createConfig());
    controller.setContainerElement(container);

    const connectPromise = controller.connect();
    await waitForListenerSetup();
    simulateIframeReady();

    await connectPromise;

    expect(controller.getState().status).toBe("connected");
    expect(controller.getAddress()).toBe("xion1granter789");
    expect(controller.getGranteeAddress()).toBe("xion1grantee123");

    const iframe = container.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe!.style.width).toBe("100%");
    expect(iframe!.style.height).toBe("100%");
    // border: "none" is normalized by jsdom — just verify iframe is styled
    expect(iframe!.style.width).toBeTruthy();

    controller.destroy();
  });

  it("should build iframe URL with correct query params", async () => {
    mockSendRequest.mockResolvedValueOnce({ address: "xion1granter789" });

    const config = createConfig({
      treasury: "xion1treasury",
      bank: [{ denom: "uxion", amount: "500000" }],
      stake: true,
      contracts: ["xion1contract1"],
    });

    const controller = new IframeController(config);
    controller.setContainerElement(container);

    const connectPromise = controller.connect();
    await waitForListenerSetup();
    simulateIframeReady();
    await connectPromise;

    const iframe = container.querySelector("iframe")!;
    const iframeUrl = new URL(iframe.src);

    expect(iframeUrl.origin).toBe("https://dashboard.xion.burnt.com");
    expect(iframeUrl.searchParams.get("mode")).toBe("inline");
    expect(iframeUrl.searchParams.get("grantee")).toBe("xion1grantee123");
    expect(iframeUrl.searchParams.get("treasury")).toBe("xion1treasury");
    expect(iframeUrl.searchParams.get("stake")).toBe("true");

    controller.destroy();
  });

  it("should send CONNECT via MessageChannelManager with correct params", async () => {
    mockSendRequest.mockResolvedValueOnce({ address: "xion1granter789" });

    const controller = new IframeController(
      createConfig({ treasury: "xion1treasury" }),
    );
    controller.setContainerElement(container);

    const connectPromise = controller.connect();
    await waitForListenerSetup();
    simulateIframeReady();
    await connectPromise;

    expect(mockSendRequest).toHaveBeenCalledWith(
      expect.any(HTMLIFrameElement),
      "CONNECT",
      {
        grantParams: {
          treasuryAddress: "xion1treasury",
          grantee: "xion1grantee123",
        },
      },
      "https://dashboard.xion.burnt.com",
      300_000,
    );

    controller.destroy();
  });

  it("should handle HARD_DISCONNECT postMessage from iframe", async () => {
    mockSendRequest.mockResolvedValueOnce({ address: "xion1granter789" });

    const controller = new IframeController(createConfig());
    controller.setContainerElement(container);

    const connectPromise = controller.connect();
    await waitForListenerSetup();
    simulateIframeReady();
    await connectPromise;

    expect(controller.getState().status).toBe("connected");

    // Simulate user clicking disconnect inside the iframe
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: DashboardMessageType.HARD_DISCONNECT },
        origin: "https://dashboard.xion.burnt.com",
      }),
    );

    // Wait for async handleDisconnect
    await vi.waitFor(() => {
      expect(controller.getState().status).toBe("disconnected");
    });

    controller.destroy();
  });

  it("should ignore HARD_DISCONNECT from wrong origin", async () => {
    mockSendRequest.mockResolvedValueOnce({ address: "xion1granter789" });

    const controller = new IframeController(createConfig());
    controller.setContainerElement(container);

    const connectPromise = controller.connect();
    await waitForListenerSetup();
    simulateIframeReady();
    await connectPromise;

    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: DashboardMessageType.HARD_DISCONNECT },
        origin: "https://evil.com",
      }),
    );

    expect(controller.getState().status).toBe("connected");

    controller.destroy();
  });

  describe("signAndBroadcastWithMetaAccount()", () => {
    it("should send SIGN_AND_BROADCAST via MessageChannel and return result", async () => {
      // The dashboard only returns the transaction hash — not the full CosmJS DeliverTxResponse.
      const txResponse = {
        signedTx: { transactionHash: "TX_HASH_123" },
      };

      mockSendRequest
        .mockResolvedValueOnce({ address: "xion1granter789" })
        .mockResolvedValueOnce(txResponse);

      const controller = new IframeController(createConfig());
      controller.setContainerElement(container);

      const connectPromise = controller.connect();
      await waitForListenerSetup();
      simulateIframeReady();
      await connectPromise;

      const messages = [
        {
          typeUrl: "/cosmos.bank.v1beta1.MsgSend",
          value: {
            fromAddress: "xion1granter789",
            toAddress: "xion1receiver",
            amount: [{ denom: "uxion", amount: "1000" }],
          },
        },
      ];

      const result = await controller.signAndBroadcastWithMetaAccount(
        "xion1granter789",
        messages,
        "auto",
        "test memo",
      );

      expect(result).toEqual(txResponse.signedTx);

      expect(mockSendRequest).toHaveBeenCalledWith(
        expect.any(HTMLIFrameElement),
        "SIGN_AND_BROADCAST",
        {
          transaction: { messages, fee: "auto", memo: "test memo" },
          signerAddress: "xion1granter789",
        },
        "https://dashboard.xion.burnt.com",
        300_000,
      );

      controller.destroy();
    });
  });

  describe("disconnect()", () => {
    it("should remove iframe silently and dispatch EXPLICITLY_DISCONNECTED", async () => {
      mockSendRequest.mockResolvedValueOnce({ address: "xion1granter789" });

      const controller = new IframeController(createConfig());
      controller.setContainerElement(container);

      const connectPromise = controller.connect();
      await waitForListenerSetup();
      simulateIframeReady();
      await connectPromise;

      await controller.disconnect();

      expect(controller.getState().status).toBe("disconnected");
      expect(controller.getAddress()).toBeNull();

      // disconnect() intentionally does NOT send a DISCONNECT message to the
      // dashboard iframe — the dashboard session survives so the user won't
      // have to re-authenticate on the next connect() call.
      expect(mockSendRequest).not.toHaveBeenCalledWith(
        expect.anything(),
        "DISCONNECT",
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );

      controller.destroy();
    });
  });

  describe("cancelLogin()", () => {
    it("rejects in-flight connect, unmounts iframe, and resets state", async () => {
      // mockSendRequest never resolves so the connect flow is suspended on
      // the CONNECT request — that's the realistic shape for "user dismissed
      // the login modal mid-flow."
      let cancelSendRequest: ((reason: Error) => void) | undefined;
      mockSendRequest.mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            cancelSendRequest = reject;
          }),
      );

      const controller = new IframeController(createConfig());
      controller.setContainerElement(container);

      const connectPromise = controller.connect();
      await waitForListenerSetup();
      simulateIframeReady();
      // Yield so connect() reaches the awaited sendRequest.
      await new Promise((r) => setTimeout(r, 0));

      expect(controller.getState().status).toBe("connecting");
      expect(container.querySelector("iframe")).not.toBeNull();

      controller.cancelLogin();

      // connect() should resolve cleanly (no throw) — cancelLogin is a
      // user-initiated abort, not an error.
      await expect(connectPromise).resolves.toBeUndefined();
      expect(controller.getState().status).toBe("idle");
      expect(container.querySelector("iframe")).toBeNull();

      // Sanity: rejecting the underlying sendRequest after the cancel must
      // not leak into state.
      cancelSendRequest?.(new Error("late reject"));
      controller.destroy();
    });

    it("is a no-op when called outside a connect() flow", () => {
      const controller = new IframeController(createConfig());
      controller.setContainerElement(container);

      const before = controller.getState().status;
      expect(() => controller.cancelLogin()).not.toThrow();
      // No login was in flight, so cancelLogin must not mutate state.
      expect(controller.getState().status).toBe(before);

      controller.destroy();
    });

    it("rejects an in-flight waitForReady (before IFRAME_READY fires)", async () => {
      // No simulateIframeReady() — connect() suspends on waitForReady.
      const controller = new IframeController(createConfig());
      controller.setContainerElement(container);

      const connectPromise = controller.connect();
      await waitForListenerSetup();
      // Yield so connect() reaches the awaited readyPromise without ever
      // receiving IFRAME_READY.
      await new Promise((r) => setTimeout(r, 0));

      expect(controller.getState().status).toBe("connecting");
      expect(container.querySelector("iframe")).not.toBeNull();
      // sendRequest must NOT have run — we cancel before the handshake.
      expect(mockSendRequest).not.toHaveBeenCalled();

      controller.cancelLogin();

      await expect(connectPromise).resolves.toBeUndefined();
      expect(controller.getState().status).toBe("idle");
      expect(container.querySelector("iframe")).toBeNull();

      controller.destroy();
    });

    it("aborts during completeConnection — does not dispatch SET_CONNECTED on torn-down transport", async () => {
      // Make AbstraxionAuth.getSigner() hang so cancelLogin() can land
      // between sendRequest resolution and SET_CONNECTED dispatch. This
      // covers the narrow race the previous implementation missed.
      const { AbstraxionAuth } = await import("@burnt-labs/abstraxion-core");
      let resolveGetSigner: ((value: unknown) => void) | undefined;
      vi.mocked(AbstraxionAuth).mockImplementationOnce(
        () =>
          ({
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
            getSigner: vi.fn(
              () =>
                new Promise((resolve) => {
                  resolveGetSigner = resolve;
                }),
            ),
            abstractAccount: null,
          }) as never,
      );

      mockSendRequest.mockResolvedValueOnce({ address: "xion1granter789" });

      const controller = new IframeController(createConfig());
      controller.setContainerElement(container);

      const connectPromise = controller.connect();
      await waitForListenerSetup();
      simulateIframeReady();
      // Yield enough for sendRequest → setGranter → hanging getSigner.
      await new Promise((r) => setTimeout(r, 0));
      await new Promise((r) => setTimeout(r, 0));

      expect(controller.getState().status).toBe("connecting");

      controller.cancelLogin();
      // Resolving getSigner *after* cancel must NOT promote state to
      // "connected" — completeConnection should bail on the abort guard.
      resolveGetSigner?.({ signAndBroadcast: vi.fn() });

      await expect(connectPromise).resolves.toBeUndefined();
      expect(controller.getState().status).toBe("idle");
      expect(container.querySelector("iframe")).toBeNull();

      controller.destroy();
    });
  });

  it("should throw with helpful error when missing iframeUrl", () => {
    expect(
      () =>
        new IframeController({
          ...createConfig(),
          iframe: { type: "embedded", iframeUrl: undefined },
        }),
    ).toThrow("Iframe URL is required");
  });

  it("should throw for invalid iframe URL", () => {
    expect(
      () =>
        new IframeController({
          ...createConfig(),
          iframe: { type: "embedded", iframeUrl: "not-a-url" },
        }),
    ).toThrow("Invalid iframe URL");
  });
});
