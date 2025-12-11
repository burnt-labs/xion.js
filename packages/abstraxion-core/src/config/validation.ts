/**
 * Config validation utilities
 * Functions for validating configuration objects
 */

/**
 * Validate that a URL is properly formatted
 */
export function validateUrl(url: string, fieldName: string): void {
  try {
    new URL(url);
  } catch (error) {
    throw new Error(`Invalid ${fieldName}: ${url} is not a valid URL`);
  }
}

/**
 * Validate that a chain ID is not empty
 */
export function validateChainId(chainId: string): void {
  if (!chainId || chainId.trim().length === 0) {
    throw new Error("Chain ID is required");
  }
}

/**
 * Validate that an RPC URL is provided
 */
export function validateRpcUrl(rpcUrl: string): void {
  if (!rpcUrl || rpcUrl.trim().length === 0) {
    throw new Error("RPC URL is required");
  }
  validateUrl(rpcUrl, "RPC URL");
}

/**
 * Validate that a gas price string is properly formatted
 * Expected format: "0.001uxion"
 */
export function validateGasPrice(gasPrice: string): void {
  if (!gasPrice || gasPrice.trim().length === 0) {
    throw new Error("Gas price is required");
  }

  const match = gasPrice.match(/^([\d.]+)(.+)$/);
  if (!match) {
    throw new Error(
      `Invalid gas price format: ${gasPrice}. Expected format: "0.001uxion"`,
    );
  }

  const amount = parseFloat(match[1]);
  if (isNaN(amount) || amount <= 0) {
    throw new Error(`Invalid gas price amount: ${match[1]}`);
  }
}

/**
 * Validate that an AA API URL is provided (for signer/browser modes)
 */
export function validateAaApiUrl(
  aaApiUrl: string | undefined,
  mode: string,
): void {
  if ((mode === "signer" || mode === "direct") && !aaApiUrl) {
    throw new Error("AA API URL is required for signer and direct modes");
  }

  if (aaApiUrl) {
    validateUrl(aaApiUrl, "AA API URL");
  }
}
