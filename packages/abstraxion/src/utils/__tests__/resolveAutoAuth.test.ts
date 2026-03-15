/**
 * Unit tests for resolveAutoAuth
 *
 * Validates that "auto" auth type resolves correctly based on device/viewport.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resolveAutoAuth, isMobileOrStandalone } from "../resolveAutoAuth";

describe("resolveAutoAuth", () => {
  const originalWindow = globalThis.window;
  const originalNavigator = globalThis.navigator;

  function mockEnvironment(overrides: {
    userAgent?: string;
    maxTouchPoints?: number;
    innerWidth?: number;
    innerHeight?: number;
    standalone?: boolean;
  }) {
    const ua = overrides.userAgent ?? "Mozilla/5.0 (X11; Linux x86_64)";
    const touchPoints = overrides.maxTouchPoints ?? 0;
    const width = overrides.innerWidth ?? 1440;
    const height = overrides.innerHeight ?? 900;

    Object.defineProperty(globalThis, "navigator", {
      value: {
        userAgent: ua,
        maxTouchPoints: touchPoints,
      },
      writable: true,
      configurable: true,
    });

    Object.defineProperty(globalThis, "window", {
      value: {
        innerWidth: width,
        innerHeight: height,
        matchMedia: vi.fn((query: string) => ({
          matches: overrides.standalone ?? false,
          media: query,
        })),
      },
      writable: true,
      configurable: true,
    });
  }

  afterEach(() => {
    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(globalThis, "navigator", {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  describe("isMobileOrStandalone", () => {
    it("returns false in SSR (no window)", () => {
      const win = globalThis.window;
      // @ts-expect-error - simulating SSR
      delete globalThis.window;
      expect(isMobileOrStandalone()).toBe(false);
      Object.defineProperty(globalThis, "window", {
        value: win,
        writable: true,
        configurable: true,
      });
    });

    it("returns true for iPhone user agent", () => {
      mockEnvironment({
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0)",
      });
      expect(isMobileOrStandalone()).toBe(true);
    });

    it("returns true for Android user agent", () => {
      mockEnvironment({ userAgent: "Mozilla/5.0 (Linux; Android 13)" });
      expect(isMobileOrStandalone()).toBe(true);
    });

    it("returns true for iPad user agent", () => {
      mockEnvironment({ userAgent: "Mozilla/5.0 (iPad; CPU OS 16_0)" });
      expect(isMobileOrStandalone()).toBe(true);
    });

    it("returns true for touch device with narrow viewport", () => {
      mockEnvironment({
        userAgent: "Mozilla/5.0 (X11; Linux x86_64)",
        maxTouchPoints: 5,
        innerWidth: 768,
        innerHeight: 1024,
      });
      expect(isMobileOrStandalone()).toBe(true);
    });

    it("returns true for touch device in portrait orientation", () => {
      mockEnvironment({
        maxTouchPoints: 5,
        innerWidth: 1100,
        innerHeight: 1400,
      });
      expect(isMobileOrStandalone()).toBe(true);
    });

    it("returns false for desktop (no touch, wide viewport)", () => {
      mockEnvironment({
        maxTouchPoints: 0,
        innerWidth: 1920,
        innerHeight: 1080,
      });
      expect(isMobileOrStandalone()).toBe(false);
    });

    it("returns true for PWA standalone mode", () => {
      mockEnvironment({ standalone: true });
      expect(isMobileOrStandalone()).toBe(true);
    });

    it("returns false for wide touch-enabled desktop (no portrait, no narrow)", () => {
      mockEnvironment({
        maxTouchPoints: 5,
        innerWidth: 1920,
        innerHeight: 1080,
      });
      expect(isMobileOrStandalone()).toBe(false);
    });
  });

  describe("resolveAutoAuth", () => {
    it("passes through non-auto types unchanged", () => {
      const redirect = { type: "redirect" as const };
      expect(resolveAutoAuth(redirect)).toBe(redirect);

      const popup = { type: "popup" as const };
      expect(resolveAutoAuth(popup)).toBe(popup);

      const signer = {
        type: "signer" as const,
        aaApiUrl: "https://api.example.com",
        getSignerConfig: vi.fn(),
        smartAccountContract: { codeId: 1, label: "test" },
      };
      expect(resolveAutoAuth(signer)).toBe(signer);
    });

    it("returns undefined for undefined input", () => {
      expect(resolveAutoAuth(undefined)).toBeUndefined();
    });

    it("resolves auto to popup on desktop", () => {
      mockEnvironment({ innerWidth: 1920, innerHeight: 1080 });

      const result = resolveAutoAuth({
        type: "auto",
        authAppUrl: "https://dashboard.burnt.com",
        callbackUrl: "https://myapp.com/callback",
      });

      expect(result).toEqual({
        type: "popup",
        authAppUrl: "https://dashboard.burnt.com",
      });
    });

    it("resolves auto to redirect on mobile", () => {
      mockEnvironment({
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0)",
      });

      const result = resolveAutoAuth({
        type: "auto",
        authAppUrl: "https://dashboard.burnt.com",
        callbackUrl: "https://myapp.com/callback",
      });

      expect(result).toEqual({
        type: "redirect",
        callbackUrl: "https://myapp.com/callback",
        authAppUrl: "https://dashboard.burnt.com",
      });
    });

    it("resolves auto to redirect in PWA standalone mode", () => {
      mockEnvironment({ standalone: true });

      const result = resolveAutoAuth({ type: "auto" });

      expect(result).toEqual({
        type: "redirect",
        callbackUrl: undefined,
        authAppUrl: undefined,
      });
    });
  });
});
