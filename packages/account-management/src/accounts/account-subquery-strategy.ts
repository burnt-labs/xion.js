/**
 * Subquery indexer strategy for querying smart accounts
 * Based on dashboard's src/indexer-strategies/subquery-indexer-strategy.ts
 */

import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { IndexerStrategy, SmartAccountWithCodeId } from "../types/indexer";

interface SmartAccountAuthenticator {
  id: string;
  type: string;
  authenticator: string;
  authenticatorIndex: number;
  version: string;
  __typename: string;
}

interface SmartAccountAuthenticatorsConnection {
  nodes: SmartAccountAuthenticator[];
  __typename: string;
}

interface SmartAccount {
  id: string;
  authenticators: SmartAccountAuthenticatorsConnection;
  __typename: string;
}

interface SmartAccountsConnection {
  nodes: SmartAccount[];
  __typename: string;
}

export interface AllSmartWalletQueryResponse {
  smartAccounts: SmartAccountsConnection;
}

export class SubqueryAccountStrategy implements IndexerStrategy {
  constructor(
    private readonly indexerUrl: string,
    private readonly rpcUrl: string,
  ) {
    console.log("[SubqueryAccountStrategy] 🔧 Initialized with:", {
      indexerUrl: this.indexerUrl,
      rpcUrl: this.rpcUrl
    });
  }

  async fetchSmartAccounts(
    loginAuthenticator: string,
  ): Promise<SmartAccountWithCodeId[]> {
    try {
      if (!this.rpcUrl || this.rpcUrl.length === 0) {
        throw new Error("rpcUrl must be a non-empty string.");
      }

      console.log("[SubqueryAccountStrategy] 🔍 Fetching smart accounts from Subquery indexer");
      console.log("[SubqueryAccountStrategy] Authenticator:", loginAuthenticator.substring(0, 30) + "...");

      console.log("[SubqueryAccountStrategy] 📡 Sending GraphQL query to:", this.indexerUrl);

      const response = await fetch(this.indexerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `fragment SmartAccountFragment on SmartAccountAuthenticator {
            id
            type
            authenticator
            authenticatorIndex
            version
          }
          query ($authenticator: String!) {
            smartAccounts(
              filter: {
                authenticators: { some: { authenticator: { equalTo: $authenticator } } }
              }
            ) {
              nodes {
                id
                authenticators {
                  nodes {
                    ...SmartAccountFragment
                  }
                }
              }
            }
          }`,
          variables: {
            authenticator: loginAuthenticator,
          },
        }),
      });

      if (!response.ok) {
        console.error("[SubqueryAccountStrategy] ❌ Subquery request failed:", response.status, response.statusText);
        throw new Error(`Subquery request failed: ${response.statusText}`);
      }

      const { data } = await response.json() as { data: AllSmartWalletQueryResponse };
      console.log("[SubqueryAccountStrategy] ✅ Received data from Subquery, found", data.smartAccounts.nodes.length, "accounts");

      const smartAccounts = data.smartAccounts.nodes.map((node) => ({
        id: node.id,
        authenticators: node.authenticators.nodes.map((authNode) => ({
          id: authNode.id,
          type: authNode.type,
          authenticator: authNode.authenticator,
          authenticatorIndex: authNode.authenticatorIndex,
        })),
      }));

      // Fetch code IDs from RPC (Subquery doesn't provide code_id)
      console.log("[SubqueryAccountStrategy] 🔗 Connecting to RPC to fetch code IDs:", this.rpcUrl);
      const client = await CosmWasmClient.connect(this.rpcUrl);

      const results: SmartAccountWithCodeId[] = [];
      // Doing this in serial to avoid rate limits
      console.log("[SubqueryAccountStrategy] 📋 Fetching code IDs for", smartAccounts.length, "accounts...");
      for (let i = 0; i < smartAccounts.length; i++) {
        const smartAccount = smartAccounts[i];
        console.log(`[SubqueryAccountStrategy] Fetching code ID for account ${i + 1}/${smartAccounts.length}:`, smartAccount.id);
        const { codeId } = await client.getContract(smartAccount.id);
        results.push({
          ...smartAccount,
          codeId,
        });
      }

      console.log(`[SubqueryAccountStrategy] ✅ Successfully processed ${results.length} account(s) with code IDs`);
      return results;
    } catch (error) {
      console.error("[SubqueryAccountStrategy] ❌ Error fetching smart accounts:", error);
      console.error("[SubqueryAccountStrategy] Error details:", {
        message: error instanceof Error ? error.message : String(error),
        indexerUrl: this.indexerUrl,
        rpcUrl: this.rpcUrl
      });
      // Return empty array on error - let the app decide whether to create new account
      return [];
    }
  }
}
