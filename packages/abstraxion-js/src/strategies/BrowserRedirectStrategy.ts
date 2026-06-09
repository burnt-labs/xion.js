import type { RedirectStrategy } from "@burnt-labs/abstraxion-core";

/**
 * Browser implementation of `RedirectStrategy` backed by `window.location`
 * and `URLSearchParams`.
 */
export class BrowserRedirectStrategy implements RedirectStrategy {
  async getCurrentUrl(): Promise<string> {
    return Promise.resolve(window.location.href);
  }

  async redirect(url: string): Promise<void> {
    window.location.href = url;
    return Promise.resolve();
  }

  async getUrlParameter(param: string): Promise<string | null> {
    if (typeof window === "undefined") return Promise.resolve(null);
    const searchParams = new URLSearchParams(window.location.search);
    return Promise.resolve(searchParams.get(param));
  }

  async cleanUrlParameters(paramsToRemove: string[]): Promise<void> {
    if (typeof window === "undefined") return Promise.resolve();

    const currentUrl = new URL(window.location.href);
    paramsToRemove.forEach((param) => {
      currentUrl.searchParams.delete(param);
    });
    // replaceState (not pushState) so cleaning detection params doesn't add a
    // history entry the user could navigate back to.
    window.history.replaceState({}, "", currentUrl.href);
    return Promise.resolve();
  }
}
