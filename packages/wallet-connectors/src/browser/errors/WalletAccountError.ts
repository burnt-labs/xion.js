/**
 * Wallet account error handling
 * Extracted from dashboard utils/wallet-utils.ts
 */

/**
 * Custom error class for wallet-related operations
 *
 * This error includes both a technical message (for logging)
 * and a user-friendly message (for display in UI).
 */
export class WalletAccountError extends Error {
  constructor(
    message: string,
    public userMessage: string,
    public originalError?: unknown,
  ) {
    super(message);
    this.name = "WalletAccountError";
  }
}

/**
 * Converts technical errors to simple user-friendly messages
 *
 * This function analyzes error messages and returns appropriate
 * user-facing text for common wallet operation failures.
 *
 * @param error - The error to convert
 * @returns User-friendly error message
 */
export function getErrorMessageForUI(error: unknown): string {
  if (error instanceof WalletAccountError) {
    return error.userMessage;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes("user rejected") || message.includes("user denied")) {
      return "Signature cancelled";
    }

    if (message.includes("not installed")) {
      return "Wallet not found";
    }

    if (message.includes("pubkey recovered from signature does not match")) {
      return "Signature verification failed";
    }

    if (message.includes("signature is invalid")) {
      return "Invalid signature";
    }

    if (message.includes("authorization not found")) {
      return "Service error. Please contact support";
    }

    if (message.includes("fee-grant not found")) {
      return "Fee grant not found. Please contact support";
    }

    if (message.includes("account already exists")) {
      return "Account already exists";
    }

    if (message.includes("network") || message.includes("fetch")) {
      return "Network error. Check your connection";
    }
  }

  return "Something went wrong. Please try again";
}
