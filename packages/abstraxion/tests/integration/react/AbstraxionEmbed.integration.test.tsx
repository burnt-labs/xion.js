/**
 * AbstraxionEmbed integration tests
 *
 * Tests the drop-in <AbstraxionEmbed> component for embedded authentication.
 * Verifies that it:
 * - Renders a container div
 * - Attaches to the IframeController via setContainerElement
 * - Auto-connects when mounted (default)
 * - Respects autoConnect={false}
 * - Forwards refs correctly
 */

import React, { createRef } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { AbstraxionContext } from "../../../src/AbstraxionProvider";
import { AbstraxionEmbed } from "../../../src/components/AbstraxionEmbed";
import { IframeController } from "../../../src/controllers/IframeController";

// Minimal mock for IframeController
function createMockIframeController() {
  return {
    setContainerElement: vi.fn(),
    getState: vi.fn().mockReturnValue({ status: "idle" }),
    subscribe: vi.fn().mockReturnValue(() => {}),
    initialize: vi.fn().mockResolvedValue(undefined),
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn(),
    dispatch: vi.fn(),
    hasContainerElement: vi.fn().mockReturnValue(false),
    // Make it pass instanceof checks
    __proto__: IframeController.prototype,
  };
}

// Create a proper context value for testing
function createContextValue(overrides: Record<string, unknown> = {}) {
  return {
    abstraxionAccount: undefined,
    rpcUrl: "https://rpc.xion-testnet-1.burnt.com",
    restUrl: "https://rest.xion-testnet-1.burnt.com",
    gasPrice: "0.001uxion",
    granterAddress: undefined,
    signingClient: undefined,
    connectionInfo: undefined,
    isConnected: false,
    isConnecting: false,
    isInitializing: false,
    isReturningFromAuth: false,
    isError: false,
    error: undefined,
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

  it("calls setContainerElement on IframeController when mounted", async () => {
    const mockController = createMockIframeController();

    // Make it pass the instanceof check
    Object.setPrototypeOf(mockController, IframeController.prototype);

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

  it("calls login() automatically when autoConnect is true (default)", async () => {
    const mockLogin = vi.fn().mockResolvedValue(undefined);
    const mockController = createMockIframeController();
    Object.setPrototypeOf(mockController, IframeController.prototype);

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

    // Allow useEffect to fire
    await act(() => new Promise((r) => setTimeout(r, 0)));

    expect(mockLogin).toHaveBeenCalled();
  });

  it("does NOT call login() when autoConnect={false}", async () => {
    const mockLogin = vi.fn().mockResolvedValue(undefined);
    const mockController = createMockIframeController();
    Object.setPrototypeOf(mockController, IframeController.prototype);

    const context = createContextValue({
      controller: mockController,
      login: mockLogin,
      isInitializing: false,
      isConnected: false,
      isConnecting: false,
    });

    render(
      <AbstraxionContext.Provider value={context as any}>
        <AbstraxionEmbed autoConnect={false} />
      </AbstraxionContext.Provider>,
    );

    await act(() => new Promise((r) => setTimeout(r, 0)));

    expect(mockLogin).not.toHaveBeenCalled();
  });

  it("does NOT call login() when already connected", async () => {
    const mockLogin = vi.fn().mockResolvedValue(undefined);
    const mockController = createMockIframeController();
    Object.setPrototypeOf(mockController, IframeController.prototype);

    const context = createContextValue({
      controller: mockController,
      login: mockLogin,
      isInitializing: false,
      isConnected: true,
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

  it("does NOT call login() during initialization", async () => {
    const mockLogin = vi.fn().mockResolvedValue(undefined);
    const mockController = createMockIframeController();
    Object.setPrototypeOf(mockController, IframeController.prototype);

    const context = createContextValue({
      controller: mockController,
      login: mockLogin,
      isInitializing: true,
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

  it("forwards ref to the container div", () => {
    const ref = createRef<HTMLDivElement>();
    const mockController = createMockIframeController();
    Object.setPrototypeOf(mockController, IframeController.prototype);

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

  it("passes through HTML div props (style, className, etc.)", () => {
    const context = createContextValue();

    const { container } = render(
      <AbstraxionContext.Provider value={context as any}>
        <AbstraxionEmbed
          style={{ width: 420, height: 600 }}
          className="my-embed"
        />
      </AbstraxionContext.Provider>,
    );

    const div = container.querySelector("div");
    expect(div!.style.width).toBe("420px");
    expect(div!.style.height).toBe("600px");
    expect(div!.className).toContain("my-embed");
  });
});
