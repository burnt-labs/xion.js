/**
 * Iframe transport strategy contract.
 *
 * Abstracts the host-specific details of mounting the dashboard somewhere
 * users can see and interact with it (`<iframe>` on the web, `<WebView>` on
 * React Native, etc.) and routing request/response + push messages between
 * the SDK and the dashboard app running inside it.
 *
 * This is the third platform-injected strategy in `@burnt-labs/abstraxion-js`,
 * alongside `StorageStrategy` and `RedirectStrategy`. Embedded mode is the
 * only mode that needs it; popup, redirect, and signer modes do not.
 */

import type { IframeMessageType } from "@burnt-labs/abstraxion-core";

/**
 * Host-managed handle for a mounted iframe / WebView. Treated as opaque by
 * the controller — only the transport itself reads its internals.
 */
export interface IframeMountContext {
  /** Origin of the loaded URL, used as `targetOrigin` for postMessage. */
  origin: string;
  /** Initial src to load. */
  url: string;
}

/**
 * Strategy contract. All methods are sync except `sendRequest` and
 * `waitForReady`, which await dashboard cooperation.
 */
export interface IframeTransportStrategy {
  /** Bind a host-supplied container for subsequent `mount()` calls. */
  setContainer(container: unknown): void;
  /** True after `setContainer()` has been called with a non-null container. */
  hasContainer(): boolean;
  /** Mount the iframe/WebView at `url`. Idempotent — replaces src if already mounted. */
  mount(context: IframeMountContext): void;
  /** Update the loaded URL on an already-mounted iframe/WebView. */
  navigate(url: string): void;
  /** True if currently mounted. */
  isMounted(): boolean;
  /** Wait for the dashboard's IFRAME_READY handshake. Resolves once received. */
  waitForReady(timeoutMs: number): Promise<void>;
  /**
   * Send a request and resolve with the dashboard's response. Each call uses
   * an isolated channel (browser: `MessageChannel`; RN: requestId envelope).
   */
  sendRequest<TRequest, TResponse>(
    type: IframeMessageType,
    payload: TRequest,
    timeoutMs: number,
  ): Promise<TResponse>;
  /**
   * Subscribe to push events from the dashboard (HARD_DISCONNECT etc.).
   * Returns an unsubscribe function.
   */
  onPushMessage(listener: (data: unknown) => void): () => void;
  /** Show / hide the mounted iframe/WebView. No-op for hosts that delegate to a host component. */
  setVisible(visible: boolean): void;
  /** Remove the iframe/WebView and detach listeners. */
  unmount(): void;
}
