/**
 * AA API v2 client utilities
 * Low-level HTTP client functions for interacting with the Account Abstraction API v2
 */

import type { AuthenticatorType } from "@burnt-labs/signers";
import type {
  AddressResponse,
  CheckResponse,
  CreateEthWalletRequest,
  CreateSecp256k1Request,
  CreateJWTRequest,
  CreateAccountResponse,
} from './types';

/**
 * Parse error response from AA API
 * Attempts to extract error message from response, falls back to default message
 */
async function parseApiError(response: Response, defaultMessage: string): Promise<string> {
  interface ErrorResponse {
    error?: { message?: string };
    message?: string;
  }
  
  let errorData: ErrorResponse = {};
  try {
    const responseText = await response.text();
    errorData = JSON.parse(responseText) as ErrorResponse;
  } catch (e) {
    // Failed to parse error response - use default message
  }
  
  return errorData.error?.message || errorData.message || defaultMessage;
}

/**
 * Get deterministic smart account address for an identifier
 * GET /api/v2/account/address/<type>/<identifier>
 */
export async function getAccountAddress(
  aaApiUrl: string,
  authenticatorType: AuthenticatorType,
  identifier: string
): Promise<AddressResponse> {
  const encodedIdentifier = encodeURIComponent(identifier);
  const response = await fetch(`${aaApiUrl}/api/v2/account/address/${authenticatorType.toLowerCase()}/${encodedIdentifier}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const errorMessage = await parseApiError(
      response,
      `AA API v2 /address/${authenticatorType.toLowerCase()} failed with status ${response.status}`
    );
    throw new Error(errorMessage);
  }

  return await response.json();
}

/**
 * Check if account exists on-chain
 * GET /api/v2/account/check/<type>/<identifier>
 * Returns account info if exists, throws 404 if not found
 */
export async function checkAccountOnChain(
  aaApiUrl: string,
  authenticatorType: AuthenticatorType,
  identifier: string
): Promise<CheckResponse> {
  const encodedIdentifier = encodeURIComponent(identifier);
  const response = await fetch(`${aaApiUrl}/api/v2/account/check/${authenticatorType.toLowerCase()}/${encodedIdentifier}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (response.status === 404) {
    // Account doesn't exist - return null instead of throwing
    throw new Error('ACCOUNT_NOT_FOUND');
  }

  if (!response.ok) {
    const errorMessage = await parseApiError(
      response,
      `AA API v2 /check/${authenticatorType.toLowerCase()} failed with status ${response.status}`
    );
    throw new Error(errorMessage);
  }

  return await response.json();
}

/**
 * Create account via AA API v2 for EthWallet
 * POST /api/v2/accounts/create/ethwallet
 */
export async function createEthWalletAccountV2(
  aaApiUrl: string,
  request: CreateEthWalletRequest
): Promise<CreateAccountResponse> {
  const url = `${aaApiUrl}/api/v2/accounts/create/ethwallet`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorMessage = await parseApiError(
      response,
      `AA API v2 /create/ethwallet failed with status ${response.status}`
    );
    throw new Error(errorMessage);
  }

  const responseData = await response.json();
  return responseData;
}

/**
 * Create account via AA API v2 for Secp256k1
 * POST /api/v2/accounts/create/secp256k1
 */
export async function createSecp256k1AccountV2(
  aaApiUrl: string,
  request: CreateSecp256k1Request
): Promise<CreateAccountResponse> {
  const response = await fetch(`${aaApiUrl}/api/v2/accounts/create/secp256k1`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorMessage = await parseApiError(
      response,
      `AA API v2 /create/secp256k1 failed with status ${response.status}`
    );
    throw new Error(errorMessage);
  }

  return await response.json();
}

/**
 * Create account via AA API v2 for JWT
 * POST /api/v2/accounts/create/jwt
 */
export async function createJWTAccountV2(
  aaApiUrl: string,
  request: CreateJWTRequest
): Promise<CreateAccountResponse> {
  const response = await fetch(`${aaApiUrl}/api/v2/accounts/create/jwt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorMessage = await parseApiError(
      response,
      `AA API v2 /create/jwt failed with status ${response.status}`
    );
    throw new Error(errorMessage);
  }

  return await response.json();
}

