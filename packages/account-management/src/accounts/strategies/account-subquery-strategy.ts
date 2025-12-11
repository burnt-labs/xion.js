/**
 * Subquery indexer strategy for querying smart accounts
 * Based on dashboard's src/indexer-strategies/subquery-indexer-strategy.ts
 *
 * Subquery provides account addresses and authenticators but not code_id,
 * so code_id must be configured (same pattern as RPC and Numia strategies)
 */

import { IndexerStrategy, SmartAccountWithCodeId } from "../../types/indexer";
import type { AuthenticatorType } from "@burnt-labs/signers";

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
    private readonly codeId: number, // Required: code_id must be configured (Subquery doesn't provide it)
  ) {}

  async fetchSmartAccounts(
    loginAuthenticator: string,
    _authenticatorType: AuthenticatorType, // Required by interface but not used - Subquery queries by authenticator string directly
  ): Promise<SmartAccountWithCodeId[]> {
    try {
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
        throw new Error(
          `Subquery request failed: ${response.status} ${response.statusText}`,
        );
      }

      const { data } = (await response.json()) as {
        data: AllSmartWalletQueryResponse;
      };

      // Use configured code_id (same pattern as RPC strategies)
      // Avoids calling getContract() which can fail with protobuf errors
      return data.smartAccounts.nodes.map((node) => ({
        id: node.id,
        codeId: this.codeId,
        authenticators: node.authenticators.nodes.map((authNode) => ({
          id: authNode.id,
          type: authNode.type as AuthenticatorType,
          authenticator: authNode.authenticator,
          authenticatorIndex: authNode.authenticatorIndex,
        })),
      }));
    } catch (error) {
      // Re-throw error instead of silently returning empty array
      // Caller (composite strategy) will handle fallback
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Subquery account strategy failed: ${errorMessage}`);
    }
  }
}
