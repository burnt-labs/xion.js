/**
 * Account creation utilities
 * High-level functions for creating smart accounts via AA API v2
 * Uses local address calculation via @burnt-labs/signers crypto utilities
 */

import {
  calculateSalt,
  calculateSmartAccountAddress,
  AUTHENTICATOR_TYPE,
  formatSecp256k1Signature,
  formatSecp256k1Pubkey,
  normalizeSecp256k1PublicKey,
  normalizeEthereumAddress,
  utf8ToHexWithPrefix,
} from "@burnt-labs/signers";
import { StargateClient } from "@cosmjs/stargate";
import { createEthWalletAccountV2, createSecp256k1AccountV2 } from "./client";
import type { CreateAccountResponse } from "@burnt-labs/signers";

/**
 * Wait for transaction confirmation by polling getTx
 * Graceful fallback: if transaction not found after 3 attempts, waits 2s and continues
 * If RPC connection fails, continues immediately without waiting
 * Memory leak safe: all timeouts are properly cleaned up
 */
async function waitForTxConfirmation(
  rpcUrl: string,
  txHash: string,
): Promise<void> {
  let client: StargateClient | null = null;
  const maxAttempts = 3;
  const pollIntervalMs = 1000;
  const timeoutIds: NodeJS.Timeout[] = [];
  
  // Helper to create timeout with cleanup tracking
  const createTimeout = (ms: number): Promise<void> => {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        const index = timeoutIds.indexOf(timeoutId);
        if (index > -1) {
          timeoutIds.splice(index, 1);
        }
        resolve();
      }, ms);
      timeoutIds.push(timeoutId);
    });
  };
  
  // Cleanup function to clear all pending timeouts
  const cleanupTimeouts = () => {
    timeoutIds.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    timeoutIds.length = 0;
  };
  
  try {
    client = await StargateClient.connect(rpcUrl);

    // Check immediately (attempt 1)
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await client.getTx(txHash);
        if (result) {
          cleanupTimeouts();
          return;
        }
      } catch (error) {
        // Transaction not found yet, continue to next attempt
      }

      if (attempt < maxAttempts) {
        await createTimeout(pollIntervalMs);
      }
    }
    
    // Reached max attempts without finding transaction
    await createTimeout(2000);
  } catch (error) {
    // RPC connection failed - cleanup and continue immediately
    cleanupTimeouts();
  } finally {
    cleanupTimeouts();
    if (client) {
      try {
        client.disconnect();
      } catch (error) {
        // Ignore disconnect errors
      }
    }
  }
}

/**
 * Create account via AA API v2 for EthWallet type
 * Handles the full flow: calculate address → sign → create
 *
 * Uses local address calculation (no API call needed for prepare step)
 *
 * @param signMessageFn - Function that signs hex messages (with 0x prefix).
 *                        Expects hex-encoded UTF-8 bytes for string messages (e.g., bech32 addresses).
 *                        For transaction signing, expects hex-encoded transaction bytes.
 * @param rpcUrl - Optional RPC URL. If provided, waits for transaction confirmation before returning.
 */
export async function createEthWalletAccount(
  aaApiUrl: string,
  ethereumAddress: string,
  signMessageFn: (hexMessage: string) => Promise<string>,
  checksum: string,
  feeGranter: string,
  addressPrefix: string,
  rpcUrl?: string,
): Promise<CreateAccountResponse> {
  // Validate feeGranter starts with addressPrefix
  if (!feeGranter.startsWith(addressPrefix)) {
    throw new Error(
      `feeGranter address "${feeGranter}" must start with addressPrefix "${addressPrefix}"`,
    );
  }

  // Step 1: Normalize Ethereum address (AA API normalizes before salt calculation)
  // This ensures our local salt calculation matches what AA API will calculate
  const normalizedAddress = normalizeEthereumAddress(ethereumAddress);

  // Step 2: Calculate address locally using normalized address for salt
  // Salt must be calculated from the same format (normalized lowercase) that AA API uses
  const salt = calculateSalt(AUTHENTICATOR_TYPE.EthWallet, normalizedAddress);
  const calculatedAddress = calculateSmartAccountAddress({
    checksum,
    creator: feeGranter,
    salt,
    prefix: addressPrefix,
  });

  // Step 3: Sign the calculated address
  // Convert bech32 address string to hex-encoded UTF-8 bytes (with 0x prefix)
  // signMessageFn expects hex format: hex-encoded UTF-8 bytes for strings, or hex-encoded raw bytes
  const addressHex = utf8ToHexWithPrefix(calculatedAddress);
  const signature = await signMessageFn(addressHex);

  // Step 4: Create account via v2 API
  // Use normalized address to ensure it matches AA API expectations
  const result = await createEthWalletAccountV2(aaApiUrl, {
    address: normalizedAddress,
    signature: signature,
  });

  // Step 5: Optionally wait for transaction confirmation
  if (rpcUrl && result.transaction_hash) {
    try {
      await waitForTxConfirmation(rpcUrl, result.transaction_hash);
    } catch (error) {
      // Confirmation failed - continue anyway
    }
  }

  return result;
}

/**
 * Create account via AA API v2 for Secp256K1 type (Cosmos wallets)
 * Handles the full flow: calculate address → sign → create
 *
 * Uses local address calculation (no API call needed for prepare step)
 *
 * @param signMessageFn - Function that signs hex messages (with 0x prefix).
 *                        Expects hex-encoded UTF-8 bytes for string messages (e.g., bech32 addresses).
 *                        For transaction signing, expects hex-encoded transaction bytes.
 *                        Consistent with EthWallet format for unified interface.
 * @param rpcUrl - Optional RPC URL. If provided, waits for transaction confirmation before returning.
 */
export async function createSecp256k1Account(
  aaApiUrl: string,
  pubkeyHex: string,
  signMessageFn: (hexMessage: string) => Promise<string>,
  checksum: string,
  feeGranter: string,
  addressPrefix: string,
  rpcUrl?: string,
): Promise<CreateAccountResponse> {
  // Validate feeGranter starts with addressPrefix
  if (!feeGranter.startsWith(addressPrefix)) {
    throw new Error(
      `feeGranter address "${feeGranter}" must start with addressPrefix "${addressPrefix}"`,
    );
  }

  // Step 1: Normalize pubkey to base64 (AA API normalizes before salt calculation)
  // This ensures our local salt calculation matches what AA API will calculate
  const normalizedPubkey = normalizeSecp256k1PublicKey(pubkeyHex);

  // Step 2: Calculate address locally using normalized pubkey for salt
  // Salt must be calculated from the same format (base64) that AA API uses
  const salt = calculateSalt(AUTHENTICATOR_TYPE.Secp256K1, normalizedPubkey);
  const calculatedAddress = calculateSmartAccountAddress({
    checksum,
    creator: feeGranter,
    salt,
    prefix: addressPrefix,
  });

  // Step 3: Sign the calculated address
  // Convert bech32 address string to hex-encoded UTF-8 bytes (with 0x prefix)
  // signMessageFn expects hex format: hex-encoded UTF-8 bytes for strings, or hex-encoded raw bytes
  // This ensures consistency with EthWallet format and unified interface
  const addressHex = utf8ToHexWithPrefix(calculatedAddress);
  const signatureResponse = await signMessageFn(addressHex);

  // Format signature and pubkey for AA API v2 (convert base64 to hex, ensure no 0x prefix)
  const formattedSignature = formatSecp256k1Signature(signatureResponse);
  const formattedPubkey = formatSecp256k1Pubkey(pubkeyHex);

  // Step 4: Create account via v2 API
  const result = await createSecp256k1AccountV2(aaApiUrl, {
    pubKey: formattedPubkey,
    signature: formattedSignature,
  });

  // Step 5: Optionally wait for transaction confirmation
  if (rpcUrl && result.transaction_hash) {
    try {
      await waitForTxConfirmation(rpcUrl, result.transaction_hash);
    } catch (error) {
      // Confirmation failed - continue anyway
    }
  }

  return result;
}
