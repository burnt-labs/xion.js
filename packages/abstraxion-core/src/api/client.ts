/**
 * AA API v2 client utilities
 * Low-level HTTP client functions for interacting with the Account Abstraction API v2
 */

import type {
  AddressResponse,
  CheckResponse,
  CreateEthWalletRequest,
  CreateSecp256k1Request,
  CreateJWTRequest,
  CreateAccountResponse,
  AccountType,
} from './types';

/**
 * Get deterministic smart account address for an identifier
 * GET /api/v2/account/address/<type>/<identifier>
 */
export async function getAccountAddress(
  aaApiUrl: string,
  type: AccountType,
  identifier: string
): Promise<AddressResponse> {
  const encodedIdentifier = encodeURIComponent(identifier);
  const response = await fetch(`${aaApiUrl}/api/v2/account/address/${type}/${encodedIdentifier}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `AA API v2 /address/${type} failed with status ${response.status}`
    );
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
  type: AccountType,
  identifier: string
): Promise<CheckResponse> {
  const encodedIdentifier = encodeURIComponent(identifier);
  const response = await fetch(`${aaApiUrl}/api/v2/account/check/${type}/${encodedIdentifier}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (response.status === 404) {
    // Account doesn't exist - return null instead of throwing
    throw new Error('ACCOUNT_NOT_FOUND');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `AA API v2 /check/${type} failed with status ${response.status}`
    );
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
  const response = await fetch(`${aaApiUrl}/api/v2/accounts/create/ethwallet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `AA API v2 /create/ethwallet failed with status ${response.status}`
    );
  }

  return await response.json();
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
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `AA API v2 /create/secp256k1 failed with status ${response.status}`
    );
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
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `AA API v2 /create/jwt failed with status ${response.status}`
    );
  }

  return await response.json();
}

