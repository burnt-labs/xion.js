/**
 * Shared utilities for dashboard redirect/popup URL handling.
 * Used by RedirectController and PopupController.
 */

import { fetchConfig } from "@burnt-labs/constants";

/**
 * Resolve the auth app URL from config or remote config endpoint.
 * Throws a clear error if neither is available.
 */
export async function resolveAuthAppUrl(
  rpcUrl: string,
  configuredUrl: string | undefined,
): Promise<string> {
  const url = configuredUrl || (await fetchConfig(rpcUrl)).dashboardUrl;
  if (!url) {
    throw new Error(
      "Could not determine auth app URL. Provide authAppUrl in your authentication config.",
    );
  }
  return url;
}

/**
 * Build a dashboard URL for a given mode.
 * Sets mode, granter, redirect_uri, and any extra params.
 */
export function buildDashboardUrl(
  authAppUrl: string,
  mode: string,
  granter: string,
  redirectUri: string,
  extraParams?: Record<string, string>,
): URL {
  const url = new URL(authAppUrl);
  url.searchParams.set("mode", mode);
  url.searchParams.set("granter", granter);
  url.searchParams.set("redirect_uri", redirectUri);
  for (const [k, v] of Object.entries(extraParams ?? {})) {
    url.searchParams.set(k, v);
  }
  return url;
}
