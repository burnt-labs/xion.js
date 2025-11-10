/**
 * Grant creation logic
 * Handles creating authorization grants from smart account to session keypair
 */

import { Buffer } from "buffer";
import type {
  ConnectorConnectionResult,
  StorageStrategy,
} from "@burnt-labs/abstraxion-core";
import { AAClient, createSignerFromSigningFunction } from "@burnt-labs/signers";
import {
  AUTHENTICATOR_TYPE,
  type AuthenticatorType,
} from "@burnt-labs/signers";
import { GasPrice } from "@cosmjs/stargate";
import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { MsgExecuteContract } from "cosmjs-types/cosmwasm/wasm/v1/tx";
import {
  buildGrantMessages,
  createCompositeTreasuryStrategy,
  generateTreasuryGrants as generateTreasuryGrantMessages,
  isContractGrantConfigValid,
} from "../../index";
import type { GrantConfig } from "../types";

/**
 * Result of grant creation operation
 */
export type GrantCreationResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Parameters for grant creation
 */
export interface GrantCreationParams {
  /** Smart account address (granter) */
  smartAccountAddress: string;

  /** Connection result from connector */
  connectionResult: ConnectorConnectionResult;

  /** Session key address (grantee) */
  granteeAddress: string;

  /** Grant configuration */
  grantConfig: GrantConfig;

  /** Storage strategy for accessing stored values */
  storageStrategy: StorageStrategy;

  /** RPC URL */
  rpcUrl: string;

  /** Gas price (e.g., "0.001uxion") */
  gasPrice: string;
}

/**
 * Check if grants exist in storage for a given smart account
 * Uses StorageStrategy to support both web (localStorage) and React Native (AsyncStorage)
 *
 * @param smartAccountAddress - The smart account address to check
 * @param storageStrategy - Storage strategy for accessing stored values
 * @returns Object with grantsExist flag and stored values
 */
export async function checkStorageGrants(
  smartAccountAddress: string,
  storageStrategy: StorageStrategy,
): Promise<{
  grantsExist: boolean;
  storedGranter: string | null;
  storedTempAccount: string | null;
}> {
  const storedGranter = await storageStrategy.getItem(
    "xion-authz-granter-account",
  );
  const storedTempAccount = await storageStrategy.getItem(
    "xion-authz-temp-account",
  );

  const grantsExist =
    storedGranter === smartAccountAddress && !!storedTempAccount;

  return {
    grantsExist,
    storedGranter,
    storedTempAccount,
  };
}

/**
 * Generate grant messages from treasury contract using composite strategy
 */
async function generateTreasuryGrants(
  treasuryAddress: string,
  client: CosmWasmClient,
  granter: string,
  grantee: string,
  daodaoIndexerUrl?: string,
): Promise<any[]> {
  const treasuryStrategy = createCompositeTreasuryStrategy({
    daodao: daodaoIndexerUrl
      ? {
          indexerUrl: daodaoIndexerUrl,
        }
      : undefined,
    includeDirectQuery: true,
  });

  const threeMonthsFromNow = BigInt(
    Math.floor(
      new Date(new Date().setMonth(new Date().getMonth() + 3)).getTime() / 1000,
    ),
  );

  return generateTreasuryGrantMessages(
    treasuryAddress,
    client,
    granter,
    grantee,
    treasuryStrategy,
    threeMonthsFromNow,
  );
}

/**
 * Create grants for a connected account
 * Extracted from useGrantsFlow hook
 *
 * @param params - Grant creation parameters
 * @returns Result indicating success or failure. On success, grants are created/verified.
 *          Signing client should be created by the caller using the session keypair.
 */
export async function createGrants(
  params: GrantCreationParams,
): Promise<GrantCreationResult> {
  const {
    smartAccountAddress,
    connectionResult,
    granteeAddress,
    grantConfig,
    storageStrategy,
    rpcUrl,
    gasPrice,
  } = params;

  // Check if grants already exist
  const { grantsExist } = await checkStorageGrants(
    smartAccountAddress,
    storageStrategy,
  );

  if (grantsExist) {
    // Grants already exist - return success
    return { success: true };
  }

  const { treasury, contracts, bank, stake, feeGranter, daodaoIndexerUrl } =
    grantConfig;

  // Validate contract grant configurations
  if (contracts && contracts.length > 0) {
    const isValid = isContractGrantConfigValid(contracts, {
      id: smartAccountAddress,
    } as any);

    if (!isValid) {
      throw new Error(
        "Invalid contract grant configuration: Contract address cannot be the same as the granter account",
      );
    }
  }

  // 1. Build grant messages - query treasury contract or use manual configs
  let grantMessages: any[] = [];
  let needsDeployFeeGrant = false;

  if (treasury) {
    try {
      const queryClient = await CosmWasmClient.connect(rpcUrl);
      grantMessages = await generateTreasuryGrants(
        treasury,
        queryClient,
        smartAccountAddress,
        granteeAddress,
        daodaoIndexerUrl,
      );
      needsDeployFeeGrant = true;
    } catch (error) {
      console.warn("[orchestrator] Failed to query treasury contract:", error);
      // Fall back to manual configs
    }
  }

  // Fall back to manual grant building if treasury query failed or not configured
  if (grantMessages.length === 0) {
    const oneYearFromNow = BigInt(
      Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
    );

    grantMessages = buildGrantMessages({
      granter: smartAccountAddress,
      grantee: granteeAddress,
      expiration: oneYearFromNow,
      contracts,
      bank,
      stake,
    });

    if (grantMessages.length === 0) {
      // No grant configs found - just store granter and return success
      await storageStrategy.setItem(
        "xion-authz-granter-account",
        smartAccountAddress,
      );
      return { success: true };
    }
  }

  // 2. Create signer for the smart account using unified factory
  const authenticatorIndex = connectionResult.metadata?.authenticatorIndex ?? 0;
  const authenticatorType = connectionResult.metadata?.authenticatorType as
    | AuthenticatorType
    | undefined;

  if (!authenticatorType) {
    throw new Error(
      "Authenticator type not found in connection result metadata",
    );
  }

  // Create signer using smartAccountAddress (granter address)
  // Note: connectionResult.displayAddress is the authenticator/wallet address, NOT the smart account address
  const signer = createSignerFromSigningFunction({
    smartAccountAddress,
    authenticatorIndex,
    authenticatorType,
    signMessage: connectionResult.signMessage,
  });

  // 3. Create AAClient
  const client = await AAClient.connectWithSigner(rpcUrl, signer as any, {
    gasPrice: GasPrice.fromString(gasPrice),
  });

  // 4. Build final message batch (add deploy_fee_grant if using treasury)
  const messagesToSign = [...grantMessages];

  if (needsDeployFeeGrant && treasury) {
    const deployFeeGrantMsg = {
      deploy_fee_grant: {
        authz_granter: smartAccountAddress,
        authz_grantee: granteeAddress,
      },
    };

    messagesToSign.push({
      typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
      value: MsgExecuteContract.fromPartial({
        sender: smartAccountAddress,
        contract: treasury,
        msg: new Uint8Array(Buffer.from(JSON.stringify(deployFeeGrantMsg))),
        funds: [],
      }),
    });
  }

  // 5. Simulate transaction to get gas estimate
  let simmedGas: number;
  try {
    simmedGas = await client.simulate(
      smartAccountAddress,
      messagesToSign,
      "Create grants for abstraxion",
    );
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to simulate transaction",
    };
  }

  // Parse gas price from config
  const gasPriceMatch = gasPrice.match(/^([\d.]+)(.+)$/);
  if (!gasPriceMatch) {
    return {
      success: false,
      error: `Invalid gas price format: ${gasPrice}. Expected format: "0.001uxion"`,
    };
  }
  const gasPriceNum = parseFloat(gasPriceMatch[1]);
  const denom = gasPriceMatch[2];

  // Calculate fee with buffer
  const calculatedFee = {
    amount: [{ denom, amount: String(Math.ceil(simmedGas * gasPriceNum * 2)) }],
    gas: String(Math.ceil(simmedGas * 1.6)),
  };

  // Add fee granter if provided
  const feeToUse = feeGranter
    ? {
        ...calculatedFee,
        granter: feeGranter,
      }
    : calculatedFee;

  // 6. Sign and broadcast transaction
  try {
    const result = await client.signAndBroadcast(
      smartAccountAddress,
      messagesToSign,
      feeToUse,
      "Create grants for abstraxion",
    );

    console.log("[orchestrator] → Transaction hash:", result.transactionHash);

    // 7. Store granter address
    await storageStrategy.setItem(
      "xion-authz-granter-account",
      smartAccountAddress,
    );

    // 8. Return success - signing client should be created by caller
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to sign and broadcast transaction",
    };
  }
}
