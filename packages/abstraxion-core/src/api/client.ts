/**
 * AA API v2 client utilities
 * Low-level HTTP client functions for interacting with the Account Abstraction API v2
 */

import type {
  AuthenticatorType,
  AddressResponse,
  CheckResponse,
  CreateEthWalletRequest,
  CreateSecp256k1Request,
  CreateJWTRequest,
  CreateAccountResponse,
  ErrorResponse,
} from "@burnt-labs/signers";

/**
 * Fetches from the AA API with automatic retry on gateway timeouts
 * Retries on 502/504 errors which can occur when account creation takes longer than gateway timeout
 *
 * This is specifically designed for AA API account creation endpoints that may timeout
 * at the gateway level while the blockchain transaction still completes successfully.
 *
 * @param url - The AA API endpoint URL
 * @param options - Fetch options (method, headers, body, etc.)
 * @param maxRetries - Maximum number of retry attempts (default: 2)
 * @param retryDelay - Delay in milliseconds between retries (default: 2000ms)
 * @returns Response object
 */
export async function fetchAAApiWithGatewayRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 2,
  retryDelay: number = 2000,
): Promise<Response> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Retry on gateway timeouts (502/504)
      if (
        !response.ok &&
        (response.status === 502 || response.status === 504) &&
        attempt < maxRetries
      ) {
        console.warn(
          `[AA-API] Gateway timeout (${response.status}), retrying (attempt ${attempt}/${maxRetries})...`,
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        continue;
      }

      // Return response (caller will check response.ok)
      return response;
    } catch (error: any) {
      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }

      // Network error, retry
      console.warn(
        `[AA-API] Network error, retrying (attempt ${attempt}/${maxRetries})...`,
        error?.message || error,
      );
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  // This should never be reached, but TypeScript needs it
  throw new Error("Failed to fetch after all retries");
}

/**
 * Type guard for ErrorResponse from AA API
 * Checks if response matches the ErrorResponse schema from  generated types
 */
function isErrorResponse(value: unknown): value is ErrorResponse {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  // Check if it matches ErrorResponse schema: { error: { message: string } }
  if (obj.error && typeof obj.error === "object") {
    const error = obj.error as Record<string, unknown>;
    return typeof error.message === "string";
  }

  return false;
}

/**
 * Extended type for error responses that may have legacy format
 * Some older error responses may have message at root level
 */
type LegacyErrorResponse = {
  message: string;
};

function isLegacyErrorResponse(value: unknown): value is LegacyErrorResponse {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.message === "string";
}

async function parseApiError(
  response: Response,
  defaultMessage: string,
): Promise<string> {
  try {
    const responseText = await response.text();
    const parsed: unknown = JSON.parse(responseText);

    // Check for standard ErrorResponse format from OpenAPI schema
    if (isErrorResponse(parsed)) {
      // Include full response for debugging
      return `${parsed.error.message}\n[Full Response]: ${responseText}\n[Status]: ${response.status}`;
    }

    // Fallback: check for legacy error format (message at root level)
    if (isLegacyErrorResponse(parsed)) {
      return `${parsed.message}\n[Full Response]: ${responseText}\n[Status]: ${response.status}`;
    }

    // Return default with full response text
    return `${defaultMessage}\n[Full Response]: ${responseText}`;
  } catch (e) {
    // Failed to parse error response - use default message
    return defaultMessage;
  }
}

/**
 * Get deterministic smart account address for an identifier
 * GET /api/v2/account/address/<type>/<identifier>
 */
export async function getAccountAddress(
  aaApiUrl: string,
  authenticatorType: AuthenticatorType,
  identifier: string,
): Promise<AddressResponse> {
  const encodedIdentifier = encodeURIComponent(identifier);
  const response = await fetch(
    `${aaApiUrl}/api/v2/account/address/${authenticatorType.toLowerCase()}/${encodedIdentifier}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    },
  );

  if (!response.ok) {
    const errorMessage = await parseApiError(
      response,
      `AA API v2 /address/${authenticatorType.toLowerCase()} failed with status ${response.status}`,
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
  identifier: string,
): Promise<CheckResponse> {
  const encodedIdentifier = encodeURIComponent(identifier);
  const response = await fetch(
    `${aaApiUrl}/api/v2/account/check/${authenticatorType.toLowerCase()}/${encodedIdentifier}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    },
  );

  if (response.status === 404) {
    // Account doesn't exist - return null instead of throwing
    throw new Error("ACCOUNT_NOT_FOUND");
  }

  if (!response.ok) {
    const errorMessage = await parseApiError(
      response,
      `AA API v2 /check/${authenticatorType.toLowerCase()} failed with status ${response.status}`,
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
  request: CreateEthWalletRequest,
): Promise<CreateAccountResponse> {
  const url = `${aaApiUrl}/api/v2/accounts/create/ethwallet`;
  const response = await fetchAAApiWithGatewayRetry(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorMessage = await parseApiError(
      response,
      `AA API v2 /create/ethwallet failed with status ${response.status}`,
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
  request: CreateSecp256k1Request,
): Promise<CreateAccountResponse> {
  const response = await fetchAAApiWithGatewayRetry(`${aaApiUrl}/api/v2/accounts/create/secp256k1`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorMessage = await parseApiError(
      response,
      `AA API v2 /create/secp256k1 failed with status ${response.status}`,
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
  request: CreateJWTRequest,
): Promise<CreateAccountResponse> {
  const response = await fetch(`${aaApiUrl}/api/v2/accounts/create/jwt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorMessage = await parseApiError(
      response,
      `AA API v2 /create/jwt failed with status ${response.status}`,
    );
    throw new Error(errorMessage);
  }

  return await response.json();
}
