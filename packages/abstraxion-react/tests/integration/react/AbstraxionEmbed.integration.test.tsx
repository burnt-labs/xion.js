/**
 * AbstraxionEmbed integration tests
 *
 * Tests the drop-in <AbstraxionEmbed> component for embedded authentication.
 * Verifies that it:
 * - Renders a container div
 * - Attaches to the IframeController via setContainerElement
 * - Shows a login button by default (idleView="button")
 * - Calls login() when idleView="fullview"
 * - Does not auto-login when idleView="button" or "hidden"
 * - Forwards refs correctly
 * - Shows modal backdrop when isAwaitingApproval + approvalView="modal"
 */

import React, { createRef } from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, act, fireEvent } from "@testing-library/react";
import { AbstraxionContext } from "../../../src/AbstraxionProvider";
import { AbstraxionEmbed } from "../../../src/components/AbstraxionEmbed";
import { IframeController } from "@burnt-labs/abstraxion-js";

// Minimal mock for IframeController
function createMockIframeController() {
  const mock = {
    setContainerElement: vi.fn(),
    getState: vi.fn().mockReturnValue({ status: "idle" }),
    subscribe: vi.fn().mockReturnValue(() => {}),
    initialize: vi.fn().mockResolvedValue(undefined),
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn(),
    dispatch: vi.fn(),
    hasContainerElement: vi.fn().mockReturnValue(false),
    cancelApproval: vi.fn(),
    subscribeApproval: vi.fn().mockReturnValue(() => {}),
  };
  Object.setPrototypeOf(mock, IframeController.prototype);
  return mock;
}

// Create a proper context value for testing
function createContextValue(overrides: Record<string, unknown> = {}) {
  return {
    abstraxionAccount: undefined,
    rpcUrl: "https://rpc.xion-testnet-1.burnt.com",
    restUrl: "https://rest.xion-testnet-1.burnt.com",
    gasPrice: "0.001uxion",
    granterAddress: "",
    signingClient: undefined,
    connectionInfo: undefined,
    isConnected: false,
    isConnecting: false,
    isInitializing: false,
    isDisconnected: false,
    isAwaitingApproval: false,
    isReturningFromAuth: false,
    isLoggingIn: false,
    abstraxionError: "",
    authMode: "embedded" as const,
    controller: undefined,
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    chainId: "xion-testnet-1",
    ...overrides,
  };
}

describe("AbstraxionEmbed", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a div container", () => {
    const context = createContextValue();

    const { container } = render(
      <AbstraxionContext.Provider value={context as any}>
        <AbstraxionEmbed data-testid="embed" />
      </AbstraxionContext.Provider>,
    );

    const div = container.querySelector("div");
    expect(div).not.toBeNull();
  });

  it("calls setContainerElement on IframeController when mounted", () => {
    const mockController = createMockIframeController();

    const context = createContextValue({
      controller: mockController,
    });

    render(
      <AbstraxionContext.Provider value={context as any}>
        <AbstraxionEmbed />
      </AbstraxionContext.Provider>,
    );

    expect(mockController.setContainerElement).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
    );
  });

  it("shows a login button by default (idleView='button')", () => {
    const context = createContextValue();

    const { container } = render(
      <AbstraxionContext.Provider value={context as any}>
        <AbstraxionEmbed loginLabel="Test Login" />
      </AbstraxionContext.Provider>,
    );

    const button = container.querySelector("button");
    expect(button).not.toBeNull();
    expect(button!.textContent).toBe("Test Login");
  });

  it("calls login() when the button is clicked", async () => {
    const mockLogin = vi.fn().mockResolvedValue(undefined);
    const context = createContextValue({ login: mockLogin });

    const { container } = render(
      <AbstraxionContext.Provider value={context as any}>
        <AbstraxionEmbed />
      </AbstraxionContext.Provider>,
    );

    const button = container.querySelector("button")!;
    fireEvent.click(button);

    expect(mockLogin).toHaveBeenCalled();
  });

  it("calls login() automatically when idleView='fullview'", async () => {
    const mockLogin = vi.fn().mockResolvedValue(undefined);
    const mockController = createMockIframeController();

    const context = createContextValue({
      controller: mockController,
      login: mockLogin,
      isInitializing: false,
      isConnected: false,
      isConnecting: false,
    });

    render(
      <AbstraxionContext.Provider value={context as any}>
        <AbstraxionEmbed idleView="fullview" />
      </AbstraxionContext.Provider>,
    );

    await act(() => new Promise((r) => setTimeout(r, 0)));

    expect(mockLogin).toHaveBeenCalled();
  });

  it("does NOT call login() automatically with default idleView='button'", async () => {
    const mockLogin = vi.fn().mockResolvedValue(undefined);
    const mockController = createMockIframeController();

    const context = createContextValue({
      controller: mockController,
      login: mockLogin,
      isInitializing: false,
      isConnected: false,
      isConnecting: false,
    });

    render(
      <AbstraxionContext.Provider value={context as any}>
        <AbstraxionEmbed />
      </AbstraxionContext.Provider>,
    );

    await act(() => new Promise((r) => setTimeout(r, 0)));

    expect(mockLogin).not.toHaveBeenCalled();
  });

  it("does NOT call login() when already connected", async () => {
    const mockLogin = vi.fn().mockResolvedValue(undefined);
    const mockController = createMockIframeController();

    const context = createContextValue({
      controller: mockController,
      login: mockLogin,
      isConnected: true,
    });

    render(
      <AbstraxionContext.Provider value={context as any}>
        <AbstraxionEmbed idleView="fullview" />
      </AbstraxionContext.Provider>,
    );

    await act(() => new Promise((r) => setTimeout(r, 0)));

    expect(mockLogin).not.toHaveBeenCalled();
  });

  it("forwards ref to the container div", () => {
    const ref = createRef<HTMLDivElement>();
    const mockController = createMockIframeController();

    const context = createContextValue({
      controller: mockController,
    });

    render(
      <AbstraxionContext.Provider value={context as any}>
        <AbstraxionEmbed ref={ref} />
      </AbstraxionContext.Provider>,
    );

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("collapses iframe container when connected and connectedView='hidden'", () => {
    const mockController = createMockIframeController();

    const context = createContextValue({
      controller: mockController,
      isConnected: true,
    });

    const { container } = render(
      <AbstraxionContext.Provider value={context as any}>
        <AbstraxionEmbed
          connectedView="hidden"
          style={{ width: 420, height: 600 }}
        />
      </AbstraxionContext.Provider>,
    );

    // The iframe container is the inner div (wrapper > container)
    const divs = container.querySelectorAll("div");
    const iframeContainer = divs[divs.length - 1];
    expect(iframeContainer!.style.width).toBe("0px");
    expect(iframeContainer!.style.height).toBe("0px");
  });

  it("shows backdrop when isAwaitingApproval and approvalView='modal'", () => {
    const mockController = createMockIframeController();

    const context = createContextValue({
      controller: mockController,
      isConnected: true,
      isAwaitingApproval: true,
    });

    const { container } = render(
      <AbstraxionContext.Provider value={context as any}>
        <AbstraxionEmbed
          approvalView="modal"
          style={{ width: 420, height: 600 }}
        />
      </AbstraxionContext.Provider>,
    );

    // Should have a backdrop div with fixed positioning
    const divs = container.querySelectorAll("div");
    const backdrop = Array.from(divs).find(
      (d) => d.style.position === "fixed" && d.style.zIndex === "9998",
    );
    expect(backdrop).not.toBeUndefined();
  });

  it("calls cancelApproval when backdrop is clicked", () => {
    const mockController = createMockIframeController();

    const context = createContextValue({
      controller: mockController,
      isConnected: true,
      isAwaitingApproval: true,
    });

    const { container } = render(
      <AbstraxionContext.Provider value={context as any}>
        <AbstraxionEmbed approvalView="modal" />
      </AbstraxionContext.Provider>,
    );

    const divs = container.querySelectorAll("div");
    const backdrop = Array.from(divs).find(
      (d) => d.style.position === "fixed" && d.style.zIndex === "9998",
    );
    expect(backdrop).not.toBeUndefined();

    fireEvent.click(backdrop!);
    expect(mockController.cancelApproval).toHaveBeenCalled();
  });

  it("passes through HTML div props when visible", () => {
    const mockController = createMockIframeController();

    const context = createContextValue({
      controller: mockController,
      isConnecting: true, // connecting state = iframe visible
    });

    const { container } = render(
      <AbstraxionContext.Provider value={context as any}>
        <AbstraxionEmbed
          style={{ width: 420, height: 600 }}
          className="my-embed"
        />
      </AbstraxionContext.Provider>,
    );

    // The iframe container is the inner div (inside the wrapper div)
    const iframeContainer = container.querySelector("div.my-embed");
    expect(iframeContainer).not.toBeNull();
    expect(iframeContainer!.style.width).toBe("420px");
    expect(iframeContainer!.style.height).toBe("600px");
  });
});
