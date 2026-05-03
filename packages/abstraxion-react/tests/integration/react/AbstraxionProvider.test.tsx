/**
 * AbstraxionProvider — React-glue tests.
 *
 * The provider is a thin wrapper over `createAbstraxionRuntime` from
 * `@burnt-labs/abstraxion-js`. These tests assert the React-specific glue:
 *   - context is populated correctly per mode
 *   - runtime.subscribe is wired via useSyncExternalStore
 *   - runtime.subscribeApproval feeds isAwaitingApproval (embedded mode)
 *   - runtime.updateGetSignerConfig is called when the prop reference changes (signer mode)
 *   - runtime.destroy is called on unmount
 *   - the default context throws "called before provider mounted"
 *
 * Mode-specific runtime behavior (controller dispatch, manage-auth dispatch,
 * direct signing construction, etc.) is covered by the runtime unit tests in
 * `@burnt-labs/abstraxion-js/src/__tests__/runtime.test.ts`.
 */

import React, { useContext } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import {
  AbstraxionContext,
  AbstraxionProvider,
} from "../../../src/AbstraxionProvider";
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
    createAbstraxionRuntime: (...args: unknown[]) => {
      const config = args[0] as Parameters<
        typeof actual.createAbstraxionRuntime
      >[0];
      return runtimeFactory(config);
    },
  };
});

let runtimeFactory: (
  config: Parameters<
    typeof import("@burnt-labs/abstraxion-js").createAbstraxionRuntime
  >[0],
) => StubRuntime;

function setRuntimeFactory(
  fn: (
    config: Parameters<
      typeof import("@burnt-labs/abstraxion-js").createAbstraxionRuntime
    >[0],
  ) => StubRuntime,
) {
  runtimeFactory = fn;
}

beforeEach(() => {
  setRuntimeFactory((config) => createStubRuntime(config));
});

afterEach(() => {
  cleanup();
});

function ContextProbe() {
  const ctx = useContext(AbstraxionContext);
  return (
    <div>
      <div data-testid="chain-id">{ctx.chainId}</div>
      <div data-testid="rpc-url">{ctx.rpcUrl}</div>
      <div data-testid="gas-price">{ctx.gasPrice}</div>
      <div data-testid="auth-mode">{ctx.authMode}</div>
      <div data-testid="is-connected">
        {ctx.isConnected ? "connected" : "disconnected"}
      </div>
      <div data-testid="granter">{ctx.granterAddress}</div>
      <div data-testid="awaiting-approval">
        {ctx.isAwaitingApproval ? "yes" : "no"}
      </div>
    </div>
  );
}

describe("AbstraxionProvider — context wiring per mode", () => {
  it.each(["redirect", "signer", "popup", "embedded"] as const)(
    "%s mode populates context",
    (mode) => {
      let runtime: StubRuntime | undefined;
      setRuntimeFactory((config) => {
        runtime = createStubRuntime(config, { authMode: mode });
        return runtime;
      });

      render(
        <AbstraxionProvider
          config={{
            chainId: "xion-testnet-1",
            authentication:
              mode === "signer"
                ? ({
                    type: "signer",
                    aaApiUrl: "https://aa.test",
                    getSignerConfig: vi.fn(),
                    smartAccountContract: {
                      codeId: 1,
                      checksum: "abc",
                      addressPrefix: "xion",
                    },
                  } as never)
                : ({ type: mode } as never),
          }}
        >
          <ContextProbe />
        </AbstraxionProvider>,
      );

      expect(runtime).toBeDefined();
      expect(screen.getByTestId("chain-id").textContent).toBe(
        "xion-testnet-1",
      );
      expect(screen.getByTestId("rpc-url").textContent).toBe(
        "https://rpc.test/",
      );
      expect(screen.getByTestId("gas-price").textContent).toBe("0.001uxion");
      expect(screen.getByTestId("auth-mode").textContent).toBe(mode);
    },
  );
});

describe("AbstraxionProvider — useSyncExternalStore wiring", () => {
  it("re-renders the consumer when runtime.subscribe fires", async () => {
    let runtime: StubRuntime | undefined;
    setRuntimeFactory((config) => {
      runtime = createStubRuntime(config, { state: idleState });
      return runtime;
    });

    render(
      <AbstraxionProvider
        config={{
          chainId: "xion-testnet-1",
          authentication: { type: "redirect" },
        }}
      >
        <ContextProbe />
      </AbstraxionProvider>,
    );

    expect(screen.getByTestId("is-connected").textContent).toBe("disconnected");

    await act(async () => {
      runtime!.__setState(connectedState("xion1abc"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("is-connected").textContent).toBe("connected");
      expect(screen.getByTestId("granter").textContent).toBe("xion1abc");
    });
  });

  it("re-renders isAwaitingApproval when runtime.subscribeApproval fires (embedded mode)", async () => {
    let runtime: StubRuntime | undefined;
    setRuntimeFactory((config) => {
      runtime = createStubRuntime(config, { authMode: "embedded" });
      return runtime;
    });

    render(
      <AbstraxionProvider
        config={{
          chainId: "xion-testnet-1",
          authentication: { type: "embedded" },
        }}
      >
        <ContextProbe />
      </AbstraxionProvider>,
    );

    expect(screen.getByTestId("awaiting-approval").textContent).toBe("no");
    await act(async () => {
      runtime!.__setApproval(true);
    });
    await waitFor(() => {
      expect(screen.getByTestId("awaiting-approval").textContent).toBe("yes");
    });
  });
});

describe("AbstraxionProvider — signer mode getSignerConfig updates", () => {
  it("calls runtime.updateGetSignerConfig when the prop reference changes", async () => {
    let runtime: StubRuntime | undefined;
    setRuntimeFactory((config) => {
      runtime = createStubRuntime(config, { authMode: "signer" });
      return runtime;
    });

    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const baseConfig = {
      chainId: "xion-testnet-1",
      authentication: {
        type: "signer" as const,
        aaApiUrl: "https://aa.test",
        smartAccountContract: {
          codeId: 1,
          checksum: "abc",
          addressPrefix: "xion",
        },
      },
    };

    const { rerender } = render(
      <AbstraxionProvider
        config={
          {
            ...baseConfig,
            authentication: { ...baseConfig.authentication, getSignerConfig: fn1 },
          } as never
        }
      >
        <ContextProbe />
      </AbstraxionProvider>,
    );

    await waitFor(() => {
      expect(runtime!.updateGetSignerConfig).toHaveBeenCalledWith(fn1);
    });

    rerender(
      <AbstraxionProvider
        config={
          {
            ...baseConfig,
            authentication: { ...baseConfig.authentication, getSignerConfig: fn2 },
          } as never
        }
      >
        <ContextProbe />
      </AbstraxionProvider>,
    );

    await waitFor(() => {
      expect(runtime!.updateGetSignerConfig).toHaveBeenCalledWith(fn2);
    });
  });
});

describe("AbstraxionProvider — lifecycle", () => {
  it("calls runtime.destroy on unmount", () => {
    let runtime: StubRuntime | undefined;
    setRuntimeFactory((config) => {
      runtime = createStubRuntime(config);
      return runtime;
    });

    const { unmount } = render(
      <AbstraxionProvider
        config={{
          chainId: "xion-testnet-1",
          authentication: { type: "redirect" },
        }}
      >
        <ContextProbe />
      </AbstraxionProvider>,
    );

    expect(runtime!.destroy).not.toHaveBeenCalled();
    unmount();
    expect(runtime!.destroy).toHaveBeenCalledTimes(1);
  });

  it("calls runtime.initialize after mount", async () => {
    let runtime: StubRuntime | undefined;
    setRuntimeFactory((config) => {
      runtime = createStubRuntime(config);
      return runtime;
    });

    render(
      <AbstraxionProvider
        config={{
          chainId: "xion-testnet-1",
          authentication: { type: "redirect" },
        }}
      >
        <ContextProbe />
      </AbstraxionProvider>,
    );

    await waitFor(() => {
      expect(runtime!.initialize).toHaveBeenCalledTimes(1);
    });
  });
});

describe("AbstraxionProvider — default context guards", () => {
  it("default login/logout throw 'called before provider mounted'", async () => {
    let captured!: React.ContextType<typeof AbstraxionContext>;
    function Probe() {
      captured = useContext(AbstraxionContext);
      return null;
    }
    render(<Probe />);
    await expect(captured.login()).rejects.toThrow(
      /called before provider mounted/,
    );
    await expect(captured.logout()).rejects.toThrow(
      /called before provider mounted/,
    );
  });
});
