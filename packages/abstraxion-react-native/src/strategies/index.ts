import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { StorageStrategy, RedirectStrategy } from "@burnt-labs/abstraxion-core";

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
 * React Native implementation of the RedirectStrategy using Expo WebBrowser
 */
export class ReactNativeRedirectStrategy implements RedirectStrategy {
  private redirectCallback?: (params: { granter?: string | null }) => void;

  async getCurrentUrl(): Promise<string> {
    return Linking.createURL("");
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

      if (result.type === "success" && result.url && this.redirectCallback) {
        const { queryParams } = Linking.parse(result.url);
        this.redirectCallback({
          granter: queryParams?.granter?.toString() || null,
        });
      }
    } catch (error) {
      console.error("Error during authentication:", error);
      throw error;
    }
  }

  async onRedirectComplete(
    callback: (params: { granter?: string | null }) => void,
  ): Promise<void> {
    this.redirectCallback = callback;
  }

  async removeRedirectHandler(): Promise<void> {
    this.redirectCallback = undefined;
  }

  async getUrlParameter(param: string): Promise<string | null> {
    try {
      const url = await Linking.getInitialURL();
      if (!url) return null;
      const { queryParams } = Linking.parse(url);
      return queryParams?.[param]?.toString() || null;
    } catch (error) {
      console.error("Error getting URL parameter:", error);
      return null;
    }
  }
}
