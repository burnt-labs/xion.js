/**
 * useAbstraxionSigningClient — React-glue tests.
 *
 * - requireAuth: false returns the context's signingClient + signArb
 * - requireAuth: true calls runtime.createDirectSigningClient once
 * - sets a friendly error in signer mode before the user is connected
 * - subscribes to RedirectController.signResult via useSyncExternalStore
 *
 * Per-mode AAClient/RequireSigningClient construction is covered by the
 * runtime unit tests.
 */

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  renderHook,
  waitFor,
} from "@testing-library/react";
import { AbstraxionProvider } from "../../../src/AbstraxionProvider";
import { useAbstraxionSigningClient } from "../../../src/hooks/useAbstraxionSigningClient";
import {
  connectedState,
  createStubRuntime,
  type StubRuntime,
} from "./runtimeStub";

vi.mock("@burnt-labs/abstraxion-js", async () => {
  const actual = await vi.importActual<
    typeof import("@burnt-labs/abstraxion-js")
  >("@burnt-labs/abstraxion-js");
  return {
    ...actual,
    createAbstraxionRuntime: (...args: unknown[]) =>
      runtimeFactory(
        args[0] as Parameters<typeof actual.createAbstraxionRuntime>[0],
      ),
  };
});

let runtimeFactory: (
  config: Parameters<
    typeof import("@burnt-labs/abstraxion-js").createAbstraxionRuntime
  >[0],
) => StubRuntime;
let runtime: StubRuntime;

function makeWrapper(
  modeProps: {
    type: "redirect" | "signer" | "popup" | "embedded";
  } = { type: "redirect" },
) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <AbstraxionProvider
        config={
          modeProps.type === "signer"
            ? ({
                chainId: "xion-testnet-1",
                authentication: {
                  type: "signer",
                  aaApiUrl: "https://aa.test",
                  getSignerConfig: vi.fn(),
                  smartAccountContract: {
                    codeId: 1,
                    checksum: "abc",
                    addressPrefix: "xion",
                  },
                },
              } as never)
            : {
                chainId: "xion-testnet-1",
                authentication: { type: modeProps.type },
              }
        }
      >
        {children}
      </AbstraxionProvider>
    );
  };
}

afterEach(() => {
  cleanup();
});

describe("useAbstraxionSigningClient — requireAuth: false", () => {
  beforeEach(() => {
    runtimeFactory = (config) => {
      runtime = createStubRuntime(config, {
        state: connectedState("xion1conn"),
      });
      return runtime;
    };
  });

  it("returns the context's signingClient + signArb from the keypair", async () => {
    const { result } = renderHook(() => useAbstraxionSigningClient(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => {
      expect(result.current.client).toEqual({ kind: "grantee-client" });
      expect(typeof result.current.signArb).toBe("function");
    });
    expect(runtime.createDirectSigningClient).not.toHaveBeenCalled();
  });
});

describe("useAbstraxionSigningClient — requireAuth: true", () => {
  it("calls runtime.createDirectSigningClient once and stores the result", async () => {
    runtimeFactory = (config) => {
      runtime = createStubRuntime(config, {
        authMode: "popup",
        state: connectedState("xion1conn"),
      });
      return runtime;
    };

    const { result } = renderHook(
      () => useAbstraxionSigningClient({ requireAuth: true }),
      { wrapper: makeWrapper({ type: "popup" }) },
    );

    await waitFor(() => {
      expect(result.current.client).toEqual({ kind: "direct-signing-client" });
    });
    expect(runtime.createDirectSigningClient).toHaveBeenCalledTimes(1);
  });

  it("surfaces a friendly error in signer mode before connection", async () => {
    runtimeFactory = (config) => {
      runtime = createStubRuntime(config, { authMode: "signer" });
      return runtime;
    };

    const { result } = renderHook(
      () => useAbstraxionSigningClient({ requireAuth: true }),
      { wrapper: makeWrapper({ type: "signer" }) },
    );

    await waitFor(() => {
      expect(result.current.error).toMatch(
        /Direct signing requires a connected account/,
      );
    });
    expect(result.current.client).toBeUndefined();
    expect(runtime.createDirectSigningClient).not.toHaveBeenCalled();
  });
});

describe("useAbstraxionSigningClient — redirect signResult subscription", () => {
  it("subscribes to RedirectController.signResult and clears it via clearSignResult", async () => {
    const signResultStore = {
      _value: null as unknown,
      _subs: new Set<() => void>(),
      subscribe(cb: () => void) {
        this._subs.add(cb);
        return () => this._subs.delete(cb);
      },
      snapshot() {
        return this._value as never;
      },
      set(v: unknown) {
        this._value = v;
        this._subs.forEach((cb) => cb());
      },
      clear() {
        this.set(null);
      },
    };

    const { RedirectController } = await vi.importActual<
      typeof import("@burnt-labs/abstraxion-js")
    >("@burnt-labs/abstraxion-js");
    const fakeRedirectController = Object.assign(
      Object.create(RedirectController.prototype),
      { signResult: signResultStore },
    );

    runtimeFactory = (config) => {
      runtime = createStubRuntime(config, {
        authMode: "redirect",
        state: connectedState("xion1conn"),
        controller: fakeRedirectController,
      });
      return runtime;
    };

    const { result } = renderHook(
      () => useAbstraxionSigningClient({ requireAuth: true }),
      { wrapper: makeWrapper({ type: "redirect" }) },
    );

    expect(result.current.signResult).toBeNull();
    expect(result.current.clearSignResult).toBeUndefined();

    await act(async () => {
      signResultStore.set({ success: true, transactionHash: "0xabc" });
    });

    await waitFor(() => {
      expect(result.current.signResult).toEqual({
        success: true,
        transactionHash: "0xabc",
      });
      expect(typeof result.current.clearSignResult).toBe("function");
    });

    await act(async () => {
      result.current.clearSignResult?.();
    });

    await waitFor(() => {
      expect(result.current.signResult).toBeNull();
    });
  });
});
