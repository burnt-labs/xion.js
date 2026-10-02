/**
 * Direct Chain Indexer Strategy
 * Queries the chain directly to find existing smart accounts
 * This is a fallback when indexers are unavailable
 *
 * How it works:
 * 1. Resolve the derivation checksum: the chain's x/abstractaccount
 *    address_derivation_hash (xion v31+), cached per chain
 * 2. Calculate the instantiate2 address for that checksum, plus one per
 *    legacy checksum (the data_hash of each allowed account code), because
 *    accounts registered before v31 were derived from the code's own checksum
 * 3. Query each candidate address for authenticators via RPC
 * 4. Return every account found, current derivation first, with its own code id
 */

import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import {
  calculateSalt,
  calculateSmartAccountAddress,
  AUTHENTICATOR_TYPE,
  type AuthenticatorType,
} from "@burnt-labs/signers";
import {
  resolveAddressDerivation,
  normalizeChecksum,
  AddressDerivationMismatchError,
  type ResolvedAddressDerivation,
} from "@burnt-labs/abstraxion-core";
import type {
  IndexerStrategy,
  SmartAccountWithCodeId,
} from "../../types/indexer";
import { Buffer } from "buffer";

export interface RpcAccountStrategyConfig {
  /** RPC URL for querying the chain */
  rpcUrl: string;
  /**
   * Optional checksum pin (hex). The chain's address_derivation_hash is used
   * when available; a pin that disagrees with it makes discovery fail with
   * `AddressDerivationMismatchError`. Used directly only when the chain has
   * no derivation hash or cannot be reached.
   */
  checksum?: string;
  /**
   * Extra checksums to check for accounts registered before xion v31, on top
   * of the ones resolved from the chain (allowed code data_hashes).
   */
  legacyChecksums?: string[];
  /** Chain ID, used as the derivation cache key (defaults to rpcUrl) */
  chainId?: string;
  /** Creator/fee granter address */
  creator: string;
  /** Address prefix (e.g., "xion") */
  prefix: string;
  /** Code ID of the smart account contract */
  codeId: number;
  /**
   * Override how the derivation is resolved (defaults to reading
   * x/abstractaccount params over `rpcUrl`).
   */
  resolveDerivation?: () => Promise<ResolvedAddressDerivation>;
}

/**
 * Direct Chain Indexer Strategy
 * Calculates predicted addresses and queries chain directly (no indexer needed)
 *
 * TODO / NOTE : This strategy might not work for more complex scenarios like
 * meta accounts where the authenticator in question has been removed or added to other accounts.
 *
 * Only to be used as a backup, indexers are the preferred way to find accounts.
 */
export class RpcAccountStrategy implements IndexerStrategy {
  private config: RpcAccountStrategyConfig;

  constructor(config: RpcAccountStrategyConfig) {
    this.config = config;
  }

  private async resolveDerivation(): Promise<ResolvedAddressDerivation> {
    if (this.config.resolveDerivation) {
      return this.config.resolveDerivation();
    }
    return resolveAddressDerivation({
      rpcUrl: this.config.rpcUrl,
      chainId: this.config.chainId,
      pinnedChecksum: this.config.checksum,
    });
  }

  async fetchSmartAccounts(
    loginAuthenticator: string,
    authenticatorType: AuthenticatorType,
  ): Promise<SmartAccountWithCodeId[]> {
    try {
      // 1. Calculate salt from authenticator (uses same logic as AA API)
      const salt = calculateSalt(authenticatorType, loginAuthenticator);

      // 2. Candidate checksums: current derivation first, then legacy ones
      const derivation = await this.resolveDerivation();
      const checksums = [
        ...new Set(
          [
            derivation.checksum,
            ...derivation.legacyChecksums,
            ...(this.config.legacyChecksums ?? []),
          ].map(normalizeChecksum),
        ),
      ];

      // 3. Predicted instantiate2 address per checksum (deduplicated)
      const addresses = [
        ...new Set(
          checksums.map((checksum) =>
            calculateSmartAccountAddress({
              checksum,
              creator: this.config.creator,
              salt,
              prefix: this.config.prefix,
            }),
          ),
        ),
      ];

      // 4. Connect to chain and query each candidate.
      // Query authenticators directly (more reliable than getContract);
      // getContract() can fail with protobuf errors on some contract types.
      const client = await CosmWasmClient.connect(this.config.rpcUrl);
      const found = await Promise.all(
        addresses.map(async (address) => ({
          address,
          authenticators: await this.queryAuthenticators(
            client,
            address,
            loginAuthenticator,
          ),
        })),
      );

      // 5. Return every account that exists, current derivation first.
      // A legacy account can sit on another allowed code, so report the
      // contract's own code id, falling back to the configured one.
      return Promise.all(
        found
          .filter((f) => f.authenticators && f.authenticators.length > 0)
          .map(async (f) => ({
            id: f.address,
            codeId: await this.queryCodeId(client, f.address),
            authenticators: f.authenticators,
          })),
      );
    } catch (error) {
      // Keep the pin-mismatch error type so callers can detect it
      if (error instanceof AddressDerivationMismatchError) {
        throw error;
      }
      // Re-throw error instead of silently returning empty array
      // Caller (composite strategy) will handle fallback
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`RPC account strategy failed: ${errorMessage}`);
    }
  }

  /** Code id of a deployed contract, or the configured codeId if unavailable */
  private async queryCodeId(
    client: CosmWasmClient,
    contractAddress: string,
  ): Promise<number> {
    try {
      const contract = await client.getContract(contractAddress);
      return contract?.codeId ?? this.config.codeId;
    } catch {
      return this.config.codeId;
    }
  }

  /**
   * Query authenticators from smart account contract
   *
   * Contract query schema:
   * 1. Get authenticator IDs: {"authenticator_i_ds":{}} → [0, 1, 2, ...]
   * 2. Get specific authenticator: {"authenticator_by_i_d":{"id":0}} → base64-encoded authenticator data
   *
   * Returns empty array if contract doesn't exist or query fails
   */
  private async queryAuthenticators(
    client: CosmWasmClient,
    contractAddress: string,
    loginAuthenticator: string,
  ): Promise<
    Array<{
      id: string;
      type: AuthenticatorType;
      authenticator: string;
      authenticatorIndex: number;
    }>
  > {
    try {
      // Step 1: Query all authenticator IDs
      const idsResponse = await client.queryContractSmart(contractAddress, {
        authenticator_i_ds: {},
      });

      if (!Array.isArray(idsResponse) || idsResponse.length === 0) {
        return [];
      }

      // Step 2: Query each authenticator by ID
      const authenticators = await Promise.all(
        idsResponse.map(async (id: number) => {
          try {
            const authResponse = await client.queryContractSmart(
              contractAddress,
              {
                authenticator_by_i_d: { id },
              },
            );

            // Parse the authenticator data (it's base64-encoded JSON)
            // Format: {"EthWallet":{"address":"0x..."}} or {"Secp256K1":{"pubkey":"..."}}
            let authenticatorData: any;
            let authenticatorString: string;
            let authenticatorType: AuthenticatorType;

            if (typeof authResponse === "string") {
              // Response is base64-encoded
              const decoded = Buffer.from(authResponse, "base64").toString(
                "utf-8",
              );
              authenticatorData = JSON.parse(decoded);
            } else {
              // Response is already JSON
              authenticatorData = authResponse;
            }

            // Extract authenticator string and type from contract response
            // Contract returns data in format: {"EthWallet":{"address":"0x..."}} etc.
            if (authenticatorData.EthWallet) {
              authenticatorString = authenticatorData.EthWallet.address;
              authenticatorType = AUTHENTICATOR_TYPE.EthWallet;
            } else if (authenticatorData.Secp256K1) {
              authenticatorString = authenticatorData.Secp256K1.pubkey;
              authenticatorType = AUTHENTICATOR_TYPE.Secp256K1;
            } else if (authenticatorData.JWT) {
              authenticatorString = authenticatorData.JWT.aud_and_sub;
              authenticatorType = AUTHENTICATOR_TYPE.JWT;
            } else if (authenticatorData.Passkey) {
              authenticatorString = authenticatorData.Passkey.credential_id;
              authenticatorType = AUTHENTICATOR_TYPE.Passkey;
            } else {
              // Unknown authenticator type from contract - skip it
              return null;
            }

            return {
              id: `${contractAddress}-${id}`,
              type: authenticatorType,
              authenticator: authenticatorString,
              authenticatorIndex: id,
            };
          } catch (error: unknown) {
            // Silently return null for authenticators that can't be decoded
            // This is expected for some authenticator types
            return null;
          }
        }),
      );

      // Filter out null results
      const validAuthenticators = authenticators.filter(
        (auth): auth is NonNullable<typeof auth> => auth !== null,
      );

      return validAuthenticators;
    } catch (error: unknown) {
      // If the query fails, the contract likely doesn't exist
      // This is normal for addresses that haven't been instantiated yet
      return [];
    }
  }
}
