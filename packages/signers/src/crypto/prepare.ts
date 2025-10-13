/**
 * Signature preparation utilities
 * Extracted from AA API prepare.ts
 *
 * These functions replicate the AA API /prepare endpoint logic
 * for use in environments where calling the API is not desired
 */

import { calculateSalt } from "./salt";
import { predictSmartAccountAddress } from "./address";

export interface PrepareConfig {
  /** Contract checksum as hex string */
  checksum: string;
  /** Fee granter address (creator) */
  feeGranter: string;
  /** Address prefix (e.g., "xion") */
  addressPrefix: string;
}

export interface PrepareResult {
  /** The message that should be signed by the user */
  messageToSign: string;
  /** The predicted smart account address */
  predictedAddress: string;
  /** The salt used for address calculation (hex) */
  salt: string;
  /** Metadata for the create request */
  metadata: {
    action: string;
    wallet_type: string;
    address?: string;
    pubkey?: string;
    timestamp: number;
  };
}

/**
 * Prepare signature message for EthWallet authenticator
 *
 * This replicates the AA API /prepare endpoint logic locally
 *
 * @param address - Ethereum address (with or without 0x prefix)
 * @param config - Configuration for preparation
 * @returns Preparation result with message to sign
 */
export function prepareEthWalletSignature(
  address: string,
  config: PrepareConfig,
): PrepareResult {
  // Calculate salt
  const salt = calculateSalt("EthWallet", address);

  // Predict account address
  const predictedAddress = predictSmartAccountAddress({
    checksum: config.checksum,
    creator: config.feeGranter,
    salt,
    prefix: config.addressPrefix,
  });

  // The message to sign is the predicted smart account address
  const messageToSign = predictedAddress;

  // Build metadata
  const metadata = {
    action: "create_abstraxion_account",
    wallet_type: "EthWallet",
    address,
    timestamp: Date.now(),
  };

  return {
    messageToSign,
    predictedAddress,
    salt,
    metadata,
  };
}

/**
 * Prepare signature message for Secp256k1 authenticator
 *
 * This replicates the AA API /prepare endpoint logic locally
 *
 * @param pubkey - Secp256k1 public key as hex string
 * @param config - Configuration for preparation
 * @returns Preparation result with message to sign
 */
export function prepareSecp256k1Signature(
  pubkey: string,
  config: PrepareConfig,
): PrepareResult {
  // Calculate salt
  const salt = calculateSalt("Secp256K1", pubkey);

  // Predict account address
  const predictedAddress = predictSmartAccountAddress({
    checksum: config.checksum,
    creator: config.feeGranter,
    salt,
    prefix: config.addressPrefix,
  });

  // The message to sign is the predicted smart account address
  const messageToSign = predictedAddress;

  // Build metadata
  const metadata = {
    action: "create_abstraxion_account",
    wallet_type: "Secp256K1",
    pubkey,
    timestamp: Date.now(),
  };

  return {
    messageToSign,
    predictedAddress,
    salt,
    metadata,
  };
}

/**
 * Prepare signature message based on wallet type
 *
 * @param walletType - Type of wallet authenticator
 * @param credential - Address (for EthWallet) or pubkey (for Secp256K1)
 * @param config - Configuration for preparation
 * @returns Preparation result with message to sign
 */
export function prepareSignatureMessage(
  walletType: "EthWallet" | "Secp256K1",
  credential: string,
  config: PrepareConfig,
): PrepareResult {
  if (walletType === "EthWallet") {
    return prepareEthWalletSignature(credential, config);
  } else {
    return prepareSecp256k1Signature(credential, config);
  }
}
