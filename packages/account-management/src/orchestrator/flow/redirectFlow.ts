/**
 * Redirect flow logic
 * Handles OAuth redirect flow using AbstraxionAuth methods
 */

import { fetchConfig } from "@burnt-labs/abstraxion-core";
import type { SessionManager, SessionRestorationResult } from "../types";

/**
 * Initiate redirect flow
 * Requires SessionManager with redirectToDashboard() method
 *
 * @param sessionManager - Session manager that supports redirect flow
 * @param rpcUrl - RPC URL for fetching dashboard URL from network config
 * @returns Dashboard URL for state dispatch
 */
export async function initiateRedirect(
  sessionManager: SessionManager,
  rpcUrl: string,
): Promise<{ dashboardUrl: string }> {
  // Check if sessionManager supports redirect
  if (!sessionManager.redirectToDashboard) {
    throw new Error("SessionManager does not support redirect flow");
  }

  // Generate keypair first
  await sessionManager.generateAndStoreTempAccount();

  // Use AbstraxionAuth's redirectToDashboard() which handles all URL building
  await sessionManager.redirectToDashboard();

  // Fetch dashboard URL from RPC based on network config
  const config = await fetchConfig(rpcUrl);
  return { dashboardUrl: config.dashboardUrl || "" };
}

/**
 * Complete redirect flow after callback
 * Requires SessionManager with completeLogin() and getSigner() methods
 */
export async function completeRedirect(
  sessionManager: SessionManager,
): Promise<SessionRestorationResult> {
  // Check if sessionManager supports redirect
  if (!sessionManager.completeLogin || !sessionManager.getSigner) {
    throw new Error("SessionManager does not support redirect flow");
  }

  // Use AbstraxionAuth's completeLogin() which handles grant polling and state
  // completeLogin() returns { keypair, granter } directly when completing so we dont have to grab them from localstorage
  const loginResult = await sessionManager.completeLogin();

  if (!loginResult) {
    throw new Error("Login redirected to dashboard instead of completing");
  }

  const { keypair, granter } = loginResult;

  // Get grantee address from keypair
  const accounts = await keypair.getAccounts();
  const granteeAddress = accounts[0].address;

  // Get signing client using AbstraxionAuth's getSigner()
  const signingClient = await sessionManager.getSigner();

  if (!signingClient) {
    throw new Error("Failed to get signing client after redirect");
  }

  return {
    restored: true,
    keypair,
    granterAddress: granter,
    granteeAddress,
    signingClient,
  };
}
