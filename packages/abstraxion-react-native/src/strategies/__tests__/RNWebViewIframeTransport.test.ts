import { describe, expect, it, vi } from "vitest";
import { IframeMessageType } from "@burnt-labs/abstraxion-js";
import {
  RNWebViewIframeTransport,
  type RNWebViewControl,
} from "../RNWebViewIframeTransport";

describe("RNWebViewIframeTransport", () => {
  it("sends CONNECT with the dashboard's accepted xion_iframe target", async () => {
    const control = {
      injectJavaScript: vi.fn(),
      loadUrl: vi.fn(),
      setVisible: vi.fn(),
      unmount: vi.fn(),
    } satisfies RNWebViewControl;
    const transport = new RNWebViewIframeTransport();
    transport.setContainer(control);
    transport.mount({
      origin: "https://auth.testnet.burnt.com",
      url: "https://auth.testnet.burnt.com",
    });

    const response = transport.sendRequest(IframeMessageType.CONNECT, {}, 1000);
    const dispatchPrefix =
      "window.__abstraxionBridgeDispatch && window.__abstraxionBridgeDispatch(";
    const dispatchSuffix = "); true;";
    const dispatchScript = control.injectJavaScript.mock.calls
      .map(([script]) => script as string)
      .find((script) => script.startsWith(dispatchPrefix));
    expect(dispatchScript).toBeDefined();
    const envelope = JSON.parse(
      dispatchScript!.slice(
        dispatchPrefix.length,
        dispatchScript!.length - dispatchSuffix.length,
      ),
    );

    transport.handleWebViewMessage(
      JSON.stringify({
        kind: "response",
        requestId: envelope.requestId,
        data: { success: true, data: {} },
      }),
    );
    await expect(response).resolves.toEqual({});
    expect(envelope.target).toBe("xion_iframe");
  });
});
