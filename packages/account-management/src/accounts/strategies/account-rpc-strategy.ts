/**
 * Direct Chain Indexer Strategy
 * Queries the chain directly to find existing smart accounts
 * This is a fallback when indexers are unavailable
 *
 * How it works:
 * 1. Calculate predicted instantiate2 address from authenticator (using crypto utilities)
 * 2. Check if contract exists at that address via RPC
 * 3. If exists, query contract state for authenticators
 * 4. Return account info
 */

import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { calculateSalt, calculateSmartAccountAddress, AUTHENTICATOR_TYPE, type AuthenticatorType } from "@burnt-labs/signers";
import type { IndexerStrategy, SmartAccountWithCodeId } from "../../types/indexer";
import { Buffer } from "buffer";

export interface RpcAccountStrategyConfig {
  /** RPC URL for querying the chain */
  rpcUrl: string;
  /** Contract checksum (hex) for instantiate2 calculation */
  checksum: string;
  /** Creator/fee granter address */
  creator: string;
  /** Address prefix (e.g., "xion") */
  prefix: string;
  /** Code ID of the smart account contract */
  codeId: number;
}

/**
 * Direct Chain Indexer Strategy
 * Calculates predicted address and queries chain directly (no indexer needed)
 *
 * Example usage:
 * ```typescript
 * const strategy = new RpcAccountStrategy({
 *   rpcUrl: "https://rpc.xion-testnet-1.burnt.com:443",
 *   checksum: "abc123...",
 *   creator: "xion1feeGranter...",
 *   prefix: "xion",
 *   codeId: 1,
 * });
 * ```
 */
export class RpcAccountStrategy implements IndexerStrategy {
  private config: RpcAccountStrategyConfig;

  constructor(config: RpcAccountStrategyConfig) {
    this.config = config;
  }

  async fetchSmartAccounts(
    loginAuthenticator: string,
    authenticatorType: AuthenticatorType,
  ): Promise<SmartAccountWithCodeId[]> {
    try {
      // 1. Use provided authenticator type for salt calculation
      const typeForSalt = authenticatorType;

      // 2. Calculate salt from authenticator (uses same logic as AA API)
      const salt = calculateSalt(typeForSalt, loginAuthenticator);

      // 3. Calculate smart account address using instantiate2
      const calculatedAddress = calculateSmartAccountAddress({
        checksum: this.config.checksum,
        creator: this.config.creator,
        salt,
        prefix: this.config.prefix,
      });

      // 4. Connect to chain and query contract
      const client = await CosmWasmClient.connect(this.config.rpcUrl);

      // 5. Query authenticators directly (more reliable than getContract)
      // getContract() can fail with protobuf errors on some contract types
      const authenticators = await this.queryAuthenticators(client, calculatedAddress, loginAuthenticator);

      if (!authenticators || authenticators.length === 0) {
        // If query failed, contract likely doesn't exist (this is normal)
        return [];
      }

      // 6. Return smart account with authenticators
      // Use configured codeId (same as AA API and Dashboard)
      return [{
        id: calculatedAddress,
        codeId: this.config.codeId,
        authenticators: authenticators,
      }];
    } catch (error) {
      console.error("[RpcAccountStrategy] Failed to query chain:", error);
      return [];
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
  ): Promise<Array<{ id: string; type: string; authenticator: string; authenticatorIndex: number }>> {
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
            const authResponse = await client.queryContractSmart(contractAddress, {
              authenticator_by_i_d: { id },
            });

            // Parse the authenticator data (it's base64-encoded JSON)
            // Format: {"EthWallet":{"address":"0x..."}} or {"Secp256K1":{"pubkey":"..."}}
            let authenticatorData: any;
            let authenticatorString: string;
            let authenticatorType: string;

            if (typeof authResponse === 'string') {
              // Response is base64-encoded
              const decoded = Buffer.from(authResponse, 'base64').toString('utf-8');
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
          } catch (error: any) {
            return null;
          }
        })
      );

      // Filter out null results
      const validAuthenticators = authenticators.filter((auth): auth is NonNullable<typeof auth> => auth !== null);

      return validAuthenticators;
    } catch (error: any) {
      // If the query fails, the contract likely doesn't exist
      // This is normal for addresses that haven't been instantiated yet
      return [];
    }
  }
}
