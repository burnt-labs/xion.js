/**
 * DaoDao indexer strategy for querying smart accounts
 *
 * Resolves a login authenticator to the account contracts that currently hold it, through the
 * DaoDao indexer's `GET /{chainId}/generic/_/xion/accountsByAuthenticator` lookup.
 */

import { IndexerStrategy, SmartAccountWithCodeId } from "../../types/indexer";
import type { AuthenticatorType } from "@burnt-labs/signers";

interface DaoDaoAuthenticatorResp {
  index: number;
  type: string;
  authenticator: string;
}

interface DaoDaoAccountResp {
  address: string;
  codeId: number;
  authenticators: DaoDaoAuthenticatorResp[];
}

export class DaoDaoAccountStrategy implements IndexerStrategy {
  private readonly baseURL: string;

  /**
   * @param baseURL - DaoDao indexer base URL (e.g. "https://daodaoindexer.burnt.com"),
   *                  see `getDaoDaoIndexerUrl` in `@burnt-labs/constants`
   * @param chainId - Chain the indexer path is scoped to (e.g. "xion-mainnet-1")
   */
  constructor(baseURL: string, chainId: string) {
    this.baseURL = `${baseURL.replace(/\/+$/, "")}/${chainId}`;
  }

  async fetchSmartAccounts(
    loginAuthenticator: string,
    authenticatorType: AuthenticatorType,
  ): Promise<SmartAccountWithCodeId[]> {
    try {
      const params = new URLSearchParams({
        type: authenticatorType,
        authenticator: loginAuthenticator,
      });
      const url = `${this.baseURL}/generic/_/xion/accountsByAuthenticator?${params.toString()}`;

      const response = await fetch(url, {
        headers: { Accept: "application/json" },
      });

      // A miss is `200 []`; any other status (including 404 while the
      // formula is not deployed) is a failure the composite falls through.
      if (!response.ok) {
        throw new Error(
          `DaoDao indexer request failed: ${response.status} ${response.statusText}`,
        );
      }

      const data: DaoDaoAccountResp[] = await response.json();

      return (data ?? []).map(({ address, codeId, authenticators }) => ({
        id: address,
        codeId: Number(codeId),
        authenticators: authenticators.map(
          ({ index, type, authenticator }) => ({
            id: `${address}-${index}`,
            authenticator,
            authenticatorIndex: Number(index),
            type: type as AuthenticatorType,
          }),
        ),
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`DaoDao account strategy failed: ${errorMessage}`);
    }
  }
}
