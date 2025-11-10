/**
 * Account creation utilities
 * High-level functions for creating smart accounts via AA API v2
 * Uses local address calculation via @burnt-labs/signers crypto utilities
 */

import {
  calculateSalt,
  calculateSmartAccountAddress,
  AUTHENTICATOR_TYPE,
  utf8ToHex,
  formatSecp256k1Signature,
  formatSecp256k1Pubkey,
} from "@burnt-labs/signers";
import { createEthWalletAccountV2, createSecp256k1AccountV2 } from "./client";
import type { CreateAccountResponse } from "@burnt-labs/signers";

/**
 * Create account via AA API v2 for EthWallet type
 * Handles the full flow: calculate address → sign → create
 *
 * Uses local address calculation (no API call needed for prepare step)
 */
export async function createEthWalletAccount(
  aaApiUrl: string,
  ethereumAddress: string,
  signMessageFn: (hexMessage: string) => Promise<string>,
  checksum: string,
  feeGranter: string,
  addressPrefix: string,
  logPrefix: string = "[aaApi]",
): Promise<CreateAccountResponse> {
  // Validate feeGranter starts with addressPrefix
  if (!feeGranter.startsWith(addressPrefix)) {
    throw new Error(
      `feeGranter address "${feeGranter}" must start with addressPrefix "${addressPrefix}"`,
    );
  }

  console.log(
    `${logPrefix} Creating account for Ethereum address:`,
    ethereumAddress,
  );

  // Step 1: Calculate address locally (using @signers crypto utilities)
  const salt = calculateSalt(AUTHENTICATOR_TYPE.EthWallet, ethereumAddress);
  const calculatedAddress = calculateSmartAccountAddress({
    checksum,
    creator: feeGranter,
    salt,
    prefix: addressPrefix,
  });

  // Step 2: Sign the calculated address
  // Convert address to hex for personal_sign - externalSignerConnector will add 0x prefix
  const messageHex = utf8ToHex(calculatedAddress);
  const signature = await signMessageFn(messageHex);

  // Step 3: Create account via v2 API
  // Signature is already formatted by ExternalSignerConnector (validated and includes 0x prefix)
  const result = await createEthWalletAccountV2(aaApiUrl, {
    address: ethereumAddress.toLowerCase(),
    signature: signature,
  });

  console.log(
    `${logPrefix} Account created successfully:`,
    result.account_address,
    `(tx: ${result.transaction_hash})`,
  );

  return result;
}

/**
 * Create account via AA API v2 for Secp256K1 type (Cosmos wallets)
 * Handles the full flow: calculate address → sign → create
 *
 * Uses local address calculation (no API call needed for prepare step)
 */
export async function createSecp256k1Account(
  aaApiUrl: string,
  pubkeyHex: string,
  signMessageFn: (message: string) => Promise<string>,
  checksum: string,
  feeGranter: string,
  addressPrefix: string,
  logPrefix: string = "[aaApi]",
): Promise<CreateAccountResponse> {
  // Validate feeGranter starts with addressPrefix
  if (!feeGranter.startsWith(addressPrefix)) {
    throw new Error(
      `feeGranter address "${feeGranter}" must start with addressPrefix "${addressPrefix}"`,
    );
  }

  console.log(`${logPrefix} Creating account for Secp256K1 pubkey`);

  // Step 1: Calculate address locally (using @signers crypto utilities)
  const salt = calculateSalt(AUTHENTICATOR_TYPE.Secp256K1, pubkeyHex);
  const calculatedAddress = calculateSmartAccountAddress({
    checksum,
    creator: feeGranter,
    salt,
    prefix: addressPrefix,
  });

  // Step 2: Sign the calculated address
  const signatureResponse = await signMessageFn(calculatedAddress);

  // Format signature and pubkey for AA API v2 (convert base64 to hex, ensure no 0x prefix)
  const formattedSignature = formatSecp256k1Signature(signatureResponse);
  const formattedPubkey = formatSecp256k1Pubkey(pubkeyHex);

  // Step 3: Create account via v2 API
  const result = await createSecp256k1AccountV2(aaApiUrl, {
    pubkey: formattedPubkey,
    signature: formattedSignature,
  });

  console.log(
    `${logPrefix} Account created successfully:`,
    result.account_address,
    `(tx: ${result.transaction_hash})`,
  );

  return result;
}
