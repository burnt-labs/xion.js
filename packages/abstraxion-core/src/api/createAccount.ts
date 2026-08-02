/**
 * Account creation utilities
 * High-level functions for creating smart accounts via AA API v2
 * Uses local address calculation via @burnt-labs/signers crypto utilities
 */

import { fromBase64 } from "@cosmjs/encoding";
import {
  calculateSalt,
  calculateSmartAccountAddress,
  AUTHENTICATOR_TYPE,
  convertToStandardBase64,
  formatSecp256k1Signature,
  normalizeSecp256k1PublicKey,
  normalizeEthereumAddress,
  normalizeJWTIdentifier,
  utf8ToHexWithPrefix,
} from "@burnt-labs/signers";
import {
  createEthWalletAccountV2,
  createJWTAccountV2,
  createSecp256k1AccountV2,
} from "./client";
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
  // we signed, and surface the divergence if not. The boolean is for callers
  // that want to branch on alignment; here the warning is the whole point.
  void checkAddressAlignment(calculatedAddress, result.account_address, codeId);

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
  // we signed, and surface the divergence if not. The boolean is for callers
  // that want to branch on alignment; here the warning is the whole point.
  void checkAddressAlignment(calculatedAddress, result.account_address, codeId);

  // Short sleep to prevent sequence errors
  if (rpcUrl && result.transaction_hash) {
    await simpleSleep(250);
  }

  return { ...result, derived_address: calculatedAddress };
}

/**
 * Read the `aud`/`sub` claims out of a JWT.
 *
 * Decoding by hand rather than with `jose`: this module is reachable from
 * React Native, and jose's Node build reaches for `node:buffer`, which Metro
 * cannot resolve — importing it here breaks the RN bundle outright. Reading
 * two claims does not justify that. This is deliberately NOT verification;
 * the AA API and the account contract verify the token. The claims are used
 * only to reproduce the API's own CREATE2 identifier, so a forged one buys
 * nothing beyond a derivation that will not match.
 */
function decodeJwtClaims(jwt: string): { aud?: string | string[]; sub?: string } {
  const segments = jwt.split(".");
  if (segments.length !== 3) {
    throw new Error("session_jwt is not a well-formed JWT");
  }
  try {
    const json = new TextDecoder().decode(
      fromBase64(convertToStandardBase64(segments[1])),
    );
    return JSON.parse(json);
  } catch {
    throw new Error("session_jwt payload could not be decoded");
  }
}

/**
 * Local CREATE2 inputs for the JWT path.
 *
 * Supplying these is what opts a caller in to the API-side derivation guard —
 * see {@link createJWTAccount} for why that is a choice rather than a default.
 */
export interface JWTDerivationConfig {
  /** Contract checksum (code data_hash) used for the local derivation. */
  checksum: string;
  /** Fee granter address — the instantiate2 creator. */
  feeGranter: string;
  /** Address prefix (e.g. "xion"). */
  addressPrefix: string;
}

export interface CreateJWTAccountOptions {
  /**
   * Derivation inputs. Omit if the caller has no local derivation of its own;
   * the AA API then derives unaided, exactly as before.
   */
  derivation?: JWTDerivationConfig;
  /**
   * Wasm code id to register at. Forwarded verbatim; the AA API validates it
   * against the chain's `allowed_code_ids` (fail-closed). Must correspond to
   * `derivation.checksum` when both are given.
   */
  codeId?: string;
  /** Optional RPC URL — presence enables the post-create settle delay. */
  rpcUrl?: string;
}

/**
 * What the AA API registered for a JWT, plus the client's own derivation when
 * it had one. `derived_address` is absent when no {@link JWTDerivationConfig}
 * was supplied — there is nothing to derive from.
 */
export type CreateJWTAccountResult = CreateAccountResponse & {
  derived_address?: string;
};

/**
 * Create account via AA API v2 for JWT type (Stytch social login)
 *
 * Flow: decode `aud`/`sub` → derive address locally (CREATE2) → create via
 * API. Unlike the wallet paths there is no address signature: the JWT itself
 * is the credential, so nothing here signs the derived address.
 *
 * That asymmetry is why the derivation claims (`checksum`, `expected_address`)
 * are opt-in rather than always sent. For eth/secp a derivation drift is
 * already fatal — the signature is over an address the API does not recognise —
 * so claiming the derivation only converts an opaque "Invalid signature" into a
 * named one. For JWT the same drift is currently *harmless*: the API derives
 * and registers correctly on its own and the client just uses the returned
 * address. Sending the claims unconditionally would therefore turn working
 * signups into hard 400s the moment a client's checksum went stale — on the
 * dominant login path. So the claims are sent only when the caller supplies
 * `derivation`, i.e. only when it actually has a derivation whose correctness
 * it wants enforced.
 *
 * `code_id` is forwarded whenever given, with or without `derivation`.
 *
 * SECURITY: neither the session JWT nor the session token is ever placed in a
 * URL, logged, or attached to the thrown error. The failure diagnostics run
 * without the address probe for exactly this reason — see
 * {@link diagnoseCreateFailure}.
 *
 * @param sessionJwt - Stytch session JWT (carries the `aud`/`sub` claims)
 * @param sessionToken - Stytch session token
 */
export async function createJWTAccount(
  aaApiUrl: string,
  sessionJwt: string,
  sessionToken: string,
  options: CreateJWTAccountOptions = {},
): Promise<CreateJWTAccountResult> {
  const { derivation, codeId, rpcUrl } = options;

  // The identifier the AA API derives from is "<aud>.<sub>", never the raw
  // token — the token rotates, the claims do not.
  const claims = decodeJwtClaims(sessionJwt);
  // Both claims are optional on the decoded payload, so assert their presence
  // rather than casting: a missing one would otherwise derive an address from
  // the string "undefined" and surface as an opaque address mismatch. The AA
  // API rejects the same case with a 400; failing here names it earlier.
  if (claims.aud === undefined || claims.sub === undefined) {
    throw new Error(
      "session_jwt is missing the aud/sub claims required to derive the account address",
    );
  }
  const identifier = normalizeJWTIdentifier(claims.aud, claims.sub);

  let calculatedAddress: string | undefined;
  if (derivation) {
    const { checksum, feeGranter, addressPrefix } = derivation;

    // Validate feeGranter starts with addressPrefix
    if (!feeGranter.startsWith(addressPrefix)) {
      throw new Error(
        `feeGranter address "${feeGranter}" must start with addressPrefix "${addressPrefix}"`,
      );
    }

    const salt = calculateSalt(AUTHENTICATOR_TYPE.JWT, identifier);
    calculatedAddress = calculateSmartAccountAddress({
      checksum,
      creator: feeGranter,
      salt,
      prefix: addressPrefix,
    });
  }

  let result: CreateAccountResponse;
  try {
    result = await createJWTAccountV2(aaApiUrl, {
      session_jwt: sessionJwt,
      session_token: sessionToken,
      ...(derivation
        ? {
            checksum: derivation.checksum,
            expected_address: calculatedAddress,
          }
        : {}),
      ...(codeId ? { code_id: codeId } : {}),
    });
  } catch (error) {
    if (!calculatedAddress || !derivation) {
      // Nothing local to compare against, so the diagnostic would add only
      // the registration config — not worth wrapping the original error in a
      // different class for.
      throw error;
    }
    throw await diagnoseCreateFailure({
      aaApiUrl,
      authenticatorType: AUTHENTICATOR_TYPE.JWT,
      // The non-secret "<aud>.<sub>" identifier, never the token. The address
      // probe is refused for JWT regardless; this is belt and braces.
      identifier,
      signedAddress: calculatedAddress,
      localChecksum: derivation.checksum,
      requestedCodeId: codeId,
      cause: error,
    });
  }

  if (calculatedAddress) {
    void checkAddressAlignment(
      calculatedAddress,
      result.account_address,
      codeId,
    );
  }

  // Short sleep to prevent sequence errors
  if (rpcUrl && result.transaction_hash) {
    await simpleSleep(250);
  }

  return calculatedAddress
    ? { ...result, derived_address: calculatedAddress }
    : { ...result };
}
