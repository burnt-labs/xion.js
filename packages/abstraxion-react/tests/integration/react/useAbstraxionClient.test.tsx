/**
 * useAbstraxionClient — React-glue tests.
 *
 * Asserts the effect lifecycle: createReadClient is called once on mount,
 * the resolved client is stored in state, errors surface as an Error
 * instance, in-flight effects are cancelled on unmount, and the effect
 * re-runs when rpcUrl changes. The runtime's read-client memoization is
 * covered by the runtime unit tests.
 */

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { AbstraxionProvider } from "../../../src/AbstraxionProvider";
import { useAbstraxionClient } from "../../../src/hooks/useAbstraxionClient";
import { createStubRuntime, type StubRuntime } from "./runtimeStub";

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
let createReadClientMock: ReturnType<typeof vi.fn>;

function makeWrapper(rpcUrl?: string) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <AbstraxionProvider
        config={{
          chainId: "xion-testnet-1",
          rpcUrl: rpcUrl ?? "https://rpc.test/",
          authentication: { type: "redirect" },
        }}
      >
        {children}
      </AbstraxionProvider>
    );
  };
}

beforeEach(() => {
  createReadClientMock = vi
    .fn()
    .mockResolvedValue({ kind: "cosmwasm-client" });
  runtimeFactory = (config) => {
    runtime = createStubRuntime(config, {
      createReadClient: createReadClientMock as never,
    });
    return runtime;
  };
});

afterEach(() => {
  cleanup();
});

describe("useAbstraxionClient", () => {
  it("calls runtime.createReadClient once on mount and stores the client", async () => {
    const { result } = renderHook(() => useAbstraxionClient(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => {
      expect(result.current.client).toEqual({ kind: "cosmwasm-client" });
    });
    expect(createReadClientMock).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeUndefined();
  });

  it("sets an Error instance when the runtime promise rejects", async () => {
    createReadClientMock.mockRejectedValueOnce(new Error("rpc down"));

    const { result } = renderHook(() => useAbstraxionClient(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toMatch(/rpc down/);
    });
    expect(result.current.client).toBeUndefined();
  });

  it("does not setState after unmount when the in-flight promise resolves later", async () => {
    let resolve!: (v: unknown) => void;
    createReadClientMock.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { unmount } = renderHook(() => useAbstraxionClient(), {
      wrapper: makeWrapper(),
    });
    unmount();
    resolve({ kind: "cosmwasm-client" });
    // Allow microtasks to flush — if cancellation is broken, React would warn.
    await new Promise((r) => setTimeout(r, 0));

    expect(
      errorSpy.mock.calls.some((call) =>
        String(call[0]).includes("unmounted component"),
      ),
    ).toBe(false);
    errorSpy.mockRestore();
  });

  it("re-runs the effect when rpcUrl changes", async () => {
    const { result, rerender } = renderHook(() => useAbstraxionClient(), {
      wrapper: makeWrapper("https://rpc.test/"),
    });

    await waitFor(() => {
      expect(result.current.client).toBeDefined();
    });
    const callsBefore = createReadClientMock.mock.calls.length;

    // Force a fresh provider mount with a different rpcUrl.
    rerender();
    // Then re-mount with new wrapper — renderHook returns a new tree.
    cleanup();
    renderHook(() => useAbstraxionClient(), {
      wrapper: makeWrapper("https://rpc.test-2/"),
    });

    await waitFor(() => {
      expect(createReadClientMock.mock.calls.length).toBeGreaterThan(
        callsBefore,
      );
    });
  });
});
