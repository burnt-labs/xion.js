/**
 * Redirect flow logic
 * Handles OAuth redirect flow using AbstraxionAuth methods
 */

import { fetchConfig } from '@burnt-labs/abstraxion-core';
import type { SessionManager, SessionRestorationResult } from '../types';

/**
 * Initiate redirect flow
 * Requires SessionManager with redirectToDashboard() method
 * 
 * @param sessionManager - Session manager that supports redirect flow
 * @param rpcUrl - RPC URL for fetching config (used as fallback if dashboardUrl not provided)
 * @param dashboardUrl - Optional dashboard URL (if not provided, will be fetched from RPC)
 * @returns Dashboard URL for state dispatch
 */
export async function initiateRedirect(
  sessionManager: SessionManager,
  rpcUrl: string,
  dashboardUrl?: string,
): Promise<{ dashboardUrl: string }> {
  // Check if sessionManager supports redirect
  if (!sessionManager.redirectToDashboard) {
    throw new Error('SessionManager does not support redirect flow');
  }
  
  // Generate keypair first
  await sessionManager.generateAndStoreTempAccount();
  
  // Use AbstraxionAuth's redirectToDashboard() which handles all URL building
  await sessionManager.redirectToDashboard();
  
  // Return configured dashboard URL if provided, otherwise fetch from RPC as fallback
  if (dashboardUrl) {
    return { dashboardUrl };
  }
  
  const config = await fetchConfig(rpcUrl);
  return { dashboardUrl: config.dashboardUrl || '' };
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
    throw new Error('SessionManager does not support redirect flow');
  }
  
  // Use AbstraxionAuth's completeLogin() which handles grant polling and state
  // completeLogin() returns { keypair, granter } directly when completing so we dont have to grab them from localstorage
  const loginResult = await sessionManager.completeLogin();
  
  if (!loginResult) {
    throw new Error('Login redirected to dashboard instead of completing');
  }
  
  const { keypair, granter } = loginResult;
  
  // Get signing client using AbstraxionAuth's getSigner()
  const signingClient = await sessionManager.getSigner();
  
  if (!signingClient) {
    throw new Error('Failed to get signing client after redirect');
  }
  
  return {
    restored: true,
    keypair,
    granterAddress: granter,
    signingClient,
  };
}

