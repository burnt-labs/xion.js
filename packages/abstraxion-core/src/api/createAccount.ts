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
 * Simple sleep function to prevent account sequence errors
 * Temporary replacement for waitForTxConfirmation to reduce latency
 * Memory leak safe: timeout is properly tracked and cleaned up
 */
async function simpleSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      resolve();
    }, ms);

    // Ensure cleanup even if promise is abandoned
    // This is a safeguard, though in practice the timeout will complete normally
    if (typeof timeoutId === "object" && "unref" in timeoutId) {
      // In Node.js, allow the process to exit without waiting for this timeout
      (timeoutId as NodeJS.Timeout).unref();
    }
  });
}

/**
 * Create account via AA API v2 for EthWallet type
 *
 * Flow: normalize address → calculate salt/address → sign address → create via API
 *
 * @param signMessageFn - Signs hex messages (with 0x prefix)
 * @param rpcUrl - Optional RPC URL for transaction confirmation
 * @see @burnt-labs/signers/src/crypto/README.md for salt calculation details
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

  // Normalize address (matches AA API normalization)
  const normalizedAddress = normalizeEthereumAddress(ethereumAddress);

  // Calculate smart account address via CREATE2
  const salt = calculateSalt(AUTHENTICATOR_TYPE.EthWallet, normalizedAddress);
  const calculatedAddress = calculateSmartAccountAddress({
    checksum,
    creator: feeGranter,
    salt,
    prefix: addressPrefix,
  });

  // Sign the calculated address (hex format with 0x prefix)
  const addressHex = utf8ToHexWithPrefix(calculatedAddress);
  const signature = await signMessageFn(addressHex);

  // Create account via v2 API
  const result = await createEthWalletAccountV2(aaApiUrl, {
    address: normalizedAddress,
    signature: signature,
  });

  // Short sleep to prevent sequence errors
  if (rpcUrl && result.transaction_hash) {
    // try {
    //   await waitForTxConfirmation(rpcUrl, result.transaction_hash);
    // } catch (error) {
    //   // Confirmation failed - continue anyway
    // }
    //TODO: test more thoroughly if account sequence errors can be avoided without this sleep
    await simpleSleep(500); // 500ms sleep instead of polling
  }

  return result;
}

/**
 * Create account via AA API v2 for Secp256K1 type (Cosmos wallets)
 *
 * Flow: normalize pubkey → calculate salt/address → sign address → create via API
 *
 * @param signMessageFn - Signs hex messages (with 0x prefix)
 * @param rpcUrl - Optional RPC URL for transaction confirmation
 * @see @burnt-labs/signers/src/crypto/README.md for salt calculation details
 */
export async function createSecp256k1Account(
  aaApiUrl: string,
  pubkey: string,
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

  // Normalize pubkey to base64 (matches AA API normalization)
  const normalizedPubkey = normalizeSecp256k1PublicKey(pubkey);

  // Calculate smart account address via CREATE2
  // CRITICAL: Salt must be calculated from the SAME format that AA-API will use
  // Both xion.js and AA-API calculate: SHA256(UTF8(base64_pubkey_string))
  const salt = calculateSalt(AUTHENTICATOR_TYPE.Secp256K1, normalizedPubkey);
  const calculatedAddress = calculateSmartAccountAddress({
    checksum,
    creator: feeGranter,
    salt,
    prefix: addressPrefix,
  });

  // Sign the calculated address (hex format with 0x prefix)
  const addressHex = utf8ToHexWithPrefix(calculatedAddress);
  const signatureResponse = await signMessageFn(addressHex);

  // Format signature and pubkey for AA API v2
  const formattedSignature = formatSecp256k1Signature(signatureResponse);
  // Send normalized base64 pubkey to AA-API (not converted to hex)
  // AA-API will calculate salt from this same base64 string, ensuring address match
  const formattedPubkey = normalizedPubkey;

  // Create account via v2 API
  const result = await createSecp256k1AccountV2(aaApiUrl, {
    pubKey: formattedPubkey,
    signature: formattedSignature,
  });

  // Short sleep to prevent sequence errors
  if (rpcUrl && result.transaction_hash) {
    // try {
    //   await waitForTxConfirmation(rpcUrl, result.transaction_hash);
    // } catch (error) {
    //   // Confirmation failed - continue anyway
    // }
    await simpleSleep(250); // 250ms sleep instead of polling
  }

  return result;
}
