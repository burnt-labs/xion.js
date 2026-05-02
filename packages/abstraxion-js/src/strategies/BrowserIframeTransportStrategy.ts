/**
 * Browser implementation of `IframeTransportStrategy`. Encapsulates `<iframe>`
 * DOM manipulation and the existing `MessageChannelManager` request/response
 * protocol used by the dashboard.
 */

import { MessageChannelManager } from "@burnt-labs/abstraxion-core";
import type { IframeMessageType } from "@burnt-labs/abstraxion-core";

import type {
  IframeMountContext,
  IframeTransportStrategy,
} from "./IframeTransportStrategy";

export class BrowserIframeTransportStrategy implements IframeTransportStrategy {
  private container: HTMLElement | null = null;
  private iframe: HTMLIFrameElement | null = null;
  private origin: string | null = null;
  private messageManager = new MessageChannelManager();
  private pushListeners = new Set<(data: unknown) => void>();
  private windowMessageHandler: ((event: MessageEvent) => void) | null = null;
  private readyResolvers: Array<() => void> = [];

  setContainer(container: unknown): void {
    if (container instanceof HTMLElement || container === null) {
      this.container = container;
    } else {
      throw new TypeError(
        "[BrowserIframeTransportStrategy] container must be an HTMLElement or null",
      );
    }
  }

  hasContainer(): boolean {
    return !!this.container;
  }

  isMounted(): boolean {
    return !!this.iframe;
  }

  mount({ url, origin }: IframeMountContext): void {
    if (!this.container) {
      throw new Error(
        "containerElement is required for iframe mode. " +
          "Provide a DOM element where the iframe should be mounted.",
      );
    }
    this.origin = origin;

    if (this.iframe) {
      this.iframe.src = url;
      return;
    }

    const iframe = document.createElement("iframe");
    iframe.src = url;
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.allow = `publickey-credentials-get ${origin}; clipboard-read; clipboard-write`;
    this.container.appendChild(iframe);
    this.iframe = iframe;

    this.attachWindowListener();
  }

  navigate(url: string): void {
    if (this.iframe) {
      this.iframe.src = url;
    }
  }

  waitForReady(timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const idx = this.readyResolvers.indexOf(resolve);
        if (idx >= 0) this.readyResolvers.splice(idx, 1);
        reject(
          new Error(`Iframe did not become ready within ${timeoutMs}ms`),
        );
      }, timeoutMs);

      this.readyResolvers.push(() => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }

  async sendRequest<TRequest, TResponse>(
    type: IframeMessageType,
    payload: TRequest,
    timeoutMs: number,
  ): Promise<TResponse> {
    if (!this.iframe?.contentWindow) {
      throw new Error(
        "Iframe is not available. Ensure the iframe is mounted and the user is connected.",
      );
    }
    if (!this.origin) {
      throw new Error(
        "Iframe origin is not set. Mount the iframe before sending requests.",
      );
    }
    return this.messageManager.sendRequest<TRequest, TResponse>(
      this.iframe,
      type,
      payload,
      this.origin,
      timeoutMs,
    );
  }

  onPushMessage(listener: (data: unknown) => void): () => void {
    this.pushListeners.add(listener);
    return () => this.pushListeners.delete(listener);
  }

  setVisible(_visible: boolean): void {
    // Browser: visibility is owned by `<AbstraxionEmbed>` which sizes the
    // container element, not by the transport itself.
  }

  unmount(): void {
    this.detachWindowListener();
    if (this.iframe?.parentNode) {
      this.iframe.parentNode.removeChild(this.iframe);
    }
    this.iframe = null;
    this.origin = null;
    this.readyResolvers.length = 0;
  }

  private attachWindowListener(): void {
    if (this.windowMessageHandler) return;

    const handler = (event: MessageEvent) => {
      if (!this.origin || event.origin !== this.origin) return;
      const data = event.data as { type?: string } | undefined;
      if (!data || typeof data.type !== "string") return;

      if (data.type === "IFRAME_READY") {
        const resolvers = this.readyResolvers.splice(0);
        resolvers.forEach((r) => r());
        return;
      }

      // Skip MessageChannel-routed responses (they carry a `requestId` we
      // don't observe here). Anything else is a "push" event from the dashboard.
      if (data.type === "HARD_DISCONNECT" || data.type === "DISCONNECT") {
        this.pushListeners.forEach((listener) => listener(data));
      }
    };

    this.windowMessageHandler = handler;
    window.addEventListener("message", handler);
  }

  private detachWindowListener(): void {
    if (this.windowMessageHandler) {
      window.removeEventListener("message", this.windowMessageHandler);
      this.windowMessageHandler = null;
    }
    this.pushListeners.clear();
  }
}
