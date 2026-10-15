/**
 * AA-API Account Discovery Strategy
 * Queries the account abstraction API for smart accounts by authenticator
 *
 * - v1: JWT accounts via GET /api/v1/jwt-accounts/{aud}/{sub}
 * - v2: EthWallet/Secp256K1 accounts via GET /api/v2/account/check/{type}/{id},
 *   then verified independently on chain (contract, actual code ID and a
 *   matching authenticator)
 */

import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { fromBase64, fromUtf8 } from "@cosmjs/encoding";
import { findAAApiAccountAddress } from "@burnt-labs/abstraxion-core";
import {
  AUTHENTICATOR_TYPE,
  type AuthenticatorType,
} from "@burnt-labs/signers";
import type {
  IndexerStrategy,
  SmartAccountWithCodeId,
} from "../../types/indexer";
import type { Authenticator } from "../../types/authenticator";
import { isMatchingAuthenticator } from "../discovery";

export type AAApiAccountStrategyConfig =
  | {
      /** AA-API base URL (e.g., "https://aa-api.xion-testnet-2.burnt.com") */
      baseURL: string;
      /** API version (default: "v1") */
      version?: "v1";
    }
  | {
      /** AA-API base URL (e.g., "https://aa-api.xion-testnet-2.burnt.com") */
      baseURL: string;
      version: "v2";
      /**
       * RPC URL used to verify the account the AA API reports. Validated when
       * discovery runs, so construction works during SSR without one.
       */
      rpcUrl: string;
      /** Bech32 prefix of smart-account addresses (e.g., "xion") */
      addressPrefix: string;
    };

type AAApiV2Config = Extract<AAApiAccountStrategyConfig, { version: "v2" }>;

/**
 * AA-API Account Discovery Strategy
 *
 * V1 API supports JWT-format authenticators only (aud.sub format).
 *
 * V2 supports EthWallet and Secp256K1. Only an explicit HTTP 404 from the AA
 * API means "no account" ([]). When the API reports an account, the strategy
 * queries that exact address on chain and returns it only if the contract
 * exists and holds the login authenticator. Any RPC error, malformed data or
 * missing authenticator rejects, so a broken lookup can never look like
 * "create a new account".
 *
 * @example
 * ```typescript
 * const strategy = new AAApiAccountStrategy({
 *   baseURL: "https://aa-api.xion-testnet-2.burnt.com",
 *   version: "v2",
 *   rpcUrl: "https://rpc.xion-testnet-2.burnt.com:443",
 *   addressPrefix: "xion",
 * });
 *
 * const accounts = await strategy.fetchSmartAccounts("0xabc...", "EthWallet");
 * ```
 */
export class AAApiAccountStrategy implements IndexerStrategy {
  private config: AAApiAccountStrategyConfig;

  constructor(config: AAApiAccountStrategyConfig) {
    if (config.version === "v2") {
      if (!config.baseURL) {
        throw new Error("AA-API v2 strategy requires baseURL");
      }
      // rpcUrl is checked when discovery runs, not here: during SSR the
      // normalized config may legitimately carry an empty RPC URL.
      if (!config.addressPrefix) {
        throw new Error("AA-API v2 strategy requires addressPrefix");
      }
      this.config = { ...config };
    } else {
      this.config = {
        version: "v1",
        ...config,
      };
    }
  }

  async fetchSmartAccounts(
    loginAuthenticator: string,
    authenticatorType?: AuthenticatorType,
  ): Promise<SmartAccountWithCodeId[]> {
    if (this.config.version === "v2") {
      return this.fetchV2(this.config, loginAuthenticator, authenticatorType);
    }
    return this.fetchV1(loginAuthenticator);
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

  /**
   * Fetch accounts using V2 API + on-chain verification
   * Endpoint: GET /api/v2/account/check/{type}/{identifier}
   *
   * @private
   */
  private async fetchV2(
    config: AAApiV2Config,
    loginAuthenticator: string,
    authenticatorType: AuthenticatorType | undefined,
  ): Promise<SmartAccountWithCodeId[]> {
    if (
      authenticatorType !== AUTHENTICATOR_TYPE.EthWallet &&
      authenticatorType !== AUTHENTICATOR_TYPE.Secp256K1
    ) {
      throw new Error(
        `AA-API v2 account discovery supports EthWallet and Secp256K1 authenticators, got "${String(authenticatorType)}"`,
      );
    }

    if (!config.rpcUrl) {
      throw new Error("AA-API v2 strategy requires rpcUrl");
    }

    // Only an explicit HTTP 404 resolves to null; everything else throws
    const address = await findAAApiAccountAddress({
      aaApiUrl: config.baseURL,
      authenticatorType,
      identifier: loginAuthenticator,
      addressPrefix: config.addressPrefix,
    });

    if (address === null) {
      return [];
    }

    // The API reported an account: from here on, any failure is an
    // inconsistency and must surface as an error, never as "no account".
    try {
      const client = await CosmWasmClient.connect(config.rpcUrl);
      const contract = await client.getContract(address);

      if (contract?.address !== address) {
        throw new Error(
          `chain returned contract info for "${String(contract?.address)}"`,
        );
      }
      if (
        typeof contract.codeId !== "number" ||
        !Number.isInteger(contract.codeId) ||
        contract.codeId <= 0
      ) {
        throw new Error(`invalid code ID "${String(contract.codeId)}"`);
      }

      const authenticators = await queryAuthenticators(client, address);
      const loginMatch = authenticators.find((auth) =>
        isMatchingAuthenticator(auth, loginAuthenticator, authenticatorType),
      );
      if (!loginMatch) {
        throw new Error(
          `no on-chain ${authenticatorType} authenticator matches the login authenticator`,
        );
      }

      return [
        {
          id: address,
          codeId: contract.codeId,
          authenticators,
        },
      ];
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `AA-API reported smart account ${address} but on-chain verification failed: ${message}`,
      );
    }
  }
}

/**
 * Read every authenticator from a smart-account contract.
 *
 * Contract query schema:
 * 1. {"authenticator_i_ds":{}} → [0, 1, 2, ...]
 * 2. {"authenticator_by_i_d":{"id":N}} → base64-encoded JSON, e.g.
 *    {"EthWallet":{"address":"0x..."}} or {"Secp256K1":{"pubkey":"..."}}
 *
 * Query and decode errors propagate. Authenticator kinds this SDK does not
 * model are skipped; they cannot match an EthWallet/Secp256K1 login.
 */
async function queryAuthenticators(
  client: CosmWasmClient,
  contractAddress: string,
): Promise<Authenticator[]> {
  const ids: unknown = await client.queryContractSmart(contractAddress, {
    authenticator_i_ds: {},
  });

  if (
    !Array.isArray(ids) ||
    !ids.every((id) => typeof id === "number" && Number.isInteger(id))
  ) {
    throw new Error("malformed authenticator_i_ds response");
  }

  const authenticators = await Promise.all(
    (ids as number[]).map(async (id) => {
      const response: unknown = await client.queryContractSmart(
        contractAddress,
        { authenticator_by_i_d: { id } },
      );
      return parseAuthenticator(contractAddress, id, response);
    }),
  );

  return authenticators.filter((auth): auth is Authenticator => auth !== null);
}

function parseAuthenticator(
  contractAddress: string,
  id: number,
  response: unknown,
): Authenticator | null {
  let data: unknown;
  try {
    data =
      typeof response === "string"
        ? JSON.parse(fromUtf8(fromBase64(response)))
        : response;
  } catch (error) {
    throw new Error(
      `malformed authenticator ${id}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (typeof data !== "object" || data === null) {
    throw new Error(`malformed authenticator ${id}`);
  }
  const record = data as Record<string, any>;

  let type: AuthenticatorType;
  let value: unknown;
  if (record.EthWallet) {
    type = AUTHENTICATOR_TYPE.EthWallet;
    value = record.EthWallet.address;
  } else if (record.Secp256K1) {
    type = AUTHENTICATOR_TYPE.Secp256K1;
    value = record.Secp256K1.pubkey;
  } else if (record.JWT) {
    type = AUTHENTICATOR_TYPE.JWT;
    value = record.JWT.aud_and_sub;
  } else if (record.Passkey) {
    type = AUTHENTICATOR_TYPE.Passkey;
    value = record.Passkey.credential_id;
  } else {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error(`malformed ${type} authenticator ${id}`);
  }

  return {
    id: `${contractAddress}-${id}`,
    type,
    authenticator: value,
    authenticatorIndex: id,
  };
}
