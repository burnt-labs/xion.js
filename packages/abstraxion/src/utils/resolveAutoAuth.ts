/**
 * Auto-authentication resolution utility
 *
 * Detects mobile/PWA environments and resolves "auto" authentication
 * to either "popup" (desktop) or "redirect" (mobile/PWA).
 */

import type { AuthenticationConfig } from "../types";

/**
 * Returns true when running on a mobile browser or in PWA standalone mode.
 *
 * Detection covers:
 * - Mobile user-agent strings (Android, iPhone, iPad, iPod)
 * - Touch devices with narrow viewports (tablets in portrait, etc.)
 * - PWA standalone mode (installed web apps)
 * - SSR: returns false (safe default — controllers are only created client-side)
 */
export function isMobileOrStandalone(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  const hasMobileUA = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const isTouchDevice = navigator.maxTouchPoints > 0;
  const isNarrow = window.innerWidth < 1024;
  const isPortraitRatio = window.innerHeight > window.innerWidth;

  const isMobile =
    hasMobileUA || (isTouchDevice && (isNarrow || isPortraitRatio));

  const isStandalone = window.matchMedia(
    "(display-mode: standalone)",
  ).matches;

  return isMobile || isStandalone;
}

/**
 * Resolve "auto" authentication to a concrete mode.
 *
 * - Desktop → { type: "popup" }
 * - Mobile / PWA → { type: "redirect" }
 * - All other types pass through unchanged.
 */
export function resolveAutoAuth(
  auth: AuthenticationConfig | undefined,
): AuthenticationConfig | undefined {
  if (auth?.type !== "auto") return auth;

  if (isMobileOrStandalone()) {
    return {
      type: "redirect",
      callbackUrl: auth.callbackUrl,
      authAppUrl: auth.authAppUrl,
    };
  }

  return {
    type: "popup",
    authAppUrl: auth.authAppUrl,
  };
}
