import type { RedirectStrategy, StorageStrategy } from "@/types/strategyTypes";

export class MockStorageStrategy implements StorageStrategy {
  private storage: Map<string, string> = new Map();

  async getItem(key: string): Promise<string | null> {
    return this.storage.get(key) || null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.storage.delete(key);
  }

  clear(): void {
    this.storage.clear();
  }
}

export class MockRedirectStrategy implements RedirectStrategy {
  private currentUrl: string = "https://test.com";
  private urlParams: Map<string, string> = new Map();
  private redirectCallback?: (params: { granter?: string | null }) => void;

  async getCurrentUrl(): Promise<string> {
    return this.currentUrl;
  }

  async redirect(url: string): Promise<void> {
    this.currentUrl = url;
  }

  async getUrlParameter(param: string): Promise<string | null> {
    return this.urlParams.get(param) || null;
  }

  async onRedirectComplete(
    callback: (params: { granter?: string | null }) => void,
  ): Promise<void> {
    this.redirectCallback = callback;
  }

  async removeRedirectHandler(): Promise<void> {
    this.redirectCallback = undefined;
  }

  // Helper methods for testing
  setUrlParameter(param: string, value: string): void {
    this.urlParams.set(param, value);
  }

  triggerRedirectCallback(granter?: string): void {
    if (this.redirectCallback) {
      this.redirectCallback({ granter });
    }
  }

  reset(): void {
    this.currentUrl = "https://test.com";
    this.urlParams.clear();
    this.redirectCallback = undefined;
  }
}
