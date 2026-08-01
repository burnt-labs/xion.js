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
import {
  checkAddressAlignment,
  diagnoseCreateFailure,
} from "./createAccountDiagnostics";
import type { CreateAccountResponse } from "@burnt-labs/signers";

/**
 * What the AA API registered, plus the address the client derived and signed.
 *
 * `derived_address` is exposed so callers can assert the two agree without
 * re-implementing CREATE2 derivation. It normally equals `account_address`;
 * see {@link checkAddressAlignment} for when it legitimately does not.
 */
export type CreateAccountResult = CreateAccountResponse & {
  /** Address the client derived locally and signed. */
  derived_address: string;
};

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
 * Flow: normalize address → derive address locally (CREATE2) → sign address →
 * create via API. On failure, {@link diagnoseCreateFailure} probes the API to
 * explain the rejection.
 *
 * `codeId` is passed through verbatim — the AA API validates it against the
 * chain's `allowed_code_ids` (fail-closed), so the client does not pre-check
 * it. Note that a requested `codeId` must correspond to the `checksum` passed
 * here, or the local derivation will not match what the API verifies.
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
  codeId?: string,
): Promise<CreateAccountResult> {
  // Validate feeGranter starts with addressPrefix
  if (!feeGranter.startsWith(addressPrefix)) {
    throw new Error(
      `feeGranter address "${feeGranter}" must start with addressPrefix "${addressPrefix}"`,
    );
  }

  // Normalize address (matches AA API normalization)
  const normalizedAddress = normalizeEthereumAddress(ethereumAddress);

  // Calculate smart account address via CREATE2 — no network round-trip, and
  // the client only ever signs a value it derived itself.
  const salt = calculateSalt(AUTHENTICATOR_TYPE.EthWallet, normalizedAddress);
  const calculatedAddress = calculateSmartAccountAddress({
    checksum,
    creator: feeGranter,
    salt,
    prefix: addressPrefix,
  });

  // Sign the derived address (hex format with 0x prefix)
  const addressHex = utf8ToHexWithPrefix(calculatedAddress);
  const signature = await signMessageFn(addressHex);

  // Create account via v2 API
  let result: CreateAccountResponse;
  try {
    result = await createEthWalletAccountV2(aaApiUrl, {
      address: normalizedAddress,
      signature: signature,
      // Report what we derived so the API can reject a config mismatch with a
      // specific error instead of an opaque "Invalid signature".
      checksum,
      expected_address: calculatedAddress,
      ...(codeId ? { code_id: codeId } : {}),
    });
  } catch (error) {
    // Enrich the failure with the API's own derivation before surfacing it.
    throw await diagnoseCreateFailure({
      aaApiUrl,
      authenticatorType: AUTHENTICATOR_TYPE.EthWallet,
      identifier: normalizedAddress,
      signedAddress: calculatedAddress,
      localChecksum: checksum,
      requestedCodeId: codeId,
      cause: error,
    });
  }

  // The API is authoritative on what got registered — confirm it matches what
  // we signed, and surface the divergence if not.
  checkAddressAlignment(calculatedAddress, result.account_address, codeId);

  // Short sleep to prevent sequence errors
  if (rpcUrl && result.transaction_hash) {
    await simpleSleep(500);
  }

  return { ...result, derived_address: calculatedAddress };
}

/**
 * Create account via AA API v2 for Secp256K1 type (Cosmos wallets)
 *
 * Flow: normalize pubkey → derive salt/address locally → sign address →
 * create via API. On failure, {@link diagnoseCreateFailure} probes the API to
 * explain the rejection.
 *
 * `codeId` is passed through verbatim — the AA API validates it against the
 * chain's `allowed_code_ids` (fail-closed), so the client does not pre-check
 * it. Note that a requested `codeId` must correspond to the `checksum` passed
 * here, or the local derivation will not match what the API verifies.
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
  codeId?: string,
): Promise<CreateAccountResult> {
  // Validate feeGranter starts with addressPrefix
  if (!feeGranter.startsWith(addressPrefix)) {
    throw new Error(
      `feeGranter address "${feeGranter}" must start with addressPrefix "${addressPrefix}"`,
    );
  }

  // Normalize pubkey to base64 (matches AA API normalization)
  const normalizedPubkey = normalizeSecp256k1PublicKey(pubkey);

  // Calculate smart account address via CREATE2 — no network round-trip, and
  // the client only ever signs a value it derived itself.
  // CRITICAL: Salt must be calculated from the SAME format that AA-API will use
  // Both xion.js and AA-API calculate: SHA256(UTF8(base64_pubkey_string))
  const salt = calculateSalt(AUTHENTICATOR_TYPE.Secp256K1, normalizedPubkey);
  const calculatedAddress = calculateSmartAccountAddress({
    checksum,
    creator: feeGranter,
    salt,
    prefix: addressPrefix,
  });

  // Sign the derived address (hex format with 0x prefix)
  const addressHex = utf8ToHexWithPrefix(calculatedAddress);
  const signatureResponse = await signMessageFn(addressHex);

  // Format signature and pubkey for AA API v2
  const formattedSignature = formatSecp256k1Signature(signatureResponse);
  // Send normalized base64 pubkey to AA-API (not converted to hex)
  // AA-API will calculate salt from this same base64 string, ensuring address match
  const formattedPubkey = normalizedPubkey;

  // Create account via v2 API
  let result: CreateAccountResponse;
  try {
    result = await createSecp256k1AccountV2(aaApiUrl, {
      pubKey: formattedPubkey,
      signature: formattedSignature,
      // Report what we derived so the API can reject a config mismatch with a
      // specific error instead of an opaque "Invalid signature".
      checksum,
      expected_address: calculatedAddress,
      ...(codeId ? { code_id: codeId } : {}),
    });
  } catch (error) {
    // Enrich the failure with the API's own derivation before surfacing it.
    throw await diagnoseCreateFailure({
      aaApiUrl,
      authenticatorType: AUTHENTICATOR_TYPE.Secp256K1,
      identifier: normalizedPubkey,
      signedAddress: calculatedAddress,
      localChecksum: checksum,
      requestedCodeId: codeId,
      cause: error,
    });
  }

  // The API is authoritative on what got registered — confirm it matches what
  // we signed, and surface the divergence if not.
  checkAddressAlignment(calculatedAddress, result.account_address, codeId);

  // Short sleep to prevent sequence errors
  if (rpcUrl && result.transaction_hash) {
    await simpleSleep(250);
  }

  return { ...result, derived_address: calculatedAddress };
}
