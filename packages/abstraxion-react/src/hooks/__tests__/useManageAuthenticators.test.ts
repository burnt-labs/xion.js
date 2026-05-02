// @vitest-environment jsdom
/**
 * useManageAuthenticators — unit tests
 *
 * Covers:
 * - isSupported for popup, iframe, redirect, and signer controllers
 * - manageAuthenticators() delegates to the correct controller method
 * - manageAuthenticators() throws when not connected (no granterAddress)
 * - manageAuthenticators() throws when controller doesn't support the feature
 * - manageAuthResult and clearManageAuthResult wiring for redirect mode
 */

import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { AbstraxionContext } from "../../AbstraxionProvider";
import { useManageAuthenticators } from "../useManageAuthenticators";

// ─── Minimal controller mocks ─────────────────────────────────────────────────

function makeSignerController() {
  return {};
}

// ─── Mock the controller class checks ─────────────────────────────────────────
// Rather than mocking the modules, we use instanceof by making the mock objects
// extend the real controller classes. The simpler approach is to spy on
// instanceof checks — but that's not straightforward in JS.
// Instead we mock the module to return our fakes as the controller classes so
// that `instanceof` returns true for our mocks.

vi.mock("@burnt-labs/abstraxion-js", () => {
  class PopupController {
    promptManageAuthenticators = vi.fn().mockResolvedValue(undefined);
  }

  class IframeController {
    promptManageAuthenticators = vi.fn().mockResolvedValue(undefined);
  }

  class RedirectController {
    manageAuthResult = (() => {
      let _value: { success: boolean; error?: string } | null = null;
      const _subscribers = new Set<() => void>();
      return {
        get: vi.fn(() => _value),
        snapshot: vi.fn(() => _value),
        subscribe: vi.fn((cb: () => void) => {
          _subscribers.add(cb);
          return () => _subscribers.delete(cb);
        }),
        clear: vi.fn(() => {
          _value = null;
          _subscribers.forEach((cb) => cb());
        }),
        _set: (v: typeof _value) => {
          _value = v;
          _subscribers.forEach((cb) => cb());
        },
      };
    })();
    promptManageAuthenticators = vi.fn().mockResolvedValue(undefined);
  }

  return { PopupController, IframeController, RedirectController };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildContext(
  controller: unknown,
  granterAddress: string | null = "xion1user",
) {
  // Build a minimal mock runtime that mirrors the new dispatch logic in
  // `runtime.manageAuthenticators` / `runtime.isManageAuthSupported`.
  const isSupported =
    controller instanceof PopupController ||
    controller instanceof IframeController ||
    controller instanceof RedirectController;
  const runtime = {
    isManageAuthSupported: isSupported,
    manageAuthUnsupportedReason: isSupported
      ? undefined
      : "Manage authenticators is not supported in signer mode. Use popup, redirect, or embedded authentication to add or remove authenticators.",
    manageAuthenticators: vi.fn(async (addr: string) => {
      if (controller instanceof PopupController) {
        return controller.promptManageAuthenticators(addr);
      }
      if (controller instanceof IframeController) {
        return controller.promptManageAuthenticators(addr);
      }
      if (controller instanceof RedirectController) {
        return controller.promptManageAuthenticators(addr);
      }
      throw new Error(
        "manageAuthenticators is not supported in the current authentication mode.",
      );
    }),
  };
  return {
    controller,
    runtime,
    granterAddress,
    // Other required context fields (unused by this hook)
    isConnected: !!granterAddress,
    isConnecting: false,
    isInitializing: false,
    isError: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
    granteeAddress: null,
    signingClient: null,
  } as unknown as React.ContextType<typeof AbstraxionContext>;
}

function wrapper(ctx: React.ContextType<typeof AbstraxionContext>) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(AbstraxionContext.Provider, { value: ctx }, children);
}

// Re-import after mocking so instanceof checks use the mocked classes
const { PopupController, IframeController, RedirectController } = await import(
  "@burnt-labs/abstraxion-js"
);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useManageAuthenticators", () => {
  describe("isSupported", () => {
    it("is true for PopupController", () => {
      const controller = new PopupController();
      const { result } = renderHook(() => useManageAuthenticators(), {
        wrapper: wrapper(buildContext(controller)),
      });
      expect(result.current.isSupported).toBe(true);
    });

    it("is true for IframeController", () => {
      const controller = new IframeController();
      const { result } = renderHook(() => useManageAuthenticators(), {
        wrapper: wrapper(buildContext(controller)),
      });
      expect(result.current.isSupported).toBe(true);
    });

    it("is true for RedirectController", () => {
      const controller = new RedirectController();
      const { result } = renderHook(() => useManageAuthenticators(), {
        wrapper: wrapper(buildContext(controller)),
      });
      expect(result.current.isSupported).toBe(true);
    });

    it("is false for an unsupported controller", () => {
      const controller = makeSignerController();
      const { result } = renderHook(() => useManageAuthenticators(), {
        wrapper: wrapper(buildContext(controller)),
      });
      expect(result.current.isSupported).toBe(false);
    });
  });

  describe("manageAuthenticators()", () => {
    it("calls PopupController.promptManageAuthenticators with the granter address", async () => {
      const controller = new PopupController();
      const { result } = renderHook(() => useManageAuthenticators(), {
        wrapper: wrapper(buildContext(controller, "xion1popup")),
      });
      await act(() => result.current.manageAuthenticators());
      expect(controller.promptManageAuthenticators).toHaveBeenCalledWith(
        "xion1popup",
      );
    });

    it("calls IframeController.promptManageAuthenticators with the granter address", async () => {
      const controller = new IframeController();
      const { result } = renderHook(() => useManageAuthenticators(), {
        wrapper: wrapper(buildContext(controller, "xion1iframe")),
      });
      await act(() => result.current.manageAuthenticators());
      expect(controller.promptManageAuthenticators).toHaveBeenCalledWith(
        "xion1iframe",
      );
    });

    it("calls RedirectController.promptManageAuthenticators with the granter address", async () => {
      const controller = new RedirectController();
      const { result } = renderHook(() => useManageAuthenticators(), {
        wrapper: wrapper(buildContext(controller, "xion1redirect")),
      });
      await act(() => result.current.manageAuthenticators());
      expect(controller.promptManageAuthenticators).toHaveBeenCalledWith(
        "xion1redirect",
      );
    });

    it("throws when the user is not connected (granterAddress is null)", async () => {
      const controller = new PopupController();
      const { result } = renderHook(() => useManageAuthenticators(), {
        wrapper: wrapper(buildContext(controller, null)),
      });
      await expect(result.current.manageAuthenticators()).rejects.toThrow(
        "not connected",
      );
    });

    it("throws when the controller doesn't support the feature", async () => {
      const controller = makeSignerController();
      const { result } = renderHook(() => useManageAuthenticators(), {
        wrapper: wrapper(buildContext(controller)),
      });
      await expect(result.current.manageAuthenticators()).rejects.toThrow(
        "not supported",
      );
    });
  });

  describe("manageAuthResult (redirect mode)", () => {
    it("is null by default for redirect mode", () => {
      const controller = new RedirectController();
      const { result } = renderHook(() => useManageAuthenticators(), {
        wrapper: wrapper(buildContext(controller)),
      });
      expect(result.current.manageAuthResult).toBeNull();
    });

    it("is null for popup mode (not applicable)", () => {
      const controller = new PopupController();
      const { result } = renderHook(() => useManageAuthenticators(), {
        wrapper: wrapper(buildContext(controller)),
      });
      expect(result.current.manageAuthResult).toBeNull();
    });

    it("clears manageAuthResult when clearManageAuthResult() is called", () => {
      const controller = new RedirectController();
      controller.manageAuthResult._set({ success: true });

      const { result } = renderHook(() => useManageAuthenticators(), {
        wrapper: wrapper(buildContext(controller)),
      });

      act(() => {
        result.current.clearManageAuthResult();
      });

      expect(controller.manageAuthResult.clear).toHaveBeenCalled();
    });

    it("clearManageAuthResult is a no-op for popup mode", () => {
      const controller = new PopupController();
      const { result } = renderHook(() => useManageAuthenticators(), {
        wrapper: wrapper(buildContext(controller)),
      });
      // Should not throw
      act(() => {
        result.current.clearManageAuthResult();
      });
    });
  });
});
