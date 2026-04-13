// @vitest-environment jsdom
/**
 * useAddAuthenticators — unit tests
 *
 * Covers:
 * - isSupported for popup, iframe, redirect, and signer controllers
 * - addAuthenticators() delegates to the correct controller method
 * - addAuthenticators() throws when not connected (no granterAddress)
 * - addAuthenticators() throws when controller doesn't support the feature
 * - addAuthResult and clearAddAuthResult wiring for redirect mode
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { AbstraxionContext } from "../../AbstraxionProvider";
import { useAddAuthenticators } from "../useAddAuthenticators";

// ─── Minimal controller mocks ─────────────────────────────────────────────────

function makePopupController() {
  return {
    promptAddAuthenticators: vi.fn().mockResolvedValue(undefined),
  };
}

function makeIframeController() {
  return {
    promptAddAuthenticators: vi.fn().mockResolvedValue(undefined),
  };
}

function makeRedirectController(initialResult = null) {
  let result = initialResult;
  const subscribers = new Set<() => void>();
  return {
    promptAddAuthenticators: vi.fn().mockResolvedValue(undefined),
    getAddAuthResult: vi.fn(() => result),
    getAddAuthResultSnapshot: vi.fn(() => result),
    subscribeToAddAuthResult: vi.fn((cb: () => void) => {
      subscribers.add(cb);
      return () => subscribers.delete(cb);
    }),
    clearAddAuthResult: vi.fn(() => {
      result = null;
      subscribers.forEach((cb) => cb());
    }),
    _setResult: (r: typeof result) => {
      result = r;
      subscribers.forEach((cb) => cb());
    },
  };
}

function makeSignerController() {
  return {};
}

// ─── Mock the controller class checks ─────────────────────────────────────────
// Rather than mocking the modules, we use instanceof by making the mock objects
// extend the real controller classes. The simpler approach is to spy on
// instanceof checks — but that's not straightforward in JS.
// Instead we mock the module to return our fakes as the controller classes so
// that `instanceof` returns true for our mocks.

vi.mock("../../controllers/PopupController", () => {
  class PopupController {
    promptAddAuthenticators = vi.fn().mockResolvedValue(undefined);
  }
  return { PopupController };
});

vi.mock("../../controllers/IframeController", () => {
  class IframeController {
    promptAddAuthenticators = vi.fn().mockResolvedValue(undefined);
  }
  return { IframeController };
});

vi.mock("../../controllers/RedirectController", () => {
  class RedirectController {
    addAuthResult = (() => {
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
    promptAddAuthenticators = vi.fn().mockResolvedValue(undefined);
  }
  return { RedirectController };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildContext(
  controller: unknown,
  granterAddress: string | null = "xion1user",
) {
  return {
    controller,
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
const { PopupController } = await import("../../controllers/PopupController");
const { IframeController } = await import("../../controllers/IframeController");
const { RedirectController } =
  await import("../../controllers/RedirectController");

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useAddAuthenticators", () => {
  describe("isSupported", () => {
    it("is true for PopupController", () => {
      const controller = new PopupController();
      const { result } = renderHook(() => useAddAuthenticators(), {
        wrapper: wrapper(buildContext(controller)),
      });
      expect(result.current.isSupported).toBe(true);
    });

    it("is true for IframeController", () => {
      const controller = new IframeController();
      const { result } = renderHook(() => useAddAuthenticators(), {
        wrapper: wrapper(buildContext(controller)),
      });
      expect(result.current.isSupported).toBe(true);
    });

    it("is true for RedirectController", () => {
      const controller = new RedirectController();
      const { result } = renderHook(() => useAddAuthenticators(), {
        wrapper: wrapper(buildContext(controller)),
      });
      expect(result.current.isSupported).toBe(true);
    });

    it("is false for an unsupported controller", () => {
      const controller = makeSignerController();
      const { result } = renderHook(() => useAddAuthenticators(), {
        wrapper: wrapper(buildContext(controller)),
      });
      expect(result.current.isSupported).toBe(false);
    });
  });

  describe("addAuthenticators()", () => {
    it("calls PopupController.promptAddAuthenticators with the granter address", async () => {
      const controller = new PopupController();
      const { result } = renderHook(() => useAddAuthenticators(), {
        wrapper: wrapper(buildContext(controller, "xion1popup")),
      });
      await act(() => result.current.addAuthenticators());
      expect(controller.promptAddAuthenticators).toHaveBeenCalledWith(
        "xion1popup",
      );
    });

    it("calls IframeController.promptAddAuthenticators with the granter address", async () => {
      const controller = new IframeController();
      const { result } = renderHook(() => useAddAuthenticators(), {
        wrapper: wrapper(buildContext(controller, "xion1iframe")),
      });
      await act(() => result.current.addAuthenticators());
      expect(controller.promptAddAuthenticators).toHaveBeenCalledWith(
        "xion1iframe",
      );
    });

    it("calls RedirectController.promptAddAuthenticators with the granter address", async () => {
      const controller = new RedirectController();
      const { result } = renderHook(() => useAddAuthenticators(), {
        wrapper: wrapper(buildContext(controller, "xion1redirect")),
      });
      await act(() => result.current.addAuthenticators());
      expect(controller.promptAddAuthenticators).toHaveBeenCalledWith(
        "xion1redirect",
      );
    });

    it("throws when the user is not connected (granterAddress is null)", async () => {
      const controller = new PopupController();
      const { result } = renderHook(() => useAddAuthenticators(), {
        wrapper: wrapper(buildContext(controller, null)),
      });
      await expect(result.current.addAuthenticators()).rejects.toThrow(
        "not connected",
      );
    });

    it("throws when the controller doesn't support the feature", async () => {
      const controller = makeSignerController();
      const { result } = renderHook(() => useAddAuthenticators(), {
        wrapper: wrapper(buildContext(controller)),
      });
      await expect(result.current.addAuthenticators()).rejects.toThrow(
        "not supported",
      );
    });
  });

  describe("addAuthResult (redirect mode)", () => {
    it("is null by default for redirect mode", () => {
      const controller = new RedirectController();
      const { result } = renderHook(() => useAddAuthenticators(), {
        wrapper: wrapper(buildContext(controller)),
      });
      expect(result.current.addAuthResult).toBeNull();
    });

    it("is null for popup mode (not applicable)", () => {
      const controller = new PopupController();
      const { result } = renderHook(() => useAddAuthenticators(), {
        wrapper: wrapper(buildContext(controller)),
      });
      expect(result.current.addAuthResult).toBeNull();
    });

    it("clears addAuthResult when clearAddAuthResult() is called", () => {
      const controller = new RedirectController();
      controller.addAuthResult._set({ success: true });

      const { result } = renderHook(() => useAddAuthenticators(), {
        wrapper: wrapper(buildContext(controller)),
      });

      act(() => {
        result.current.clearAddAuthResult();
      });

      expect(controller.addAuthResult.clear).toHaveBeenCalled();
    });

    it("clearAddAuthResult is a no-op for popup mode", () => {
      const controller = new PopupController();
      const { result } = renderHook(() => useAddAuthenticators(), {
        wrapper: wrapper(buildContext(controller)),
      });
      // Should not throw
      act(() => {
        result.current.clearAddAuthResult();
      });
    });
  });
});
