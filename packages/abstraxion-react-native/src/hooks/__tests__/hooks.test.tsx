import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { aaClient, signer } = vi.hoisted(() => ({
  aaClient: { signAndBroadcast: vi.fn() },
  signer: { getAccounts: vi.fn() },
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

vi.mock("expo-linking", () => ({
  createURL: vi.fn(() => "xion-demo://"),
  getInitialURL: vi.fn(),
  parse: vi.fn(() => ({ queryParams: {} })),
}));

vi.mock("expo-web-browser", () => ({
  openAuthSessionAsync: vi.fn(),
}));

vi.mock("@burnt-labs/abstraxion-js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@burnt-labs/abstraxion-js")>();

  return {
    ...actual,
    AAClient: {
      connectWithSigner: vi.fn().mockResolvedValue(aaClient),
    },
    CosmWasmClient: {
      connect: vi.fn(),
    },
    createSignerFromSigningFunction: vi.fn(() => signer),
  };
});

import {
  AAClient,
  CosmWasmClient,
  createSignerFromSigningFunction,
  GasPrice,
  RedirectController,
} from "@burnt-labs/abstraxion-js";
import { AbstraxionContext } from "../../components/AbstraxionContext";
import { useAbstraxionAccount } from "../useAbstraxionAccount";
import { useAbstraxionClient } from "../useAbstraxionClient";
import { useAbstraxionSigningClient } from "../useAbstraxionSigningClient";
import { useManageAuthenticators } from "../useManageAuthenticators";

type ContextValue = React.ContextType<typeof AbstraxionContext>;

function createContextValue(
  overrides: Partial<ContextValue> = {},
): ContextValue {
  // Build a runtime stub that mirrors `runtime.manageAuthenticators` /
  // `runtime.createReadClient` / `runtime.createDirectSigningClient` semantics
  // for the controller passed via overrides.
  const controllerForRuntime =
    overrides.controller ?? (undefined as unknown as ContextValue["controller"]);
  const isSupported = controllerForRuntime instanceof RedirectController;
  const overrideAuthMode = (overrides.authMode ?? "redirect") as
    | "signer"
    | "redirect"
    | "embedded";
  const overrideConnectionInfo = overrides.connectionInfo;
  const overrideGranterAddress = overrides.granterAddress;
  const overrideRpcUrl = overrides.rpcUrl ?? "https://rpc.test";
  const runtime = {
    isManageAuthSupported: isSupported,
    manageAuthUnsupportedReason: isSupported
      ? undefined
      : "Manage authenticators is not supported in signer mode. Use popup, redirect, or embedded authentication to add or remove authenticators.",
    manageAuthenticators: vi.fn(async (addr: string) => {
      const ctrl = controllerForRuntime as
        | { promptManageAuthenticators?: (addr: string) => Promise<void> }
        | undefined;
      if (ctrl && typeof ctrl.promptManageAuthenticators === "function") {
        return ctrl.promptManageAuthenticators(addr);
      }
      throw new Error(
        "Manage authenticators is not supported in signer mode. Use redirect or embedded authentication to add or remove authenticators.",
      );
    }),
    // Mirror the real runtime's `createReadClient` / `createDirectSigningClient`
    // surface so hook tests can assert against the same downstream mocks the
    // production runtime would call.
    createReadClient: vi.fn(async () => CosmWasmClient.connect(overrideRpcUrl)),
    createDirectSigningClient: vi.fn(async () => {
      if (overrideAuthMode === "signer") {
        const info = overrideConnectionInfo as
          | { signMessage: unknown; metadata?: Record<string, unknown> }
          | undefined;
        if (!info || !overrideGranterAddress) return undefined;
        const meta = info.metadata ?? {};
        createSignerFromSigningFunction({
          smartAccountAddress: overrideGranterAddress,
          authenticatorIndex: (meta.authenticatorIndex as number | undefined) ?? 0,
          authenticatorType: meta.authenticatorType as never,
          signMessage: info.signMessage as never,
        });
        return AAClient.connectWithSigner(overrideRpcUrl, signer as never, {
          gasPrice: GasPrice.fromString("0.001uxion"),
        });
      }
      // Redirect / embedded: production runtime returns a RequireSigningClient.
      // Tests don't need the real implementation; a sentinel object is enough.
      return { __mockRequireSigningClient: true } as never;
    }),
    subscribe: vi.fn(() => () => undefined),
    subscribeApproval: vi.fn(() => () => undefined),
    getApprovalState: vi.fn(() => false),
    getState: vi.fn(),
    initialize: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    destroy: vi.fn(),
    updateGetSignerConfig: vi.fn(),
    controller: controllerForRuntime,
    config: {} as unknown,
    authMode: overrideAuthMode,
  } as unknown as ContextValue["runtime"];

  return {
    isConnected: false,
    isConnecting: false,
    isInitializing: false,
    isDisconnected: false,
    isAwaitingApproval: false,
    isReturningFromAuth: false,
    isLoggingIn: false,
    abstraxionError: "",
    abstraxionAccount: undefined,
    granterAddress: "",
    contracts: undefined,
    chainId: "xion-testnet-2",
    rpcUrl: "https://rpc.test",
    restUrl: "https://rest.test",
    stake: false,
    bank: undefined,
    treasury: undefined,
    indexerUrl: undefined,
    gasPrice: GasPrice.fromString("0.001uxion"),
    signingClient: undefined,
    authMode: "redirect",
    authentication: { type: "redirect" },
    connectionInfo: undefined,
    controller: undefined,
    runtime,
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function wrapper(value: ContextValue) {
  return ({ children }: { children: React.ReactNode }) => (
    <AbstraxionContext.Provider value={value}>
      {children}
    </AbstraxionContext.Provider>
  );
}

describe("React Native hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("useAbstraxionAccount exposes React parity loading and disconnected state", async () => {
    const context = createContextValue({
      granterAddress: "xion1account",
      isConnected: true,
      isDisconnected: true,
      isInitializing: true,
    });

    const { result } = renderHook(() => useAbstraxionAccount(), {
      wrapper: wrapper(context),
    });

    expect(result.current.data.bech32Address).toBe("xion1account");
    expect(result.current.isConnected).toBe(true);
    expect(result.current.isDisconnected).toBe(true);
    expect(result.current.isLoading).toBe(true);
    await expect(result.current.logout()).resolves.toBeUndefined();
  });

  it("useAbstraxionClient returns a CosmWasmClient and clears errors on success", async () => {
    const client = { getChainId: vi.fn() };
    vi.mocked(CosmWasmClient.connect).mockResolvedValueOnce(client as never);

    const { result } = renderHook(() => useAbstraxionClient(), {
      wrapper: wrapper(createContextValue()),
    });

    await waitFor(() => {
      expect(result.current.client).toBe(client);
    });
    expect(result.current.error).toBeUndefined();
  });

  it("useAbstraxionClient returns an Error when RPC connection fails", async () => {
    vi.mocked(CosmWasmClient.connect).mockRejectedValueOnce(
      new Error("network down"),
    );

    const { result } = renderHook(() => useAbstraxionClient(), {
      wrapper: wrapper(createContextValue()),
    });

    await waitFor(() => {
      expect(result.current.error?.message).toContain("network down");
    });
    expect(result.current.client).toBeUndefined();
  });

  it("useAbstraxionSigningClient returns the session signing client by default", () => {
    const signArb = vi.fn();
    const signingClient = { signAndBroadcast: vi.fn() };
    const account = { signArb };

    const { result } = renderHook(() => useAbstraxionSigningClient(), {
      wrapper: wrapper(
        createContextValue({
          abstraxionAccount: account as never,
          signingClient: signingClient as never,
        }),
      ),
    });

    expect(result.current.client).toBe(signingClient);
    expect(result.current.signArb).toBe(signArb);
    expect(result.current.rpcUrl).toBe("https://rpc.test");
    expect(result.current.error).toBeUndefined();
  });

  it("useAbstraxionSigningClient returns a direct signing client in redirect requireAuth mode", async () => {
    const { result } = renderHook(
      () => useAbstraxionSigningClient({ requireAuth: true }),
      {
        wrapper: wrapper(
          createContextValue({
            authMode: "redirect",
            granterAddress: "xion1granter",
          }),
        ),
      },
    );

    // Runtime now produces a RequireSigningClient for redirect mode (Phase 9e
    // unification — previously the RN hook fenced this off).
    await waitFor(() => {
      expect(result.current.client).toBeDefined();
    });
    expect(result.current.error).toBeUndefined();
    expect(result.current.signArb).toBeUndefined();
  });

  it("useAbstraxionSigningClient creates an AAClient in signer requireAuth mode", async () => {
    const signMessage = vi.fn();

    const { result } = renderHook(
      () => useAbstraxionSigningClient({ requireAuth: true }),
      {
        wrapper: wrapper(
          createContextValue({
            authMode: "signer",
            granterAddress: "xion1granter",
            connectionInfo: {
              signMessage,
              metadata: {
                authenticatorType: "secp256k1",
                authenticatorIndex: 2,
              },
            } as never,
          }),
        ),
      },
    );

    await waitFor(() => {
      expect(result.current.client).toBe(aaClient);
    });
    expect(createSignerFromSigningFunction).toHaveBeenCalledWith({
      smartAccountAddress: "xion1granter",
      authenticatorIndex: 2,
      authenticatorType: "secp256k1",
      signMessage,
    });
    expect(AAClient.connectWithSigner).toHaveBeenCalledWith(
      "https://rpc.test",
      signer,
      { gasPrice: expect.any(Object) },
    );
  });

  it("useManageAuthenticators reports unsupported when not in redirect mode", async () => {
    const { result } = renderHook(() => useManageAuthenticators(), {
      wrapper: wrapper(
        createContextValue({
          granterAddress: "xion1granter",
          authMode: "signer",
        }),
      ),
    });

    expect(result.current.isSupported).toBe(false);
    expect(result.current.manageAuthResult).toBeNull();
    expect(result.current.unsupportedReason).toContain("signer mode");

    await expect(result.current.manageAuthenticators()).rejects.toThrow(
      "signer mode",
    );

    act(() => {
      result.current.clearManageAuthResult();
    });
  });

  it("useManageAuthenticators delegates to RedirectController when active", async () => {
    const { RedirectController } = await import("@burnt-labs/abstraxion-js");
    const promptManageAuthenticators = vi
      .fn()
      .mockResolvedValue(undefined);
    const subscribeMock = vi.fn(() => () => undefined);
    const fakeController = Object.create(RedirectController.prototype);
    fakeController.promptManageAuthenticators = promptManageAuthenticators;
    fakeController.manageAuthResult = {
      subscribe: subscribeMock,
      snapshot: vi.fn().mockReturnValue(null),
      clear: vi.fn(),
    };

    const { result } = renderHook(() => useManageAuthenticators(), {
      wrapper: wrapper(
        createContextValue({
          granterAddress: "xion1granter",
          controller: fakeController as never,
        }),
      ),
    });

    expect(result.current.isSupported).toBe(true);
    expect(result.current.unsupportedReason).toBeUndefined();

    await act(async () => {
      await result.current.manageAuthenticators();
    });

    expect(promptManageAuthenticators).toHaveBeenCalledWith("xion1granter");
  });

  it("useManageAuthenticators throws a connected-account error first", async () => {
    const { result } = renderHook(() => useManageAuthenticators(), {
      wrapper: wrapper(createContextValue()),
    });

    await expect(result.current.manageAuthenticators()).rejects.toThrow(
      "not connected",
    );
  });
});
