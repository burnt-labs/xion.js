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
import { calculateSalt, predictSmartAccountAddress } from "@burnt-labs/signers";
import type { IndexerStrategy, SmartAccountWithCodeId } from "../types/indexer";
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
  ): Promise<SmartAccountWithCodeId[]> {
    try {
      console.log(`[RpcAccountStrategy] Querying chain for authenticator: ${loginAuthenticator.substring(0, 20)}...`);

      // 1. Determine wallet type explicitly from authenticator format
      const walletType = this.getWalletTypeForSaltCalculation(loginAuthenticator);
      console.log(`[RpcAccountStrategy] Detected wallet type: ${walletType}`);

      // 2. Calculate salt from authenticator (uses same logic as AA API)
      const salt = calculateSalt(walletType, loginAuthenticator);
      console.log(`[RpcAccountStrategy] Salt (hex): ${salt.slice(0, 20)}...`);
      console.log(`[RpcAccountStrategy] Config - checksum: ${this.config.checksum.slice(0, 20)}..., creator: ${this.config.creator}, prefix: ${this.config.prefix}`);

      // 3. Predict smart account address using instantiate2
      const predictedAddress = predictSmartAccountAddress({
        checksum: this.config.checksum,
        creator: this.config.creator,
        salt,
        prefix: this.config.prefix,
      });

      console.log(`[RpcAccountStrategy] Predicted address: ${predictedAddress}`);

      // 4. Connect to chain and query contract
      console.log(`[RpcAccountStrategy] Connecting to RPC: ${this.config.rpcUrl}`);
      const client = await CosmWasmClient.connect(this.config.rpcUrl);
      console.log(`[RpcAccountStrategy] ✅ Connected to RPC`);

      // 5. Query authenticators directly (more reliable than getContract)
      // getContract() can fail with protobuf errors on some contract types
      console.log(`[RpcAccountStrategy] Querying authenticators at ${predictedAddress}...`);
      const authenticators = await this.queryAuthenticators(client, predictedAddress, loginAuthenticator);

      if (!authenticators || authenticators.length === 0) {
        // If query failed, contract likely doesn't exist (this is normal)
        console.log(`[RpcAccountStrategy] No contract or authenticators found at ${predictedAddress}`);
        return [];
      }

      console.log(`[RpcAccountStrategy] ✅ Found contract with ${authenticators.length} authenticator(s)`);

      // 6. Return smart account with authenticators
      // Use configured codeId (same as AA API and Dashboard)
      return [{
        id: predictedAddress,
        codeId: this.config.codeId,
        authenticators: authenticators,
      }];
    } catch (error) {
      console.error("[RpcAccountStrategy] Failed to query chain:", error);
      return [];
    }
  }

  /**
   * Determine wallet type for salt calculation
   * Only EthWallet and Secp256K1 are supported for salt calculation currently
   */
  private getWalletTypeForSaltCalculation(authenticator: string): "EthWallet" | "Secp256K1" {
    // JWT format: "aud.sub" - treat as Secp256K1 for salt calculation
    if (authenticator.includes(".") && !authenticator.startsWith("0x")) {
      return "Secp256K1";
    }

    // EthWallet format: 0x-prefixed or 40-character hex
    if (authenticator.startsWith("0x") || /^[0-9a-fA-F]{40}$/i.test(authenticator)) {
      return "EthWallet";
    }

    // Default to Secp256K1 for all other formats (pubkeys, passkeys, etc.)
    return "Secp256K1";
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
        console.log("[RpcAccountStrategy] No authenticator IDs found");
        return [];
      }

      console.log(`[RpcAccountStrategy] Found ${idsResponse.length} authenticator ID(s): ${idsResponse.join(", ")}`);

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

            // Extract authenticator string and type
            if (authenticatorData.EthWallet) {
              authenticatorString = authenticatorData.EthWallet.address;
              authenticatorType = "EthWallet";
            } else if (authenticatorData.Secp256K1) {
              authenticatorString = authenticatorData.Secp256K1.pubkey;
              authenticatorType = "Secp256K1";
            } else if (authenticatorData.JWT) {
              authenticatorString = authenticatorData.JWT.aud_and_sub;
              authenticatorType = "JWT";
            } else if (authenticatorData.Passkey) {
              authenticatorString = authenticatorData.Passkey.credential_id;
              authenticatorType = "Passkey";
            } else {
              console.log(`[RpcAccountStrategy] Unknown authenticator format for ID ${id}:`, authenticatorData);
              return null;
            }

            return {
              id: `${contractAddress}-${id}`,
              type: authenticatorType,
              authenticator: authenticatorString,
              authenticatorIndex: id,
            };
          } catch (error: any) {
            console.log(`[RpcAccountStrategy] Failed to query authenticator ${id}: ${error.message}`);
            return null;
          }
        })
      );

      // Filter out null results
      const validAuthenticators = authenticators.filter((auth): auth is NonNullable<typeof auth> => auth !== null);

      console.log(`[RpcAccountStrategy] Successfully queried ${validAuthenticators.length} authenticator(s)`);
      return validAuthenticators;
    } catch (error: any) {
      // If the query fails, the contract likely doesn't exist
      // This is normal for addresses that haven't been instantiated yet
      console.log(`[RpcAccountStrategy] Failed to query authenticators: ${error.message || error}`);
      return [];
    }
  }
}
