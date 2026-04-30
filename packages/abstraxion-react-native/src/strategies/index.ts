import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import type {
  RedirectStrategy,
  StorageStrategy,
} from "@burnt-labs/abstraxion-js";

/**
 * React Native implementation of the StorageStrategy using AsyncStorage
 */
export class ReactNativeStorageStrategy implements StorageStrategy {
  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error("AsyncStorage getItem error:", error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error("AsyncStorage setItem error:", error);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error("AsyncStorage removeItem error:", error);
    }
  }
}

/**
 * React Native implementation of the RedirectStrategy using Expo WebBrowser.
 *
 * After a successful WebBrowser auth session, the result URL's query params
 * are stashed on the strategy so subsequent `getUrlParameter`/`cleanUrlParameters`
 * calls can read and clear them. This lets RedirectController's
 * `detectSignResult` / `detectManageAuthResult` flows work after
 * `redirect()` resolves, the same way they work after a browser page reload.
 */
export class ReactNativeRedirectStrategy implements RedirectStrategy {
  private redirectCallback?: (params: { granter?: string | null }) => void;
  private resultParams: Record<string, string> | null = null;

  getCurrentUrl(): Promise<string> {
    return Promise.resolve(Linking.createURL(""));
  }

  async redirect(url: string): Promise<void> {
    try {
      const result = await WebBrowser.openAuthSessionAsync(
        url,
        Linking.createURL(""),
      );

      if (result.type === "cancel" || result.type === "dismiss") {
        throw new Error("Authentication session was cancelled");
      }

      if (result.type === "success" && result.url) {
        const { queryParams } = Linking.parse(result.url);
        const flatParams: Record<string, string> = {};
        if (queryParams) {
          for (const [key, value] of Object.entries(queryParams)) {
            if (value !== undefined && value !== null) {
              flatParams[key] = value.toString();
            }
          }
        }
        // Stash for getUrlParameter/cleanUrlParameters reads after this resolves.
        this.resultParams = flatParams;

        // Preserve the original login callback contract: AbstraxionAuth subscribes
        // via onRedirectComplete and only acts on `granter`.
        if (this.redirectCallback) {
          this.redirectCallback({
            granter: flatParams.granter ?? null,
          });
        }
      }
    } catch (error) {
      console.warn("Something went wrong during redirect:", error);
      throw error;
    }
  }

  onRedirectComplete(
    callback: (params: { granter?: string | null }) => void,
  ): Promise<void> {
    this.redirectCallback = callback;
    return Promise.resolve();
  }

  removeRedirectHandler(): Promise<void> {
    this.redirectCallback = undefined;
    return Promise.resolve();
  }

  async getUrlParameter(param: string): Promise<string | null> {
    if (this.resultParams && param in this.resultParams) {
      return this.resultParams[param] ?? null;
    }
    try {
      const url = await Linking.getInitialURL();
      if (!url) return null;
      const { queryParams } = Linking.parse(url);
      return queryParams?.[param]?.toString() ?? null;
    } catch (error) {
      console.error("Error getting URL parameter:", error);
      return null;
    }
  }

  cleanUrlParameters(paramsToRemove: string[]): Promise<void> {
    if (!this.resultParams) return Promise.resolve();
    const next: Record<string, string> = {};
    const removeSet = new Set(paramsToRemove);
    for (const [key, value] of Object.entries(this.resultParams)) {
      if (!removeSet.has(key)) {
        next[key] = value;
      }
    }
    // Drop the stash entirely once empty so a later cold-start deep link can
    // still be read via Linking.getInitialURL().
    this.resultParams = Object.keys(next).length === 0 ? null : next;
    return Promise.resolve();
  }
}
