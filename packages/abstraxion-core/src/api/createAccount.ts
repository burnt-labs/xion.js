/**
 * Account creation utilities
 * High-level functions for creating smart accounts via AA API v2
 *
 * The smart-account address comes from the AA API
 * (GET /api/v2/account/address/...). The SDK signs exactly that address and
 * posts the existing create request. No local address derivation and no
 * contract checksum are involved.
 */

import {
  AUTHENTICATOR_TYPE,
  formatSecp256k1Signature,
  utf8ToHexWithPrefix,
} from "@burnt-labs/signers";
import { createEthWalletAccountV2, createSecp256k1AccountV2 } from "./client";
import {
  normalizeAAApiIdentifier,
  resolveAAApiAccountAddress,
  type AAApiAccountCreationOptions,
} from "./addressSource";
import type { CreateAccountResponse } from "@burnt-labs/signers";

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

interface ResolvedCreationOptions {
  addressPrefix: string;
  rpcUrl?: string;
}

/**
 * Accept either the options object or the deprecated positional arguments.
 * The positional checksum is ignored; it never selects the address.
 */
function resolveCreationOptions(
  optionsOrChecksum: AAApiAccountCreationOptions | string,
  feeGranter: string | undefined,
  addressPrefix: string | undefined,
  rpcUrl: string | undefined,
): ResolvedCreationOptions {
  if (typeof optionsOrChecksum === "object" && optionsOrChecksum !== null) {
    if (optionsOrChecksum.addressSource !== "aa-api") {
      throw new Error(
        `Unsupported addressSource "${String(optionsOrChecksum.addressSource)}"; expected "aa-api"`,
      );
    }
    if (
      typeof optionsOrChecksum.addressPrefix !== "string" ||
      optionsOrChecksum.addressPrefix.length === 0
    ) {
      throw new Error("addressPrefix is required to create an account");
    }
    return {
      addressPrefix: optionsOrChecksum.addressPrefix,
      rpcUrl: optionsOrChecksum.rpcUrl,
    };
  }

  // Deprecated positional form: (checksum, feeGranter, addressPrefix, rpcUrl?)
  if (typeof feeGranter !== "string" || typeof addressPrefix !== "string") {
    throw new Error(
      "feeGranter and addressPrefix are required when using the positional createAccount signature",
    );
  }
  // Validate feeGranter starts with addressPrefix
  if (!feeGranter.startsWith(addressPrefix)) {
    throw new Error(
      `feeGranter address "${feeGranter}" must start with addressPrefix "${addressPrefix}"`,
    );
  }
  return { addressPrefix, rpcUrl };
}

/**
 * Refuse to bind to an account other than the one that was signed.
 */
function assertCreatedAddress(
  result: CreateAccountResponse,
  signedAddress: string,
): void {
  if (result?.account_address !== signedAddress) {
    throw new Error(
      `AA API created account "${String(result?.account_address)}" but the signed address was "${signedAddress}"`,
    );
  }
}

/**
 * Create account via AA API v2 for EthWallet type
 *
 * Flow: normalize address → GET the address from the AA API → sign that
 * address → create via API
 *
 * @param signMessageFn - Signs hex messages (with 0x prefix)
 * @param options - `{ addressSource: "aa-api", addressPrefix, rpcUrl? }`
 */
export function createEthWalletAccount(
  aaApiUrl: string,
  ethereumAddress: string,
  signMessageFn: (hexMessage: string) => Promise<string>,
  options: AAApiAccountCreationOptions,
): Promise<CreateAccountResponse>;
/**
 * @deprecated Use the `options` overload. `checksum` is ignored: the address
 * always comes from the AA API.
 */
export function createEthWalletAccount(
  aaApiUrl: string,
  ethereumAddress: string,
  signMessageFn: (hexMessage: string) => Promise<string>,
  checksum: string,
  feeGranter: string,
  addressPrefix: string,
  rpcUrl?: string,
): Promise<CreateAccountResponse>;
export async function createEthWalletAccount(
  aaApiUrl: string,
  ethereumAddress: string,
  signMessageFn: (hexMessage: string) => Promise<string>,
  optionsOrChecksum: AAApiAccountCreationOptions | string,
  feeGranter?: string,
  addressPrefix?: string,
  rpcUrl?: string,
): Promise<CreateAccountResponse> {
  const options = resolveCreationOptions(
    optionsOrChecksum,
    feeGranter,
    addressPrefix,
    rpcUrl,
  );

  // Normalize address (matches AA API normalization) for the POST; the lookup
  // normalizes the raw input itself
  const normalizedAddress = normalizeAAApiIdentifier(
    AUTHENTICATOR_TYPE.EthWallet,
    ethereumAddress,
  );

  // Ask the AA API which smart-account address it will create
  const accountAddress = await resolveAAApiAccountAddress({
    aaApiUrl,
    authenticatorType: AUTHENTICATOR_TYPE.EthWallet,
    identifier: ethereumAddress,
    addressPrefix: options.addressPrefix,
  });

  // Sign exactly that address (hex format with 0x prefix)
  const signature = await signMessageFn(utf8ToHexWithPrefix(accountAddress));

  // Create account via v2 API
  const result = await createEthWalletAccountV2(aaApiUrl, {
    address: normalizedAddress,
    signature: signature,
  });

  assertCreatedAddress(result, accountAddress);

  // Short sleep to prevent sequence errors
  if (options.rpcUrl && result.transaction_hash) {
    await simpleSleep(500);
  }

  return result;
}

/**
 * Create account via AA API v2 for Secp256K1 type (Cosmos wallets)
 *
 * Flow: normalize pubkey → GET the address from the AA API → sign that
 * address → create via API
 *
 * @param signMessageFn - Signs hex messages (with 0x prefix)
 * @param options - `{ addressSource: "aa-api", addressPrefix, rpcUrl? }`
 */
export function createSecp256k1Account(
  aaApiUrl: string,
  pubkey: string,
  signMessageFn: (hexMessage: string) => Promise<string>,
  options: AAApiAccountCreationOptions,
): Promise<CreateAccountResponse>;
/**
 * @deprecated Use the `options` overload. `checksum` is ignored: the address
 * always comes from the AA API.
 */
export function createSecp256k1Account(
  aaApiUrl: string,
  pubkey: string,
  signMessageFn: (hexMessage: string) => Promise<string>,
  checksum: string,
  feeGranter: string,
  addressPrefix: string,
  rpcUrl?: string,
): Promise<CreateAccountResponse>;
export async function createSecp256k1Account(
  aaApiUrl: string,
  pubkey: string,
  signMessageFn: (hexMessage: string) => Promise<string>,
  optionsOrChecksum: AAApiAccountCreationOptions | string,
  feeGranter?: string,
  addressPrefix?: string,
  rpcUrl?: string,
): Promise<CreateAccountResponse> {
  const options = resolveCreationOptions(
    optionsOrChecksum,
    feeGranter,
    addressPrefix,
    rpcUrl,
  );

  // Normalize pubkey to base64 (matches AA API normalization) for the POST.
  // The lookup normalizes the raw pubkey itself; the normalizer is idempotent.
  const normalizedPubkey = normalizeAAApiIdentifier(
    AUTHENTICATOR_TYPE.Secp256K1,
    pubkey,
  );

  // Ask the AA API which smart-account address it will create
  const accountAddress = await resolveAAApiAccountAddress({
    aaApiUrl,
    authenticatorType: AUTHENTICATOR_TYPE.Secp256K1,
    identifier: pubkey,
    addressPrefix: options.addressPrefix,
  });

  // Sign exactly that address (hex format with 0x prefix)
  const signatureResponse = await signMessageFn(
    utf8ToHexWithPrefix(accountAddress),
  );

  // Format signature for AA API v2
  const formattedSignature = formatSecp256k1Signature(signatureResponse);

  // Create account via v2 API with the same normalized base64 pubkey
  const result = await createSecp256k1AccountV2(aaApiUrl, {
    pubKey: normalizedPubkey,
    signature: formattedSignature,
  });

  assertCreatedAddress(result, accountAddress);

  // Short sleep to prevent sequence errors
  if (options.rpcUrl && result.transaction_hash) {
    await simpleSleep(250);
  }

  return result;
}
