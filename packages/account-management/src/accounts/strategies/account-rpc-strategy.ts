/**
 * RPC Account Strategy (deprecated compatibility adapter)
 *
 * This class used to derive the smart-account address locally from a
 * contract checksum. Address selection now belongs to the AA API, so the
 * class delegates to {@link AAApiAccountStrategy} in v2 mode: the AA API
 * reports the account and it is then verified on chain via `rpcUrl`.
 *
 * Migration: pass `aaApiUrl`. `checksum`, `creator` and `codeId` are accepted
 * for source compatibility but ignored. An arbitrary RPC URL cannot imply an
 * AA API host, so constructing without `aaApiUrl` throws.
 *
 * @deprecated Use `new AAApiAccountStrategy({ baseURL, version: "v2", rpcUrl, addressPrefix })`.
 */

import type { AuthenticatorType } from "@burnt-labs/signers";
import type {
  IndexerStrategy,
  SmartAccountWithCodeId,
} from "../../types/indexer";
import { AAApiAccountStrategy } from "./account-aa-api-strategy";

export interface RpcAccountStrategyConfig {
  /** RPC URL used to verify the account the AA API reports */
  rpcUrl: string;
  /**
   * AA API base URL (e.g. "https://aa-api.xion-testnet-2.burnt.com").
   * Required: construction throws a migration error without it.
   */
  aaApiUrl?: string;
  /** Address prefix (e.g., "xion") */
  prefix: string;
  /** @deprecated Ignored. The AA API selects the address. */
  checksum?: string;
  /** @deprecated Ignored. The AA API selects the address. */
  creator?: string;
  /** @deprecated Ignored. The on-chain code ID is reported instead. */
  codeId?: number;
}

export const RPC_ACCOUNT_STRATEGY_MIGRATION_ERROR =
  "RpcAccountStrategy now discovers accounts through the AA API and requires `aaApiUrl` " +
  '(e.g. "https://aa-api.xion-testnet-2.burnt.com"). `checksum`, `creator` and `codeId` are ignored. ' +
  'Prefer new AAApiAccountStrategy({ baseURL, version: "v2", rpcUrl, addressPrefix }).';

/**
 * @deprecated Use {@link AAApiAccountStrategy} with `version: "v2"`.
 */
export class RpcAccountStrategy implements IndexerStrategy {
  private readonly delegate: AAApiAccountStrategy;

  constructor(config: RpcAccountStrategyConfig) {
    if (!config?.aaApiUrl) {
      throw new Error(RPC_ACCOUNT_STRATEGY_MIGRATION_ERROR);
    }
    this.delegate = new AAApiAccountStrategy({
      baseURL: config.aaApiUrl,
      version: "v2",
      rpcUrl: config.rpcUrl,
      addressPrefix: config.prefix,
    });
  }

  fetchSmartAccounts(
    loginAuthenticator: string,
    authenticatorType: AuthenticatorType,
  ): Promise<SmartAccountWithCodeId[]> {
    return this.delegate.fetchSmartAccounts(
      loginAuthenticator,
      authenticatorType,
    );
  }
}
