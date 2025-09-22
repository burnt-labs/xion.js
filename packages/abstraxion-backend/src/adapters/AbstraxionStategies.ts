import type {
  RedirectStrategy,
  StorageStrategy,
} from "@burnt-labs/abstraxion-core";
import { DatabaseAdapter } from "../types";
import type { IncomingMessage, ServerResponse } from "node:http";

export class DatabaseStorageStrategy implements StorageStrategy {
  constructor(
    private userId: string,
    private granter: string,
    private db: DatabaseAdapter,
  ) {}

  async getItem(key: string): Promise<string | null> {
    const uid = `${this.userId}-${this.granter}`;
    return this.db.getKVPair(uid, key);
  }

  async setItem(key: string, value: string): Promise<void> {
    const uid = `${this.userId}-${this.granter}`;
    this.db.storeKVPair(uid, key, value);
  }

  async removeItem(key: string): Promise<void> {
    const uid = `${this.userId}-${this.granter}`;
    this.db.removeKVPair(uid, key);
  }
}

export class DatabaseRedirectStrategy implements RedirectStrategy {
  constructor(
    private request: IncomingMessage,
    private response: ServerResponse,
  ) {}

  async getCurrentUrl(): Promise<string> {
    const protocol = this.request.headers["x-forwarded-proto"] || "http";
    const host = this.request.headers.host || "localhost";
    return `${protocol}://${host}${this.request.url}`;
  }

  async redirect(url: string): Promise<void> {
    this.response.writeHead(302, { Location: url });
    this.response.end();
  }

  async getUrlParameter(param: string): Promise<string | null> {
    if (!this.request.url) return null;

    const protocol = this.request.headers["x-forwarded-proto"] || "http";
    const url = new URL(
      this.request.url,
      `${protocol}://${this.request.headers.host}`,
    );
    return url.searchParams.get(param);
  }

  async cleanUrlParameters(paramsToRemove: string[]): Promise<void> {
    if (!this.request.url) return;

    const protocol = this.request.headers["x-forwarded-proto"] || "http";
    const url = new URL(
      this.request.url,
      `${protocol}://${this.request.headers.host}`,
    );
    paramsToRemove.forEach((param) => url.searchParams.delete(param));

    await this.redirect(url.toString());
  }
}
