import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MessageChannelManager } from "../MessageChannelManager";
import { IframeMessageType, MessageTarget } from "../../types/iframe";

// Mock port
function createMockPort() {
  return {
    onmessage: null as ((event: MessageEvent) => void) | null,
    onmessageerror: null as (() => void) | null,
    close: vi.fn(),
    postMessage: vi.fn(),
    start: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn().mockReturnValue(true),
  } as unknown as MessagePort;
}

describe("MessageChannelManager", () => {
  let manager: MessageChannelManager;
  let mockPort1: MessagePort;
  let mockPort2: MessagePort;
  let mockIframe: HTMLIFrameElement;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = new MessageChannelManager();

    mockPort1 = createMockPort();
    mockPort2 = createMockPort();

    vi.stubGlobal(
      "MessageChannel",
      vi.fn(() => ({
        port1: mockPort1,
        port2: mockPort2,
      })),
    );

    mockIframe = {
      contentWindow: {
        postMessage: vi.fn(),
      },
    } as unknown as HTMLIFrameElement;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("rejects on timeout when no response is received", async () => {
    const promise = manager.sendRequest(
      mockIframe,
      IframeMessageType.GET_ADDRESS,
      {},
      "https://example.com",
      100, // short timeout
    );

    vi.advanceTimersByTime(100);

    await expect(promise).rejects.toThrow(
      `Request timeout: ${IframeMessageType.GET_ADDRESS}`,
    );
    expect(mockPort1.close).toHaveBeenCalled();
  });

  it("rejects when iframe contentWindow is null", async () => {
    const nullIframe = {
      contentWindow: null,
    } as unknown as HTMLIFrameElement;

    const promise = manager.sendRequest(
      nullIframe,
      IframeMessageType.CONNECT,
      {},
      "https://example.com",
    );

    await expect(promise).rejects.toThrow("Iframe contentWindow not available");
    expect(mockPort1.close).toHaveBeenCalled();
  });

  it("resolves with response data on success", async () => {
    const responseData = { address: "xion1abc123" };

    const promise = manager.sendRequest(
      mockIframe,
      IframeMessageType.GET_ADDRESS,
      {},
      "https://example.com",
    );

    // Simulate the iframe responding via port1.onmessage
    const onmessage = mockPort1.onmessage as (event: MessageEvent) => void;
    onmessage({
      data: { success: true, data: responseData },
    } as MessageEvent);

    const result = await promise;
    expect(result).toEqual(responseData);
    expect(mockPort1.close).toHaveBeenCalled();
  });

  it("rejects on failure response", async () => {
    const promise = manager.sendRequest(
      mockIframe,
      IframeMessageType.SIGN_TRANSACTION,
      {},
      "https://example.com",
    );

    const onmessage = mockPort1.onmessage as (event: MessageEvent) => void;
    onmessage({
      data: { success: false, error: "User rejected" },
    } as MessageEvent);

    await expect(promise).rejects.toThrow("User rejected");
    expect(mockPort1.close).toHaveBeenCalled();
  });

  it("posts message to iframe contentWindow with correct structure", async () => {
    const payload = { grantParams: { treasuryAddress: "xion1treasury" } };

    manager.sendRequest(
      mockIframe,
      IframeMessageType.CONNECT,
      payload,
      "https://dashboard.example.com",
    );

    const postMessage = (mockIframe.contentWindow as Window).postMessage;
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: IframeMessageType.CONNECT,
        target: MessageTarget.XION_IFRAME,
        payload,
      }),
      "https://dashboard.example.com",
      [mockPort2],
    );
  });

  it("rejects with default message when failure has no error string", async () => {
    const promise = manager.sendRequest(
      mockIframe,
      IframeMessageType.DISCONNECT,
      {},
      "https://example.com",
    );

    const onmessage = mockPort1.onmessage as (event: MessageEvent) => void;
    onmessage({
      data: { success: false },
    } as MessageEvent);

    await expect(promise).rejects.toThrow(
      `Request failed: ${IframeMessageType.DISCONNECT}`,
    );
  });
});
