/**
 * React Native implementation of `IframeTransportStrategy`.
 *
 * Mounts the dashboard inside a `react-native-webview` `<WebView>` and bridges
 * SDK ↔ dashboard messages over `injectedJavaScript` + `onMessage`. The
 * dashboard's existing `MessageChannel`-based protocol is preserved by
 * synthesising a real `MessageChannel` *inside* the WebView's JS context (where
 * the API is available natively) and forwarding the response back to native
 * via `window.ReactNativeWebView.postMessage`.
 *
 * No dashboard-side protocol changes are required — the bridge is entirely
 * SDK-side. See Phase 9b notes in `.docs/tasks/abstraxion_package_restructure.md`.
 *
 * The host `<AbstraxionEmbed>` component renders the actual `<WebView>` and
 * calls `setContainer({ webViewRef, ... })` so the transport can drive it.
 */

import type {
  IframeMountContext,
  IframeTransportStrategy,
} from "@burnt-labs/abstraxion-js";
import { IframeMessageType } from "@burnt-labs/abstraxion-js";

/**
 * The host component (RN `<AbstraxionEmbed>`) supplies this control surface
 * so the transport can drive the WebView without importing react-native-webview
 * directly. This keeps the transport renderer-agnostic and avoids forcing a
 * webview dependency on consumers who never use embedded mode.
 */
export interface RNWebViewControl {
  /** Inject JavaScript into the live WebView. Returns when the eval is dispatched. */
  injectJavaScript(script: string): void;
  /** Replace the loaded URL — typically calls `setSource({ uri })` on the host. */
  loadUrl(url: string): void;
  /** Show / hide the WebView container. */
  setVisible(visible: boolean): void;
  /** Tear down the WebView. */
  unmount(): void;
}

/**
 * RPC envelope sent across the JS bridge.
 */
interface BridgeRequest {
  kind: "request";
  requestId: string;
  type: string;
  target: string;
  payload: unknown;
  origin: string;
}
interface BridgeResponse {
  kind: "response";
  requestId: string;
  data: unknown;
}
interface BridgePush {
  kind: "push";
  data: { type?: string; [key: string]: unknown };
}
interface BridgeReady {
  kind: "ready";
}
type BridgeMessage =
  | BridgeRequest
  | BridgeResponse
  | BridgePush
  | BridgeReady;

const BRIDGE_INSTALL_SCRIPT = `(function() {
  if (window.__abstraxionBridgeInstalled) return;
  window.__abstraxionBridgeInstalled = true;

  // Forward any postMessage the dashboard sends to its parent (IFRAME_READY,
  // HARD_DISCONNECT, etc.). We route through window.parent.postMessage —
  // overridden below — and via window.addEventListener("message") for safety.
  var rnPost = function(payload) {
    try {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    } catch (e) {
      // No-op: WebView torn down between dispatch and post.
    }
  };

  // Dashboard self-broadcasts IFRAME_READY / HARD_DISCONNECT to window.parent.
  // In RN there is no real parent, so we monkey-patch window.parent.postMessage
  // on the global scope so the existing dashboard code path works unchanged.
  try {
    Object.defineProperty(window, "parent", {
      configurable: true,
      get: function() {
        return {
          postMessage: function(data) {
            rnPost({ kind: "push", data: data });
          }
        };
      }
    });
  } catch (e) { /* fall back to message listener below */ }

  // Some dashboard code paths post on window itself instead of window.parent.
  window.addEventListener("message", function(e) {
    // Skip messages we just delivered to window via dispatchEvent below
    if (e && e.data && e.data.__abxFromNative) return;
    rnPost({ kind: "push", data: e.data });
  });

  // Bridge: react to native-injected requests by synthesising a MessageChannel
  // and dispatching the same MessageEvent shape the dashboard expects.
  window.__abstraxionBridgeDispatch = function(envelope) {
    try {
      var channel = new MessageChannel();
      channel.port1.onmessage = function(ev) {
        rnPost({
          kind: "response",
          requestId: envelope.requestId,
          data: ev.data
        });
      };
      // Dashboard's IframeMessageHandler picks up the port from event.ports[0].
      var msgEvent = new MessageEvent("message", {
        data: { type: envelope.type, target: envelope.target, payload: envelope.payload, requestId: envelope.requestId, __abxFromNative: true },
        origin: envelope.origin,
        ports: [channel.port2]
      });
      window.dispatchEvent(msgEvent);
    } catch (err) {
      rnPost({ kind: "response", requestId: envelope.requestId, data: { success: false, error: String(err && err.message || err) } });
    }
  };

  rnPost({ kind: "ready" });
})();
true;`;

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
  timeoutHandle: ReturnType<typeof setTimeout>;
}

/**
 * `IframeTransportStrategy` implementation backed by a host-supplied WebView.
 *
 * The actual `<WebView>` element is rendered by the RN `<AbstraxionEmbed>`
 * component; this strategy only drives it via the `RNWebViewControl` interface.
 */
export class RNWebViewIframeTransport implements IframeTransportStrategy {
  private control: RNWebViewControl | null = null;
  private mounted = false;
  private origin: string | null = null;
  private requestSeq = 0;
  private pending = new Map<string, PendingRequest>();
  private pushListeners = new Set<(data: unknown) => void>();
  private readyResolvers: Array<() => void> = [];
  private bridgeReady = false;

  setContainer(container: unknown): void {
    if (container === null) {
      this.control = null;
      return;
    }
    if (
      !container ||
      typeof (container as RNWebViewControl).injectJavaScript !== "function" ||
      typeof (container as RNWebViewControl).loadUrl !== "function"
    ) {
      throw new TypeError(
        "[RNWebViewIframeTransport] container must implement RNWebViewControl. " +
          "Use the <AbstraxionEmbed> component from @burnt-labs/abstraxion-react-native, " +
          "which constructs the control surface for you.",
      );
    }
    this.control = container as RNWebViewControl;
  }

  hasContainer(): boolean {
    return !!this.control;
  }

  isMounted(): boolean {
    return this.mounted;
  }

  mount(context: IframeMountContext): void {
    if (!this.control) {
      throw new Error(
        "RNWebViewIframeTransport: <AbstraxionEmbed> has not been mounted yet. " +
          "Render <AbstraxionEmbed /> before calling login() in embedded mode.",
      );
    }
    this.origin = context.origin;
    this.mounted = true;
    this.bridgeReady = false;
    this.control.loadUrl(context.url);
    // Inject the bridge once the WebView's load handler runs.
    this.control.injectJavaScript(BRIDGE_INSTALL_SCRIPT);
  }

  navigate(url: string): void {
    if (this.control) {
      this.bridgeReady = false;
      this.control.loadUrl(url);
      this.control.injectJavaScript(BRIDGE_INSTALL_SCRIPT);
    }
  }

  waitForReady(timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const idx = this.readyResolvers.indexOf(resolver);
        if (idx >= 0) this.readyResolvers.splice(idx, 1);
        reject(new Error(`WebView did not become ready within ${timeoutMs}ms`));
      }, timeoutMs);
      const resolver = () => {
        clearTimeout(timeout);
        resolve();
      };
      this.readyResolvers.push(resolver);
    });
  }

  sendRequest<TRequest, TResponse>(
    type: IframeMessageType,
    payload: TRequest,
    timeoutMs: number,
  ): Promise<TResponse> {
    if (!this.control || !this.mounted) {
      return Promise.reject(
        new Error(
          "RNWebViewIframeTransport: WebView is not mounted. Connect first before sending requests.",
        ),
      );
    }
    if (!this.origin) {
      return Promise.reject(
        new Error("RNWebViewIframeTransport: origin is not set."),
      );
    }

    const requestId = `rn_${++this.requestSeq}_${Date.now()}`;
    const envelope: BridgeRequest = {
      kind: "request",
      requestId,
      type: type as unknown as string,
      target: "XION_IFRAME",
      payload,
      origin: this.origin,
    };

    return new Promise<TResponse>((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`Request timeout: ${type}`));
      }, timeoutMs);

      this.pending.set(requestId, {
        resolve: (data) => {
          const response = data as
            | { success: true; data: TResponse }
            | { success: false; error: string };
          if (response && response.success) {
            resolve(response.data);
          } else {
            reject(
              new Error(
                (response && response.error) || `Request failed: ${type}`,
              ),
            );
          }
        },
        reject,
        timeoutHandle,
      });

      // JSON.stringify already escapes the few characters dangerous in a JS
      // expression context (control chars, line/paragraph separators). The
      // result is a valid JS object literal interpolated directly below.
      const json = JSON.stringify(envelope);
      this.control!.injectJavaScript(
        `window.__abstraxionBridgeDispatch && window.__abstraxionBridgeDispatch(${json}); true;`,
      );
    });
  }

  onPushMessage(listener: (data: unknown) => void): () => void {
    this.pushListeners.add(listener);
    return () => this.pushListeners.delete(listener);
  }

  setVisible(visible: boolean): void {
    this.control?.setVisible(visible);
  }

  unmount(): void {
    this.mounted = false;
    this.bridgeReady = false;
    this.origin = null;
    for (const [, request] of this.pending) {
      clearTimeout(request.timeoutHandle);
      request.reject(new Error("WebView unmounted"));
    }
    this.pending.clear();
    this.readyResolvers.length = 0;
    this.pushListeners.clear();
    this.control?.unmount();
  }

  /**
   * Called by the host `<AbstraxionEmbed>` component on every `onMessage`
   * event from the WebView. Routes responses to pending requests, and
   * dispatches push events to subscribers.
   */
  handleWebViewMessage(raw: string): void {
    let parsed: BridgeMessage;
    try {
      parsed = JSON.parse(raw) as BridgeMessage;
    } catch {
      return;
    }

    if (parsed.kind === "ready") {
      this.bridgeReady = true;
      // The bridge is ready; the dashboard's IFRAME_READY pushes will arrive
      // separately as `push` messages.
      return;
    }

    if (parsed.kind === "response") {
      const request = this.pending.get(parsed.requestId);
      if (!request) return;
      this.pending.delete(parsed.requestId);
      clearTimeout(request.timeoutHandle);
      request.resolve(parsed.data);
      return;
    }

    if (parsed.kind === "push") {
      const data = parsed.data;
      if (!data || typeof data.type !== "string") return;

      if (data.type === "IFRAME_READY") {
        const resolvers = this.readyResolvers.splice(0);
        resolvers.forEach((r) => r());
        return;
      }

      // Match BrowserIframeTransportStrategy: only surface push events the
      // controller actually handles. Anything else is bridge noise.
      if (data.type === "HARD_DISCONNECT" || data.type === "DISCONNECT") {
        this.pushListeners.forEach((listener) => listener(data));
      }
    }
  }

  /** True after the bridge install script has confirmed it is loaded. */
  get isBridgeReady(): boolean {
    return this.bridgeReady;
  }
}
