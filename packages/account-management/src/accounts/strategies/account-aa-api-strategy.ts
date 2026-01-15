/**
 * AA-API Account Discovery Strategy
 * Queries the account abstraction API for smart accounts by authenticator
 *
 * This is a reliable fallback when indexers are unavailable,
 * as AA-API is the canonical source of account state.
 *
 * Based on dashboard's NoIndexerStrategy implementation
 */

import type {
  IndexerStrategy,
  SmartAccountWithCodeId,
} from "../../types/indexer";

export interface AAApiAccountStrategyConfig {
  /** AA-API base URL (e.g., "https://aa-api.xion-testnet-2.burnt.com") */
  baseURL: string;
  /** API version (default: "v1") */
  version?: "v1" | "v2";
}

/**
 * AA-API Account Discovery Strategy
 * Queries the account abstraction API for smart accounts
 *
 * V1 API supports JWT-format authenticators only (aud.sub format)
 * V2 API support to be added when available
 *
 * This strategy provides a reliable fallback when indexers (Numia/Subquery) are unavailable,
 * as AA-API is the canonical source of truth for account state.
 *
 * @example
 * ```typescript
 * const strategy = new AAApiAccountStrategy({
 *   baseURL: "https://aa-api.xion-testnet-2.burnt.com",
 *   version: "v1"
 * });
 *
 * const accounts = await strategy.fetchSmartAccounts("project-id.user-id");
 * ```
 */
export class AAApiAccountStrategy implements IndexerStrategy {
  private config: AAApiAccountStrategyConfig;

  constructor(config: AAApiAccountStrategyConfig) {
    this.config = {
      version: "v1",
      ...config,
    };
  }

  async fetchSmartAccounts(
    loginAuthenticator: string,
  ): Promise<SmartAccountWithCodeId[]> {
    if (this.config.version === "v1") {
      return this.fetchV1(loginAuthenticator);
    }
    // V2 implementation to be added when API is available
    throw new Error("AA-API v2 not yet implemented");
  }

  /**
   * Fetch accounts using V1 API
   * Endpoint: GET /api/v1/jwt-accounts/{aud}/{sub}
   *
   * @private
   */
  private async fetchV1(
    loginAuthenticator: string,
  ): Promise<SmartAccountWithCodeId[]> {
    // Parse JWT-format authenticator: "aud.sub"
    const parts = loginAuthenticator.split(".");
    if (parts.length < 2) {
      throw new Error(
        `Invalid authenticator format for AA-API v1: expected "aud.sub", got "${loginAuthenticator}". ` +
          `V1 API only supports JWT authenticators.`,
      );
    }

    const [aud, ...subParts] = parts;
    const sub = subParts.join(".");

    const url = `${this.config.baseURL}/api/v1/jwt-accounts/${encodeURIComponent(aud)}/${encodeURIComponent(sub)}`;

    try {
      const response = await fetch(url);

      if (response.status === 404) {
        // Not found is normal - return empty array
        return [];
      }

      if (!response.ok) {
        throw new Error(
          `AA-API returned ${response.status}: ${response.statusText}`,
        );
      }

      const data = await response.json();

      // Handle both single object and array responses
      // V1 API may return either format depending on the endpoint
      const accounts = Array.isArray(data) ? data : [data];

      // Validate and filter response structure
      return accounts.filter((account) => {
        if (!account) return false;
        if (typeof account.id !== "string") return false;
        if (typeof account.codeId !== "number") return false;
        if (!Array.isArray(account.authenticators)) return false;
        return true;
      }) as SmartAccountWithCodeId[];
    } catch (error) {
      // Distinguish network errors from "not found"
      if (error instanceof Error) {
        if (error.name === "TypeError") {
          throw new Error(
            `Network error while fetching from AA-API: ${error.message}`,
          );
        }
        // Re-throw other errors (including our custom error messages)
        throw error;
      }
      throw new Error(`Unknown error fetching from AA-API: ${String(error)}`);
    }
  }
}
