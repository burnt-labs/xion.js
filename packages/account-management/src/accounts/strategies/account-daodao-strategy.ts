/**
 * DaoDao indexer strategy for querying smart accounts
 *
 * Resolves a login authenticator to the account contracts that currently hold it, through the
 * DaoDao indexer's `GET /{chainId}/generic/_/xion/accountsByAuthenticator` lookup.
 */

import { IndexerStrategy, SmartAccountWithCodeId } from "../../types/indexer";
import {
  AUTHENTICATOR_TYPE,
  type AuthenticatorType,
} from "@burnt-labs/signers";

/** Types the indexer's lookup accepts (dao-dao-indexer `XION_AUTHENTICATOR_TYPES`). */
const INDEXED_TYPES: ReadonlySet<string> = new Set([
  "Secp256K1",
  "Ed25519",
  "EthWallet",
  "JWT",
  "Secp256R1",
  "Passkey",
  "ZKEmail",
]);

const SDK_TYPES: ReadonlySet<string> = new Set(
  Object.values(AUTHENTICATOR_TYPE),
);

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

/** Default request timeout, the same as the DaoDao treasury strategy's. */
const DEFAULT_TIMEOUT_MS = 30000;

export class DaoDaoAccountStrategy implements IndexerStrategy {
  private readonly baseURL: string;
  private readonly timeoutMs: number;

  /**
   * @param baseURL - DaoDao indexer base URL (e.g. "https://daodaoindexer.burnt.com"),
   *                  see `getDaoDaoIndexerUrl` in `@burnt-labs/constants`
   * @param chainId - Chain the indexer path is scoped to (e.g. "xion-mainnet-1")
   * @param timeoutMs - Request timeout in milliseconds (default: 30000). A stalled
   *                    request is aborted and fails, so the composite falls through.
   */
  constructor(
    baseURL: string,
    chainId: string,
    timeoutMs: number = DEFAULT_TIMEOUT_MS,
  ) {
    this.baseURL = `${baseURL.replace(/\/+$/, "")}/${chainId}`;
    this.timeoutMs = timeoutMs;
  }

  async fetchSmartAccounts(
    loginAuthenticator: string,
    authenticatorType: AuthenticatorType,
  ): Promise<SmartAccountWithCodeId[]> {
    // Bounds the request and the body read: browser fetch has no response
    // timeout, and a stalled indexer would otherwise hold the composite.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      // The indexer rejects types it does not index (e.g. Sr25519) with a 400;
      // fail fast so the composite moves on without a request.
      if (!INDEXED_TYPES.has(authenticatorType)) {
        throw new Error(
          `the DaoDao indexer does not index ${authenticatorType} authenticators`,
        );
      }

      const params = new URLSearchParams({
        type: authenticatorType,
        authenticator: loginAuthenticator,
      });
      const url = `${this.baseURL}/generic/_/xion/accountsByAuthenticator?${params.toString()}`;

      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });

      // A miss is `200 []`; any other status (including 404 while the
      // formula is not deployed) is a failure the composite falls through.
      if (!response.ok) {
        throw new Error(
          `DaoDao indexer request failed: ${response.status} ${response.statusText}`,
        );
      }

      const data: unknown = await response.json();

      // Only `[]` is a miss: a null or otherwise malformed body is a failure,
      // not proof that no account holds the authenticator.
      if (!Array.isArray(data)) {
        throw new Error("DaoDao indexer returned a non-list response");
      }

      return (data as DaoDaoAccountResp[]).map(
        ({ address, codeId, authenticators }) => ({
          id: address,
          codeId: Number(codeId),
          // Authenticators of a type the SDK has no signer for (e.g. Secp256R1)
          // are left out; the rest keep their on-chain index.
          authenticators: authenticators
            .filter(({ type }) => SDK_TYPES.has(type))
            .map(({ index, type, authenticator }) => ({
              id: `${address}-${index}`,
              authenticator,
              authenticatorIndex: Number(index),
              type: type as AuthenticatorType,
            })),
        }),
      );
    } catch (error) {
      const errorMessage = controller.signal.aborted
        ? `DaoDao indexer request timed out after ${this.timeoutMs}ms`
        : error instanceof Error
          ? error.message
          : String(error);
      throw new Error(`DaoDao account strategy failed: ${errorMessage}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
