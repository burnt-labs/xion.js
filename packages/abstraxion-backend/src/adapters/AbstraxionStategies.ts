import {
  SignArbSecp256k1HdWallet,
  type RedirectStrategy,
  type StorageStrategy,
} from "@burnt-labs/abstraxion-core";
import type { IncomingMessage } from "node:http";
import { SessionKeyManager } from "../services";
import {
  InvalidStorageKeyError,
  SessionKeyInvalidError,
  SessionKeyNotFoundError,
} from "../types/errors";
import { SessionState } from "@/types";

export class DatabaseStorageStrategy implements StorageStrategy {
  constructor(
    private userId: string,
    private skManager: SessionKeyManager,
  ) {}

  /**
   * Get the item from the database
   * @param key - the key to get
   * @returns
   */
  async getItem(key: string): Promise<string | null> {
    /**
     * Current there are two key are in use:
     * 1. xion-authz-granter-account
     * 2. xion-authz-temp-account
     *
     * Granter account is stored in the database and temp account is stored in db by SessionKeyManager.
     */
    const uid = `${this.userId}`;
    if (
      key !== "xion-authz-granter-account" &&
      key !== "xion-authz-temp-account"
    ) {
      throw new InvalidStorageKeyError(`${key}@getItem`);
    }
    const sessionKeyInfo = await this.skManager.getLastSessionKeyInfo(uid);
    if (!sessionKeyInfo) {
      throw new SessionKeyNotFoundError(uid);
    }

    switch (key) {
      case "xion-authz-granter-account":
        return sessionKeyInfo.metaAccountAddress;
      case "xion-authz-temp-account":
        return sessionKeyInfo.sessionKeyAddress;
      default:
        throw new InvalidStorageKeyError(`${key}@getItem`);
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    switch (key) {
      case "xion-authz-temp-account":
        const keypair = await SignArbSecp256k1HdWallet.deserialize(
          value,
          "abstraxion",
        );
        const accounts = await keypair.getAccounts();
        await this.skManager.createPendingSessionKey(this.userId, {
          address: accounts[0].address,
          serializedKeypair: value,
        });
        break;
      case "xion-authz-granter-account":
        const lastSessionKeyInfo = await this.skManager.getLastSessionKeyInfo(
          this.userId,
        );
        if (
          lastSessionKeyInfo &&
          lastSessionKeyInfo.sessionState === SessionState.PENDING
        ) {
          await this.skManager.storeGrantedSessionKey(
            this.userId,
            lastSessionKeyInfo.sessionKeyAddress,
            value,
          );
        } else {
          throw new SessionKeyInvalidError(
            `Session key is not in PENDING state`,
          );
        }
        break;
      default:
        throw new InvalidStorageKeyError(`${key}@setItem`);
    }
  }

  async removeItem(key: string): Promise<void> {
    const uid = `${this.userId}`;
    switch (key) {
      case "xion-authz-temp-account":
      case "xion-authz-granter-account":
        await this.skManager.revokeActiveSessionKeys(uid);
        break;
      default:
        throw new InvalidStorageKeyError(`${key}@removeItem`);
    }
  }
}

export class DatabaseRedirectStrategy implements RedirectStrategy {
  constructor(
    private request: IncomingMessage,
    private onDirectMethod?: (url: string) => Promise<void>,
  ) {}

  async getCurrentUrl(): Promise<string> {
    const protocol = this.request.headers["x-forwarded-proto"] || "http";
    const host = this.request.headers.host || "localhost";
    return `${protocol}://${host}${this.request.url}`;
  }

  async redirect(url: string): Promise<void> {
    await this.onDirectMethod?.(url);
  }

  async getUrlParameter(param: string): Promise<string | null> {
    if (!this.request.url) return null;

    const url = this.getUrl();
    return url.searchParams.get(param);
  }

  async cleanUrlParameters(paramsToRemove: string[]): Promise<void> {
    if (!this.request.url) return;

    const url = this.getUrl();
    paramsToRemove.forEach((param) => url.searchParams.delete(param));

    await this.redirect(url.toString());
  }

  private getUrl(): URL {
    const protocol = this.request.headers["x-forwarded-proto"] || "http";
    return new URL(
      this.request.url || "/",
      `${protocol}://${this.request.headers.host}`,
    );
  }
}
