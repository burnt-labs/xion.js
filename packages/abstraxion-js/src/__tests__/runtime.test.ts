/**
 * Unit tests for `createAbstraxionRuntime`.
 *
 * These tests mock the controller layer + strategies + cosmjs so the runtime
 * is exercised in isolation — no live RPC, no DOM. Coverage targets mirror
 * the spec in `.docs/tasks/abstraxion_test_migration.md` §1.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AccountState } from "@burnt-labs/account-management";

// ---------------------------------------------------------------------------
// Hoisted state — vi.mock factories run before module-scope `const`s, so any
// shared spies/classes have to live inside vi.hoisted.
// ---------------------------------------------------------------------------

const h = vi.hoisted(() => {
  const idleState = { status: "idle" } as unknown as AccountState;

  class StubBaseController {
    state: AccountState = idleState;
    subscribers = new Set<(s: AccountState) => void>();
    initialize = vi.fn().mockResolvedValue(undefined);
    connect = vi.fn().mockResolvedValue(undefined);
    disconnect = vi.fn().mockResolvedValue(undefined);
    destroy = vi.fn();
    dispatch = vi.fn();
    getState = vi.fn(() => this.state);
    subscribe = vi.fn((cb: (s: AccountState) => void) => {
      this.subscribers.add(cb);
      return () => {
        this.subscribers.delete(cb);
      };
    });
    promptManageAuthenticators = vi.fn().mockResolvedValue(undefined);
    promptSignAndBroadcast = vi.fn();
    signAndBroadcastWithMetaAccount = vi.fn();
    setState(state: AccountState) {
      this.state = state;
      this.subscribers.forEach((cb) => cb(state));
    }
  }

  class StubPopupController extends StubBaseController {}
  class StubRedirectController extends StubBaseController {
    isReturningFromRedirect = vi.fn().mockReturnValue(false);
  }
  class StubIframeController extends StubBaseController {
    awaitingApproval = false;
    approvalSubscribers = new Set<(v: boolean) => void>();
    subscribeApproval = vi.fn((cb: (v: boolean) => void) => {
      this.approvalSubscribers.add(cb);
      return () => {
        this.approvalSubscribers.delete(cb);
      };
    });
    setApproval(value: boolean) {
      this.awaitingApproval = value;
      this.approvalSubscribers.forEach((cb) => cb(value));
    }
  }
  class StubSignerController extends StubBaseController {
    updateGetSignerConfig = vi.fn();
    getConnectionInfo = vi.fn();
  }

  class StubRequireSigningClient {
    constructor(
      public fn: unknown,
      public rpcUrl: string,
    ) {}
  }

  return {
    idleState,
    StubBaseController,
    StubPopupController,
    StubRedirectController,
    StubIframeController,
    StubSignerController,
    StubRequireSigningClient,
    createControllerMock: vi.fn(),
    browserIframeCtor: vi.fn(),
    browserRedirectCtor: vi.fn(),
    browserStorageCtor: vi.fn(),
    cosmwasmConnect: vi.fn(),
    aaClientConnectWithSigner: vi.fn(),
    createSignerFromSigningFunctionMock: vi.fn(),
  };
});

const connectedState = (granterAddress = "xion1granter") =>
  ({
    status: "connected",
    account: {
      granterAddress,
      keypair: {} as unknown,
    },
    signingClient: {} as unknown,
  }) as unknown as AccountState;

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("../controllers", () => ({
  createController: h.createControllerMock,
  PopupController: h.StubPopupController,
  RedirectController: h.StubRedirectController,
  IframeController: h.StubIframeController,
  SignerController: h.StubSignerController,
  RequireSigningClient: h.StubRequireSigningClient,
  BaseController: h.StubBaseController,
}));

vi.mock("../strategies/BrowserIframeTransportStrategy", () => ({
  BrowserIframeTransportStrategy: class {
    constructor() {
      h.browserIframeCtor();
    }
  },
}));

vi.mock("../strategies/BrowserRedirectStrategy", () => ({
  BrowserRedirectStrategy: class {
    constructor() {
      h.browserRedirectCtor();
    }
  },
}));

vi.mock("../strategies/BrowserStorageStrategy", () => ({
  BrowserStorageStrategy: class {
    constructor() {
      h.browserStorageCtor();
    }
  },
}));

vi.mock("@cosmjs/cosmwasm-stargate", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@cosmjs/cosmwasm-stargate")>();
  return {
    ...actual,
    CosmWasmClient: { connect: h.cosmwasmConnect },
  };
});

vi.mock("@burnt-labs/signers", async () => {
  const actual = await vi.importActual<
    typeof import("@burnt-labs/signers")
  >("@burnt-labs/signers");
  return {
    ...actual,
    AAClient: { connectWithSigner: h.aaClientConnectWithSigner },
    createSignerFromSigningFunction: h.createSignerFromSigningFunctionMock,
  };
});

vi.mock("../utils/normalizeAbstraxionConfig", () => ({
  normalizeAbstraxionConfig: (config: Record<string, unknown>) => ({
    chainId: "xion-testnet-1",
    rpcUrl: "https://rpc.test/",
    restUrl: "https://rest.test/",
    gasPrice: "0.001uxion",
    ...config,
  }),
}));

vi.mock("@burnt-labs/account-management", () => ({
  AccountStateGuards: {
    isConnected: (s: AccountState) =>
      (s as unknown as { status: string }).status === "connected",
  },
}));

// ---------------------------------------------------------------------------
// SUT
// ---------------------------------------------------------------------------

import { createAbstraxionRuntime } from "../runtime";
import type { AbstraxionConfig } from "../types";

function makeConfig(
  authentication: AbstraxionConfig["authentication"],
  overrides: Partial<AbstraxionConfig> = {},
): AbstraxionConfig {
  return {
    chainId: "xion-testnet-1",
    treasury: "xion1treasury",
    authentication,
    ...overrides,
  } as AbstraxionConfig;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.cosmwasmConnect.mockResolvedValue({ kind: "cosmwasm-client" });
  h.aaClientConnectWithSigner.mockResolvedValue({ kind: "aa-client" });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Mode dispatch
// ---------------------------------------------------------------------------

describe("createAbstraxionRuntime — mode dispatch", () => {
  it.each([
    ["signer", "StubSignerController", "signer"],
    ["redirect", "StubRedirectController", "redirect"],
    ["popup", "StubPopupController", "popup"],
    ["embedded", "StubIframeController", "embedded"],
  ] as const)(
    "%s authentication picks the matching controller and authMode",
    (_label, ctorKey, expectedMode) => {
      const ControllerCtor = h[ctorKey as keyof typeof h] as new () => unknown;
      const controller = new ControllerCtor();
      h.createControllerMock.mockReturnValueOnce(controller);

      const runtime = createAbstraxionRuntime(
        makeConfig({ type: expectedMode } as AbstraxionConfig["authentication"]),
        { autoInitialize: false },
      );

      expect(runtime.controller).toBe(controller);
      expect(runtime.authMode).toBe(expectedMode);
    },
  );
});

// ---------------------------------------------------------------------------
// Strategy injection
// ---------------------------------------------------------------------------

describe("createAbstraxionRuntime — strategy injection", () => {
  it("instantiates browser strategies by default for non-embedded modes (no iframe transport)", () => {
    h.createControllerMock.mockReturnValueOnce(new h.StubRedirectController());

    createAbstraxionRuntime(makeConfig({ type: "redirect" }), {
      autoInitialize: false,
    });

    expect(h.browserStorageCtor).toHaveBeenCalledTimes(1);
    expect(h.browserRedirectCtor).toHaveBeenCalledTimes(1);
    expect(h.browserIframeCtor).not.toHaveBeenCalled();

    const passedStrategies = h.createControllerMock.mock.calls[0]![1];
    expect(passedStrategies.iframeTransportStrategy).toBeUndefined();
  });

  it("instantiates BrowserIframeTransportStrategy only for embedded mode", () => {
    h.createControllerMock.mockReturnValueOnce(new h.StubIframeController());

    createAbstraxionRuntime(makeConfig({ type: "embedded" }), {
      autoInitialize: false,
    });

    expect(h.browserIframeCtor).toHaveBeenCalledTimes(1);
  });

  it("does not instantiate browser strategies when overrides are supplied", () => {
    h.createControllerMock.mockReturnValueOnce(new h.StubRedirectController());
    const storageStrategy = { fake: "storage" } as unknown as never;
    const redirectStrategy = { fake: "redirect" } as unknown as never;

    createAbstraxionRuntime(makeConfig({ type: "redirect" }), {
      autoInitialize: false,
      strategies: { storageStrategy, redirectStrategy },
    });

    expect(h.browserStorageCtor).not.toHaveBeenCalled();
    expect(h.browserRedirectCtor).not.toHaveBeenCalled();
  });

  it("uses an explicit iframeTransportStrategy without constructing the browser default in embedded mode", () => {
    h.createControllerMock.mockReturnValueOnce(new h.StubIframeController());
    const iframeTransportStrategy = { fake: "transport" } as unknown as never;

    createAbstraxionRuntime(makeConfig({ type: "embedded" }), {
      autoInitialize: false,
      strategies: { iframeTransportStrategy },
    });

    expect(h.browserIframeCtor).not.toHaveBeenCalled();
    const passedStrategies = h.createControllerMock.mock.calls[0]![1];
    expect(passedStrategies.iframeTransportStrategy).toBe(
      iframeTransportStrategy,
    );
  });
});

// ---------------------------------------------------------------------------
// Approval subscription
// ---------------------------------------------------------------------------

describe("createAbstraxionRuntime — approval subscription", () => {
  it("subscribeApproval is a no-op outside embedded mode", () => {
    const popup = new h.StubPopupController();
    h.createControllerMock.mockReturnValueOnce(popup);

    const runtime = createAbstraxionRuntime(makeConfig({ type: "popup" }), {
      autoInitialize: false,
    });

    const cb = vi.fn();
    const unsubscribe = runtime.subscribeApproval(cb);
    expect(typeof unsubscribe).toBe("function");
    expect(runtime.getApprovalState()).toBe(false);
    unsubscribe();
    expect(cb).not.toHaveBeenCalled();
  });

  it("subscribeApproval forwards to IframeController in embedded mode", () => {
    const iframe = new h.StubIframeController();
    h.createControllerMock.mockReturnValueOnce(iframe);

    const runtime = createAbstraxionRuntime(makeConfig({ type: "embedded" }), {
      autoInitialize: false,
    });

    const cb = vi.fn();
    runtime.subscribeApproval(cb);
    iframe.setApproval(true);

    expect(cb).toHaveBeenCalledWith(true);
    expect(runtime.getApprovalState()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Read client
// ---------------------------------------------------------------------------

describe("createAbstraxionRuntime — createReadClient", () => {
  it("memoizes CosmWasmClient.connect across calls", async () => {
    h.createControllerMock.mockReturnValueOnce(new h.StubRedirectController());
    const runtime = createAbstraxionRuntime(makeConfig({ type: "redirect" }), {
      autoInitialize: false,
    });

    const a = runtime.createReadClient();
    const b = runtime.createReadClient();

    expect(a).toBe(b);
    await expect(a).resolves.toEqual({ kind: "cosmwasm-client" });
    expect(h.cosmwasmConnect).toHaveBeenCalledTimes(1);
    expect(h.cosmwasmConnect).toHaveBeenCalledWith("https://rpc.test/");
  });

  it("retries after a failed connect (does not cache rejected promise)", async () => {
    h.createControllerMock.mockReturnValueOnce(new h.StubRedirectController());
    h.cosmwasmConnect
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({ kind: "cosmwasm-client" });

    const runtime = createAbstraxionRuntime(makeConfig({ type: "redirect" }), {
      autoInitialize: false,
    });

    await expect(runtime.createReadClient()).rejects.toThrow("boom");
    await expect(runtime.createReadClient()).resolves.toEqual({
      kind: "cosmwasm-client",
    });
    expect(h.cosmwasmConnect).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// Direct signing client
// ---------------------------------------------------------------------------

describe("createAbstraxionRuntime — createDirectSigningClient", () => {
  it.each([
    ["popup", "StubPopupController"],
    ["redirect", "StubRedirectController"],
    ["embedded", "StubIframeController"],
  ] as const)(
    "returns RequireSigningClient bound to the rpcUrl in %s mode",
    async (mode, ctorKey) => {
      const ControllerCtor = h[ctorKey as keyof typeof h] as new () => unknown;
      const controller = new ControllerCtor();
      h.createControllerMock.mockReturnValueOnce(controller);

      const runtime = createAbstraxionRuntime(
        makeConfig({ type: mode } as AbstraxionConfig["authentication"]),
        { autoInitialize: false },
      );

      const client = await runtime.createDirectSigningClient();
      expect(client).toBeInstanceOf(h.StubRequireSigningClient);
      expect(
        (client as InstanceType<typeof h.StubRequireSigningClient>).rpcUrl,
      ).toBe("https://rpc.test/");
    },
  );

  it("throws in signer mode if user has not connected yet", async () => {
    const signer = new h.StubSignerController();
    h.createControllerMock.mockReturnValueOnce(signer);
    const runtime = createAbstraxionRuntime(
      makeConfig({ type: "signer" } as AbstraxionConfig["authentication"]),
      { autoInitialize: false },
    );

    await expect(runtime.createDirectSigningClient()).rejects.toThrow(
      /user is not connected/,
    );
  });

  it("returns AAClient in signer mode after a connected login with valid metadata", async () => {
    const signer = new h.StubSignerController();
    signer.state = connectedState();
    signer.getConnectionInfo.mockReturnValue({
      metadata: {
        authenticatorType: "Secp256K1",
        authenticatorIndex: 2,
      },
      signMessage: vi.fn(),
    });
    h.createControllerMock.mockReturnValueOnce(signer);

    const runtime = createAbstraxionRuntime(
      makeConfig({ type: "signer" } as AbstraxionConfig["authentication"]),
      { autoInitialize: false },
    );

    const client = await runtime.createDirectSigningClient();
    expect(h.createSignerFromSigningFunctionMock).toHaveBeenCalledTimes(1);
    expect(h.aaClientConnectWithSigner).toHaveBeenCalledTimes(1);
    expect(client).toEqual({ kind: "aa-client" });
  });

  it("throws in signer mode when authenticatorType is missing/invalid", async () => {
    const signer = new h.StubSignerController();
    signer.state = connectedState();
    signer.getConnectionInfo.mockReturnValue({
      metadata: { authenticatorIndex: 0 },
      signMessage: vi.fn(),
    });
    h.createControllerMock.mockReturnValueOnce(signer);

    const runtime = createAbstraxionRuntime(
      makeConfig({ type: "signer" } as AbstraxionConfig["authentication"]),
      { autoInitialize: false },
    );

    await expect(runtime.createDirectSigningClient()).rejects.toThrow(
      /authenticatorType is missing or invalid/,
    );
  });
});

// ---------------------------------------------------------------------------
// Manage authenticators
// ---------------------------------------------------------------------------

describe("createAbstraxionRuntime — manageAuthenticators", () => {
  it.each([
    ["popup", "StubPopupController"],
    ["redirect", "StubRedirectController"],
    ["embedded", "StubIframeController"],
  ] as const)("delegates to the controller in %s mode", async (mode, ctorKey) => {
    const ControllerCtor = h[ctorKey as keyof typeof h] as new () => {
      promptManageAuthenticators: ReturnType<typeof vi.fn>;
    };
    const ctrl = new ControllerCtor();
    h.createControllerMock.mockReturnValueOnce(ctrl);

    const runtime = createAbstraxionRuntime(
      makeConfig({ type: mode } as AbstraxionConfig["authentication"]),
      { autoInitialize: false },
    );

    await runtime.manageAuthenticators("xion1granter");
    expect(ctrl.promptManageAuthenticators).toHaveBeenCalledWith(
      "xion1granter",
    );
    expect(runtime.isManageAuthSupported).toBe(true);
    expect(runtime.manageAuthUnsupportedReason).toBeUndefined();
  });

  it("throws and exposes a reason in signer mode", async () => {
    h.createControllerMock.mockReturnValueOnce(new h.StubSignerController());
    const runtime = createAbstraxionRuntime(
      makeConfig({ type: "signer" } as AbstraxionConfig["authentication"]),
      { autoInitialize: false },
    );

    expect(runtime.isManageAuthSupported).toBe(false);
    expect(runtime.manageAuthUnsupportedReason).toMatch(/signer mode/);
    await expect(
      runtime.manageAuthenticators("xion1granter"),
    ).rejects.toThrow(/signer mode/);
  });
});

// ---------------------------------------------------------------------------
// updateGetSignerConfig
// ---------------------------------------------------------------------------

describe("createAbstraxionRuntime — updateGetSignerConfig", () => {
  it("delegates to SignerController.updateGetSignerConfig in signer mode", () => {
    const signer = new h.StubSignerController();
    h.createControllerMock.mockReturnValueOnce(signer);

    const runtime = createAbstraxionRuntime(
      makeConfig({ type: "signer" } as AbstraxionConfig["authentication"]),
      { autoInitialize: false },
    );

    const fn = vi.fn();
    runtime.updateGetSignerConfig(
      fn as Parameters<typeof runtime.updateGetSignerConfig>[0],
    );
    expect(signer.updateGetSignerConfig).toHaveBeenCalledWith(fn);
  });

  it("is a no-op for non-signer controllers", () => {
    const popup = new h.StubPopupController();
    h.createControllerMock.mockReturnValueOnce(popup);

    const runtime = createAbstraxionRuntime(makeConfig({ type: "popup" }), {
      autoInitialize: false,
    });

    expect(() =>
      runtime.updateGetSignerConfig(
        vi.fn() as Parameters<typeof runtime.updateGetSignerConfig>[0],
      ),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// initialize / autoInitialize / destroy
// ---------------------------------------------------------------------------

describe("createAbstraxionRuntime — lifecycle", () => {
  it("autoInitialize: true (default) calls controller.initialize()", () => {
    const popup = new h.StubPopupController();
    h.createControllerMock.mockReturnValueOnce(popup);

    createAbstraxionRuntime(makeConfig({ type: "popup" }));
    expect(popup.initialize).toHaveBeenCalledTimes(1);
  });

  it("autoInitialize: false skips initialize until called explicitly", async () => {
    const popup = new h.StubPopupController();
    h.createControllerMock.mockReturnValueOnce(popup);

    const runtime = createAbstraxionRuntime(makeConfig({ type: "popup" }), {
      autoInitialize: false,
    });

    expect(popup.initialize).not.toHaveBeenCalled();
    await runtime.initialize();
    expect(popup.initialize).toHaveBeenCalledTimes(1);
  });

  it("initialize() is idempotent", async () => {
    const popup = new h.StubPopupController();
    h.createControllerMock.mockReturnValueOnce(popup);

    const runtime = createAbstraxionRuntime(makeConfig({ type: "popup" }), {
      autoInitialize: false,
    });

    const a = runtime.initialize();
    const b = runtime.initialize();

    expect(a).toBe(b);
    await Promise.all([a, b]);
    expect(popup.initialize).toHaveBeenCalledTimes(1);
  });

  it("destroy() delegates to controller.destroy()", () => {
    const popup = new h.StubPopupController();
    h.createControllerMock.mockReturnValueOnce(popup);

    const runtime = createAbstraxionRuntime(makeConfig({ type: "popup" }), {
      autoInitialize: false,
    });

    runtime.destroy();
    expect(popup.destroy).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Dev-mode no-grants warning
// ---------------------------------------------------------------------------

describe("createAbstraxionRuntime — dev-mode no-grants warning", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    process.env.NODE_ENV = "development";
  });

  afterEach(() => {
    warnSpy.mockRestore();
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("warns when popup mode has no grants", () => {
    h.createControllerMock.mockReturnValueOnce(new h.StubPopupController());
    createAbstraxionRuntime(
      makeConfig({ type: "popup" }, { treasury: undefined }),
      { autoInitialize: false },
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("No grants configured"),
    );
  });

  it("does not warn when treasury is configured", () => {
    h.createControllerMock.mockReturnValueOnce(new h.StubPopupController());
    createAbstraxionRuntime(makeConfig({ type: "popup" }), {
      autoInitialize: false,
    });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("does not warn in signer mode", () => {
    h.createControllerMock.mockReturnValueOnce(new h.StubSignerController());
    createAbstraxionRuntime(
      makeConfig(
        { type: "signer" } as AbstraxionConfig["authentication"],
        { treasury: undefined },
      ),
      { autoInitialize: false },
    );
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("does not warn in production", () => {
    process.env.NODE_ENV = "production";
    h.createControllerMock.mockReturnValueOnce(new h.StubPopupController());
    createAbstraxionRuntime(
      makeConfig({ type: "popup" }, { treasury: undefined }),
      { autoInitialize: false },
    );
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
