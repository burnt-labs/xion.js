/**
 * useAbstraxionAccount — React-glue tests.
 *
 * Asserts that the hook reads the right context fields, transitions on
 * runtime state ticks, and delegates login/logout to the runtime.
 *
 * Per-mode auth flow logic is covered by
 * `@burnt-labs/abstraxion-js/tests/integration/auth-flows/*`.
 */

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { AbstraxionProvider } from "../../../src/AbstraxionProvider";
import { useAbstraxionAccount } from "../../../src/hooks/useAbstraxionAccount";
import {
  connectedState,
  createStubRuntime,
  idleState,
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

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <AbstraxionProvider
      config={{
        chainId: "xion-testnet-1",
        authentication: { type: "redirect" },
      }}
    >
      {children}
    </AbstraxionProvider>
  );
}

beforeEach(() => {
  runtimeFactory = (config) => {
    runtime = createStubRuntime(config, { state: idleState });
    return runtime;
  };
});

afterEach(() => {
  cleanup();
});

describe("useAbstraxionAccount", () => {
  it("returns the expected shape", () => {
    const { result } = renderHook(() => useAbstraxionAccount(), { wrapper });
    expect(result.current).toEqual(
      expect.objectContaining({
        data: { bech32Address: "" },
        isConnected: false,
        isConnecting: false,
        isInitializing: expect.any(Boolean),
        isDisconnected: false,
        isLoading: expect.any(Boolean),
        isReturningFromAuth: false,
        isLoggingIn: false,
        isError: false,
        error: "",
        login: expect.any(Function),
        logout: expect.any(Function),
      }),
    );
  });

  it("re-renders with new shape when runtime state transitions to connected", async () => {
    const { result } = renderHook(() => useAbstraxionAccount(), { wrapper });

    expect(result.current.isConnected).toBe(false);

    await act(async () => {
      runtime.__setState(connectedState("xion1conn"));
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
      expect(result.current.data.bech32Address).toBe("xion1conn");
    });
  });

  it("login / logout delegate to the runtime", async () => {
    const { result } = renderHook(() => useAbstraxionAccount(), { wrapper });

    await act(async () => {
      await result.current.login();
    });
    expect(runtime.login).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.logout();
    });
    expect(runtime.logout).toHaveBeenCalledTimes(1);
  });
});
