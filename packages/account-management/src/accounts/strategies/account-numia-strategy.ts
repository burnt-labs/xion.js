/**
 * Numia indexer strategy for querying smart accounts
 * Based on dashboard's src/indexer-strategies/numia-indexer-strategy.ts
 */

import { IndexerStrategy, SmartAccountWithCodeId } from "../../types/indexer";
import type { AuthenticatorType } from "@burnt-labs/signers";

interface NumiaAuthenticatorResp {
  type: string;
  authenticator: string;
  authenticator_index: number;
}

interface NumiaSmartAccountResp {
  smart_account: string;
  code_id: number;
  authenticators: NumiaAuthenticatorResp[];
}

export class NumiaAccountStrategy implements IndexerStrategy {
  private baseURL: string;

  constructor(
    baseURL: string,
    private readonly authToken?: string,
  ) {
    // Ensure trailing slash
    if (!baseURL.endsWith("/")) {
      baseURL = baseURL + "/";
    }

    // Ensure v2 or v3 suffix
    if (!(baseURL.endsWith("/v2/") || baseURL.endsWith("/v3/"))) {
      baseURL = baseURL + "v2/";
    }

    this.baseURL = baseURL;
  }

  async fetchSmartAccounts(
    loginAuthenticator: string,
    _authenticatorType: AuthenticatorType, // Required by interface but not used - Numia queries by authenticator string directly
  ): Promise<SmartAccountWithCodeId[]> {
    try {
      // Encode authenticator for URL
      const encodedAuthenticator = encodeURIComponent(loginAuthenticator);
      const url = `${this.baseURL}authenticators/${encodedAuthenticator}/smartAccounts/details`;

      // Build headers, conditionally include Authorization
      const headers: HeadersInit = {
        Accept: "application/json",
      };

      if (this.authToken) {
        headers.Authorization = `Bearer ${this.authToken}`;
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        // 404 means no accounts found (not an error)
        if (response.status === 404) {
          return [];
        }
        throw new Error(
          `Numia indexer request failed: ${response.status} ${response.statusText}`,
        );
      }

      const data: NumiaSmartAccountResp[] = await response.json();

      const results =
        data?.map(({ smart_account, code_id, authenticators }) => ({
          id: smart_account,
          codeId: Number(code_id),
          authenticators: authenticators.map(
            ({ authenticator, authenticator_index, type }) => ({
              id: `${smart_account}-${authenticator_index}`,
              authenticator,
              authenticatorIndex: Number(authenticator_index),
              type: type as AuthenticatorType,
            }),
          ),
        })) || [];

      return results;
    } catch (error) {
      // Re-throw error instead of silently returning empty array
      // Caller (composite strategy) will handle fallback
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Numia account strategy failed: ${errorMessage}`);
    }
  }
}
