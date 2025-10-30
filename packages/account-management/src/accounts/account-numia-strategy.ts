/**
 * Numia indexer strategy for querying smart accounts
 * Based on dashboard's src/indexer-strategies/numia-indexer-strategy.ts
 */

import { IndexerStrategy, SmartAccountWithCodeId } from "../types/indexer";

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
    console.log("[NumiaAccountStrategy] 🔧 Initialized with URL:", this.baseURL, "Auth:", !!authToken);
  }

  async fetchSmartAccounts(
    loginAuthenticator: string,
  ): Promise<SmartAccountWithCodeId[]> {
    console.log("[NumiaAccountStrategy] 🔍 Fetching smart accounts from Numia indexer");
    console.log("[NumiaAccountStrategy] Authenticator:", loginAuthenticator.substring(0, 30) + "...");

    try {
      // Encode authenticator for URL
      const encodedAuthenticator = encodeURIComponent(loginAuthenticator);
      const url = `${this.baseURL}authenticators/${encodedAuthenticator}/smartAccounts/details`;

      console.log("[NumiaAccountStrategy] 📡 Sending request to:", url);

      // Build headers, conditionally include Authorization
      const headers: HeadersInit = {
        Accept: "application/json",
      };

      if (this.authToken) {
        headers.Authorization = `Bearer ${this.authToken}`;
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        // 404 means no accounts found
        if (response.status === 404) {
          console.log("[NumiaAccountStrategy] No accounts found (404)");
          return [];
        }
        console.error("[NumiaAccountStrategy] ❌ Request failed:", response.status, response.statusText);
        throw new Error(`Indexer request failed: ${response.statusText}`);
      }

      const data: NumiaSmartAccountResp[] = await response.json();
      console.log("[NumiaAccountStrategy] ✅ Received", data?.length || 0, "accounts from Numia");

      const results = data?.map(({ smart_account, code_id, authenticators }) => ({
        id: smart_account,
        codeId: Number(code_id),
        authenticators: authenticators.map(
          ({ authenticator, authenticator_index, type }) => ({
            id: `${smart_account}-${authenticator_index}`,
            authenticator,
            authenticatorIndex: Number(authenticator_index),
            type,
          }),
        ),
      })) || [];

      console.log(`[NumiaAccountStrategy] ✅ Successfully processed ${results.length} account(s) with code IDs`);
      return results;
    } catch (error) {
      console.error('[NumiaAccountStrategy] ❌ Error fetching smart accounts:', error);
      console.error('[NumiaAccountStrategy] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        baseURL: this.baseURL
      });
      // Return empty array on error - let the app decide whether to create new account
      return [];
    }
  }
}
