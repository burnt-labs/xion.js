import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReactNativeRedirectStrategy } from "../index";

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

vi.mock("expo-linking", () => ({
  createURL: vi.fn(() => "xion-demo://"),
  getInitialURL: vi.fn(),
  parse: vi.fn(() => ({
    queryParams: {
      granter: "xion1granter",
    },
  })),
}));

vi.mock("expo-web-browser", () => ({
  openAuthSessionAsync: vi.fn(),
}));

import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

describe("ReactNativeRedirectStrategy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens an auth session and forwards the granter callback", async () => {
    vi.mocked(WebBrowser.openAuthSessionAsync).mockResolvedValueOnce({
      type: "success",
      url: "xion-demo://?granter=xion1granter",
    } as never);

    const callback = vi.fn();
    const strategy = new ReactNativeRedirectStrategy();
    await strategy.onRedirectComplete(callback);
    await strategy.redirect("https://dashboard.burnt.com?grantee=xion1");

    expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalledWith(
      "https://dashboard.burnt.com?grantee=xion1",
      "xion-demo://",
    );
    expect(Linking.parse).toHaveBeenCalledWith(
      "xion-demo://?granter=xion1granter",
    );
    expect(callback).toHaveBeenCalledWith({ granter: "xion1granter" });
  });

  it("rejects when the auth session is cancelled", async () => {
    vi.mocked(WebBrowser.openAuthSessionAsync).mockResolvedValueOnce({
      type: "cancel",
    } as never);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {
      return undefined;
    });

    const strategy = new ReactNativeRedirectStrategy();

    try {
      await expect(
        strategy.redirect("https://dashboard.burnt.com"),
      ).rejects.toThrow("cancelled");
      expect(warnSpy).toHaveBeenCalledWith(
        "Something went wrong during redirect:",
        expect.any(Error),
      );
    } finally {
      warnSpy.mockRestore();
    }
  });
});
