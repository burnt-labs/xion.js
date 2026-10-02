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
import { createEthWalletAccountV2, createSecp256k1AccountV2 } from "./client";
import type { CreateAccountResponse } from "@burnt-labs/signers";

/**
 * Checksum used to derive the smart account address that gets signed.
 *
 * Pass a function to resolve it at creation time, e.g. from the chain's
 * x/abstractaccount address_derivation_hash:
 * `() => resolveSmartAccountChecksum({ rpcUrl, chainId, pinnedChecksum })`.
 * A plain string is used as-is (callers are responsible for it matching the
 * chain).
 */
export type ChecksumInput = string | (() => Promise<string>);

async function resolveChecksumInput(checksum: ChecksumInput): Promise<string> {
  return typeof checksum === "function" ? await checksum() : checksum;
}

/**
 * The AA API may legitimately return a different, pre-existing account (e.g.
 * one registered before xion v31 under the code's own checksum), so a
 * divergence is reported rather than thrown.
 */
function warnOnAddressDivergence(
  signedAddress: string,
  result: CreateAccountResponse,
): void {
  if (result.account_address && result.account_address !== signedAddress) {
    console.warn(
      `[abstraxion] AA API returned account ${result.account_address}, but the ` +
        `locally derived address was ${signedAddress}. This is expected for an ` +
        `account registered before xion v31; otherwise check the derivation checksum.`,
    );
  }
}

/**
 * Simple sleep function to prevent account sequence errors after account
 * creation. Memory leak safe: timeout is properly tracked and cleaned up.
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
 * @param checksum - Derivation checksum, or a function resolving it (see {@link ChecksumInput})
 * @param rpcUrl - Optional RPC URL for transaction confirmation
 * @see @burnt-labs/signers/src/crypto/README.md for salt calculation details
 */
export async function createEthWalletAccount(
  aaApiUrl: string,
  ethereumAddress: string,
  signMessageFn: (hexMessage: string) => Promise<string>,
  checksum: ChecksumInput,
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
    checksum: await resolveChecksumInput(checksum),
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
  warnOnAddressDivergence(calculatedAddress, result);

  // Short sleep to prevent sequence errors
  if (rpcUrl && result.transaction_hash) {
    await simpleSleep(500);
  }

  return result;
}

/**
 * Create account via AA API v2 for Secp256K1 type (Cosmos wallets)
 *
 * Flow: normalize pubkey → calculate salt/address → sign address → create via API
 *
 * @param signMessageFn - Signs hex messages (with 0x prefix)
 * @param checksum - Derivation checksum, or a function resolving it (see {@link ChecksumInput})
 * @param rpcUrl - Optional RPC URL for transaction confirmation
 * @see @burnt-labs/signers/src/crypto/README.md for salt calculation details
 */
export async function createSecp256k1Account(
  aaApiUrl: string,
  pubkey: string,
  signMessageFn: (hexMessage: string) => Promise<string>,
  checksum: ChecksumInput,
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
    checksum: await resolveChecksumInput(checksum),
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
  warnOnAddressDivergence(calculatedAddress, result);

  // Short sleep to prevent sequence errors
  if (rpcUrl && result.transaction_hash) {
    await simpleSleep(250);
  }

  return result;
}
