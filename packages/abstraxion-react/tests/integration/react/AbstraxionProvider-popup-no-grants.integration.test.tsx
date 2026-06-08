/**
 * AbstraxionProvider Integration Tests — Popup Mode, No Grants
 *
 * Tests the popup authentication flow when no treasury/contracts/stake/bank
 * are configured (the "direct-signing" / requireAuth path).
 *
 * Scenario: A dApp uses popup auth but only needs the user's meta-account address.
 * The user signs all transactions directly from their meta-account (requireAuth).
 * No grant approval step should be shown; CONNECT_SUCCESS is sent immediately
 * after authentication.
 *
 * Integration scope: real AbstraxionAuth + ConnectionOrchestrator + PopupController
 * event listeners running through the real jsdom DOM event system.
 *
 * Mocked only at true test boundaries:
 *   - window.open: jsdom cannot open real popup windows
 *   - AbstraxionAuth.prototype.getSigner: avoids live RPC connection during completeConnection();
 *     the state-machine transition is what's under test, not signing client RPC connectivity
 *
 * Everything else is real: keypair generation (local crypto), session restoration,
 * event listener registration, postMessage handling, state machine transitions,
 * and dev-time warning emission.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { cleanup, render, waitFor, screen, act } from "@testing-library/react";
import React from "react";
import { AbstraxionProvider } from "../../../src/AbstraxionProvider";
import { useAbstraxionAccount } from "../../../src/hooks/useAbstraxionAccount";
import {
  AbstraxionAuth,
  DashboardMessageType,
} from "@burnt-labs/abstraxion-core";

// ─── No vi.mock() factory mocks — all packages run real implementations ────────

// ─── Base config ──────────────────────────────────────────────────────────────
//
// Explicit rpcUrl/restUrl/gasPrice avoids @burnt-labs/constants lookups.
// Explicit authAppUrl avoids the fetchConfig() network call in PopupController.connect().

const BASE_CONFIG = {
  chainId: "xion-testnet-1",
  rpcUrl: "https://rpc.xion-testnet-1.burnt.com",
  restUrl: "https://api.xion-testnet-1.burnt.com",
  gasPrice: "0.001uxion",
} as const;

// ─── Test component ───────────────────────────────────────────────────────────

function TestComponent() {
  const account = useAbstraxionAccount();
  return (
    <div>
      <div data-testid="status">
        {account.isInitializing
          ? "initializing"
          : account.isConnected
            ? "connected"
            : "disconnected"}
      </div>
      <div data-testid="address">{account.data.bech32Address}</div>
      <button data-testid="login" onClick={() => account.login()}>
        Login
      </button>
    </div>
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("AbstraxionProvider — Popup mode with no grants (direct-signing path)", () => {
  let mockPopup: { closed: boolean };
  let openSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    mockPopup = { closed: false };

    // Mock window.open — jsdom cannot open real popup windows
    openSpy = vi
      .spyOn(window, "open")
      .mockReturnValue(mockPopup as unknown as Window);

    Object.defineProperty(window, "location", {
      value: { origin: "https://myapp.com", href: "https://myapp.com" },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    openSpy?.mockRestore();
    cleanup();
    localStorage.clear();
  });

  it("popup URL has no grant params when no grants are configured", async () => {
    render(
      <AbstraxionProvider
        config={{
          ...BASE_CONFIG,
          // No treasury, contracts, stake, or bank — direct-signing path
          authentication: {
            type: "popup",
            authAppUrl: "https://dashboard.burnt.com",
          },
        }}
      >
        <TestComponent />
      </AbstraxionProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("disconnected");
    });

    await act(async () => {
      screen.getByTestId("login").click();
      await new Promise((r) => setTimeout(r, 50)); // flush async keypair generation
    });

    const openCall = (window.open as ReturnType<typeof vi.fn>).mock.calls[0];
    const popupUrl = new URL(openCall[0] as string);

    // Real keypair was generated — address starts with xion1 (secp256k1 bech32)
    expect(popupUrl.searchParams.get("grantee")).toMatch(/^xion1/);
    expect(popupUrl.searchParams.get("mode")).toBe("popup");

    // No grant params — the dApp did not configure any
    expect(popupUrl.searchParams.has("treasury")).toBe(false);
    expect(popupUrl.searchParams.has("contracts")).toBe(false);
    expect(popupUrl.searchParams.has("stake")).toBe(false);
    expect(popupUrl.searchParams.has("bank")).toBe(false);
  });

  it("transitions to connected when CONNECT_SUCCESS received with no grants configured", async () => {
    // Spy on getSigner to avoid live RPC — completeConnection() calls getSigner() to
    // create a GranteeSignerClient, which requires a live node. The state-machine
    // transition (CONNECT_SUCCESS → "connected") is what this test verifies.
    const getSignerSpy = vi
      .spyOn(AbstraxionAuth.prototype, "getSigner")
      .mockResolvedValue({ signAndBroadcast: vi.fn() } as never);

    render(
      <AbstraxionProvider
        config={{
          ...BASE_CONFIG,
          authentication: {
            type: "popup",
            authAppUrl: "https://dashboard.burnt.com",
          },
        }}
      >
        <TestComponent />
      </AbstraxionProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("disconnected");
    });

    await act(async () => {
      screen.getByTestId("login").click();
      await new Promise((r) => setTimeout(r, 50));
    });

    // Dispatch the real postMessage as the dashboard would send it.
    // The real PopupController message handler (registered via window.addEventListener)
    // receives and processes this event — no listener interception needed.
    await act(async () => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: DashboardMessageType.CONNECT_SUCCESS,
            address: "xion1granter789",
          },
          origin: "https://dashboard.burnt.com",
        }),
      );
      await new Promise((r) => setTimeout(r, 50));
    });

    await waitFor(
      () => {
        expect(screen.getByTestId("status").textContent).toBe("connected");
      },
      { timeout: 5000 },
    );

    getSignerSpy.mockRestore();
  });

  it("emits dev warning when no grants are configured in popup mode", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    render(
      <AbstraxionProvider
        config={{
          ...BASE_CONFIG,
          authentication: {
            type: "popup",
            authAppUrl: "https://dashboard.burnt.com",
          },
          // No treasury/contracts/stake/bank
        }}
      >
        <TestComponent />
      </AbstraxionProvider>,
    );

    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("[AbstraxionProvider] No grants configured"),
      );
    });

    warnSpy.mockRestore();
  });

  it("does NOT emit dev warning when treasury is configured", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    render(
      <AbstraxionProvider
        config={{
          ...BASE_CONFIG,
          treasury: "xion1treasury123", // Grants ARE configured
          authentication: {
            type: "popup",
            authAppUrl: "https://dashboard.burnt.com",
          },
        }}
      >
        <TestComponent />
      </AbstraxionProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).not.toBe("initializing");
    });

    const noGrantsWarnings = warnSpy.mock.calls.filter((args) =>
      String(args[0]).includes("No grants configured"),
    );
    expect(noGrantsWarnings).toHaveLength(0);

    warnSpy.mockRestore();
  });
});
