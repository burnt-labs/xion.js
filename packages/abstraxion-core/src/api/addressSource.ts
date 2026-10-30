/**
 * AA API smart-account address source
 *
 * The account-abstraction-api owns smart-account address selection. The SDK
 * asks it for the address instead of deriving one locally, so no contract
 * checksum or derivation hash is needed on the client:
 *
 * - creation resolves the candidate with GET /api/v2/account/address/{type}/{id}
 * - discovery looks up an existing account with GET /api/v2/account/check/{type}/{id}
 *
 * Only an explicit HTTP 404 from /check means "no account". Any other failure
 * (timeout, network error, non-2xx, malformed body) is an error and must never
 * be treated as permission to create an account.
 *
 * Runtime: global fetch/AbortController and @cosmjs/encoding only, so this
 * module works in browsers, Node and React Native.
 */

import { fromBech32, toBech32 } from "@cosmjs/encoding";
import {
  AUTHENTICATOR_TYPE,
  normalizeEthereumAddress,
  normalizeSecp256k1PublicKey,
  type AuthenticatorType,
} from "@burnt-labs/signers";
import {
  AAApiAccountNotFoundError,
  checkAccountOnChain,
  getAccountAddress,
} from "./client";

/**
 * Options for creating an account whose address is chosen by the AA API.
 */
export interface AAApiAccountCreationOptions {
  addressSource: "aa-api";
  /** Bech32 prefix the returned smart-account address must use (e.g. "xion") */
  addressPrefix: string;
  /** Optional RPC URL; when set, creation waits briefly after the transaction */
  rpcUrl?: string;
}

/** Deadline for a single AA API address lookup */
export const AA_API_ADDRESS_LOOKUP_TIMEOUT_MS = 10_000;

/** Byte length of a CosmWasm instantiate2 contract address */
const SMART_ACCOUNT_ADDRESS_BYTES = 32;

interface AAApiAddressLookupArgs {
  aaApiUrl: string;
  authenticatorType: AuthenticatorType;
  identifier: string;
  addressPrefix: string;
}

type SupportedAuthenticatorType =
  | typeof AUTHENTICATOR_TYPE.EthWallet
  | typeof AUTHENTICATOR_TYPE.Secp256K1;

function assertSupportedType(
  authenticatorType: AuthenticatorType,
): asserts authenticatorType is SupportedAuthenticatorType {
  if (
    authenticatorType !== AUTHENTICATOR_TYPE.EthWallet &&
    authenticatorType !== AUTHENTICATOR_TYPE.Secp256K1
  ) {
    throw new Error(
      `AA API address lookup does not support authenticator type "${String(authenticatorType)}"`,
    );
  }
}

/**
 * Normalize an identifier the same way the AA API does. The same normalized
 * value must be used for the address lookup and for the create request.
 */
export function normalizeAAApiIdentifier(
  authenticatorType: AuthenticatorType,
  identifier: string,
): string {
  assertSupportedType(authenticatorType);
  if (typeof identifier !== "string") {
    throw new Error("AA API address lookup requires a string identifier");
  }
  return authenticatorType === AUTHENTICATOR_TYPE.EthWallet
    ? normalizeEthereumAddress(identifier)
    : normalizeSecp256k1PublicKey(identifier);
}

function assertAddressPrefix(addressPrefix: unknown): string {
  if (typeof addressPrefix !== "string" || addressPrefix.length === 0) {
    throw new Error("AA API address lookup requires a non-empty addressPrefix");
  }
  return addressPrefix;
}

/**
 * Validate a smart-account address returned by the AA API: canonical Bech32,
 * expected prefix and a 32-byte contract address.
 */
function validateSmartAccountAddress(
  address: unknown,
  addressPrefix: string,
  source: string,
): string {
  if (typeof address !== "string" || address.length === 0) {
    throw new Error(`AA API ${source} response is missing an address`);
  }

  let decoded: { prefix: string; data: Uint8Array };
  try {
    decoded = fromBech32(address);
  } catch (error) {
    throw new Error(
      `AA API ${source} returned a malformed Bech32 address "${address}": ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  if (decoded.prefix !== addressPrefix) {
    throw new Error(
      `AA API ${source} returned address "${address}" with prefix "${decoded.prefix}", expected "${addressPrefix}"`,
    );
  }

  if (decoded.data.length !== SMART_ACCOUNT_ADDRESS_BYTES) {
    throw new Error(
      `AA API ${source} returned address "${address}" of ${decoded.data.length} bytes, expected ${SMART_ACCOUNT_ADDRESS_BYTES}`,
    );
  }

  if (toBech32(addressPrefix, decoded.data) !== address) {
    throw new Error(
      `AA API ${source} returned a non-canonical address "${address}"`,
    );
  }

  return address;
}

function asRecord(value: unknown, source: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`AA API ${source} returned a malformed response body`);
  }
  return value as Record<string, unknown>;
}

/**
 * Run an AA API request with a hard deadline. The request receives an abort
 * signal; the timer is always cleared. Nothing is cached.
 */
async function withLookupDeadline<T>(
  source: string,
  request: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(
        new Error(
          `AA API ${source} lookup timed out after ${AA_API_ADDRESS_LOOKUP_TIMEOUT_MS}ms`,
        ),
      );
    }, AA_API_ADDRESS_LOOKUP_TIMEOUT_MS);
  });

  try {
    return await Promise.race([request(controller.signal), deadline]);
  } finally {
    clearTimeout(timer);
  }
}

function rethrowParseError(error: unknown, source: string): never {
  if (error instanceof SyntaxError) {
    throw new Error(`AA API ${source} returned invalid JSON: ${error.message}`);
  }
  throw error;
}

/**
 * Resolve the smart-account address the AA API will create for an identifier.
 * GET /api/v2/account/address/{ethwallet|secp256k1}/{normalized identifier}
 *
 * A 200 here is NOT proof that the account exists; use
 * {@link findAAApiAccountAddress} for discovery.
 *
 * @throws on unsupported type, HTTP error, timeout, malformed body, wrong
 *         authenticator type, or an invalid/wrong-prefix address
 */
export async function resolveAAApiAccountAddress(
  args: AAApiAddressLookupArgs,
): Promise<string> {
  const { aaApiUrl, authenticatorType } = args;
  const addressPrefix = assertAddressPrefix(args.addressPrefix);
  const identifier = normalizeAAApiIdentifier(
    authenticatorType,
    args.identifier,
  );
  const source = `/address/${authenticatorType.toLowerCase()}`;

  const body = await withLookupDeadline(source, (signal) =>
    getAccountAddress(aaApiUrl, authenticatorType, identifier, {
      signal,
    }).catch((error) => rethrowParseError(error, source)),
  );

  const record = asRecord(body, source);
  if (record.authenticator_type !== authenticatorType) {
    throw new Error(
      `AA API ${source} returned authenticator_type "${String(record.authenticator_type)}", expected "${authenticatorType}"`,
    );
  }

  return validateSmartAccountAddress(record.address, addressPrefix, source);
}

/**
 * Find an existing smart account for an identifier via the AA API.
 * GET /api/v2/account/check/{ethwallet|secp256k1}/{normalized identifier}
 *
 * Returns null only for an explicit HTTP 404. The returned address still has
 * to be verified on chain by the caller.
 *
 * @throws on unsupported type, non-404 HTTP error, timeout, malformed body,
 *         wrong authenticator type, or an invalid/wrong-prefix address
 */
export async function findAAApiAccountAddress(
  args: AAApiAddressLookupArgs,
): Promise<string | null> {
  const { aaApiUrl, authenticatorType } = args;
  const addressPrefix = assertAddressPrefix(args.addressPrefix);
  const identifier = normalizeAAApiIdentifier(
    authenticatorType,
    args.identifier,
  );
  const source = `/check/${authenticatorType.toLowerCase()}`;

  let body: unknown;
  try {
    body = await withLookupDeadline(source, (signal) =>
      checkAccountOnChain(aaApiUrl, authenticatorType, identifier, {
        signal,
      }).catch((error) => rethrowParseError(error, source)),
    );
  } catch (error) {
    if (error instanceof AAApiAccountNotFoundError) {
      return null;
    }
    throw error;
  }

  const record = asRecord(body, source);
  if (record.authenticatorType !== authenticatorType) {
    throw new Error(
      `AA API ${source} returned authenticatorType "${String(record.authenticatorType)}", expected "${authenticatorType}"`,
    );
  }
  if (
    typeof record.codeId !== "number" ||
    !Number.isInteger(record.codeId) ||
    record.codeId <= 0
  ) {
    throw new Error(
      `AA API ${source} returned an invalid codeId "${String(record.codeId)}"`,
    );
  }

  return validateSmartAccountAddress(record.address, addressPrefix, source);
}
