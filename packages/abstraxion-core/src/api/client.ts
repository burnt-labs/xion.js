/**
 * AA API client utilities
 * Low-level HTTP client functions for interacting with the Account Abstraction API
 */

import type { PrepareRequest, PrepareResponse, CreateAccountRequest, CreateAccountResponse } from './types';

/**
 * Call AA API /prepare endpoint
 * Gets the message to sign and salt for account creation
 */
export async function callPrepareEndpoint(
  aaApiUrl: string,
  request: PrepareRequest
): Promise<PrepareResponse> {
  const response = await fetch(`${aaApiUrl}/api/v1/wallet-accounts/prepare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `AA API /prepare failed with status ${response.status}`);
  }

  return await response.json();
}

/**
 * Call AA API /create endpoint
 * Creates the smart account on-chain
 */
export async function callCreateEndpoint(
  aaApiUrl: string,
  request: CreateAccountRequest
): Promise<CreateAccountResponse> {
  const response = await fetch(`${aaApiUrl}/api/v1/wallet-accounts/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `AA API /create failed with status ${response.status}`);
  }

  return await response.json();
}

