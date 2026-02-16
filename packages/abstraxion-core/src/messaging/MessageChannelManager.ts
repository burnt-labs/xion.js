import { IframeMessageType, MessageTarget } from "../types/iframe";
import type { MessageResponse } from "../types/iframe";

/**
 * Manages MessageChannel-based communication with the iframe
 * Uses the OKO pattern: each request gets its own isolated MessageChannel
 * for secure, type-safe communication
 */
export class MessageChannelManager {
  private requestIdCounter = 0;

  /**
   * Send a request to the iframe and wait for response
   * Creates a new MessageChannel for isolated, type-safe communication
   *
   * @param iframe - The iframe element to send the message to
   * @param type - The message type
   * @param payload - The message payload
   * @param targetOrigin - The specific origin of the iframe (for security)
   * @param timeout - Optional timeout in milliseconds (default: 30000)
   * @returns Promise that resolves with the response data
   */
  async sendRequest<TRequest, TResponse>(
    iframe: HTMLIFrameElement,
    type: IframeMessageType,
    payload: TRequest,
    targetOrigin: string,
    timeout: number = 30000,
  ): Promise<TResponse> {
    return new Promise((resolve, reject) => {
      // Create a new MessageChannel for this request
      const channel = new MessageChannel();
      const requestId = `req_${++this.requestIdCounter}_${Date.now()}`;

      // Set up timeout
      const timeoutId = setTimeout(() => {
        channel.port1.close();
        reject(new Error(`Request timeout: ${type}`));
      }, timeout);

      // Listen for response on port1
      channel.port1.onmessage = (
        event: MessageEvent<MessageResponse<TResponse>>,
      ) => {
        clearTimeout(timeoutId);
        channel.port1.close();

        const response = event.data;

        if (response.success) {
          resolve(response.data as TResponse);
        } else {
          reject(new Error(response.error || `Request failed: ${type}`));
        }
      };

      // Send message to iframe with port2
      if (!iframe.contentWindow) {
        clearTimeout(timeoutId);
        channel.port1.close();
        reject(new Error("Iframe contentWindow not available"));
        return;
      }

      iframe.contentWindow.postMessage(
        {
          type,
          target: MessageTarget.XION_IFRAME,
          payload,
          requestId,
        },
        targetOrigin, // Use specific origin instead of wildcard '*'
        [channel.port2], // Transfer port2 to iframe
      );
    });
  }
}
