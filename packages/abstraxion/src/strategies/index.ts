import type {
  RedirectStrategy,
  StorageStrategy,
} from "@burnt-labs/abstraxion-core";

export class BrowserStorageStrategy implements StorageStrategy {
  async getItem(key: string): Promise<string | null> {
    return Promise.resolve(localStorage.getItem(key));
  }

  async setItem(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value);
    return Promise.resolve();
  }

  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(key);
    return Promise.resolve();
  }
}

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
}
