/**
 * Account-creation failure diagnostics
 *
 * Account creation signs a CREATE2-derived address, so the client and the AA
 * API must derive the *same* address from the same inputs (checksum, fee
 * granter, address prefix, salt). When they diverge the API rejects the
 * signature and the raw error is opaque — "Invalid signature" says nothing
 * about which input drifted.
 *
 * Rather than pay a round-trip on every creation to pre-align, the client
 * derives locally (free, and it never signs a value the network handed it)
 * and only reaches for the API's own answers *after* a failure, purely to
 * explain it. Everything here is best-effort: a diagnostic that itself fails
 * must never mask the original error.
 */

import { getAccountAddress, getRegistrationConfig } from "./client";
import type {
  AuthenticatorType,
  RegistrationConfigResponse,
} from "@burnt-labs/signers";

/**
 * Thrown when the AA API rejects account creation. Carries the original error
 * as `cause` and, when the diagnostic probes succeeded, the concrete
 * divergence that explains the rejection.
 */
export class AccountCreationError extends Error {
  readonly name = "AccountCreationError";
  /** Address the client derived locally and signed. */
  readonly signedAddress: string;
  /** Address the AA API derives for the same identifier; null if unreachable. */
  readonly apiAddress: string | null;
  /** Registration options reported by the AA API; null if unreachable. */
  readonly registrationConfig: RegistrationConfigResponse | null;

  constructor(
    message: string,
    options: {
      cause: unknown;
      signedAddress: string;
      apiAddress: string | null;
      registrationConfig: RegistrationConfigResponse | null;
    },
  ) {
    super(message, { cause: options.cause });
    this.signedAddress = options.signedAddress;
    this.apiAddress = options.apiAddress;
    this.registrationConfig = options.registrationConfig;
  }
}

/**
 * Cross-check the address the API registered against the one we derived and
 * signed. They should agree; a divergence has exactly two plausible causes,
 * and only one of them is a bug — so this warns rather than throws.
 *
 * The benign case: the API found a pre-existing account for this identifier
 * registered under an older code id, whose address derives from that code's
 * checksum. Returning it is correct and the user's account is intact —
 * throwing here would break a working login over a cosmetic mismatch.
 *
 * The bug case: client config drifted and the API is running a build that
 * ignores `expected_address`, so nothing rejected the request up front.
 *
 * @returns true when the addresses agree
 */
export function checkAddressAlignment(
  derivedAddress: string,
  registeredAddress: string,
  requestedCodeId?: string,
): boolean {
  if (derivedAddress === registeredAddress) {
    return true;
  }

  console.warn(
    `[createAccount] Registered address ${registeredAddress} differs from the ` +
      `locally derived ${derivedAddress}${
        requestedCodeId ? ` (requested code_id ${requestedCodeId})` : ""
      }. Expected when an account already exists under a different code id — ` +
      `otherwise the client's checksum/feeGranter/addressPrefix config is ` +
      `stale and the AA API did not reject it (pre-'expected_address' build).`,
  );
  return false;
}

interface DiagnoseParams {
  aaApiUrl: string;
  authenticatorType: AuthenticatorType;
  /** Normalized identifier (eth address / base64 pubkey) sent to the API. */
  identifier: string;
  /** The locally derived address that was signed. */
  signedAddress: string;
  /** Checksum the local derivation used. */
  localChecksum: string;
  /** Code id the caller requested, if any. */
  requestedCodeId?: string;
  /** The error the create call actually threw. */
  cause: unknown;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Probe the AA API for the state that explains a creation failure and build
 * the {@link AccountCreationError} carrying it.
 *
 * Returns the error rather than throwing it so callers `throw await
 * diagnoseCreateFailure(...)` — which keeps TypeScript's definite-assignment
 * analysis working across the try/catch. Probes run concurrently and never
 * reject; an unreachable endpoint just yields a thinner report.
 */
export async function diagnoseCreateFailure(
  params: DiagnoseParams,
): Promise<AccountCreationError> {
  const {
    aaApiUrl,
    authenticatorType,
    identifier,
    signedAddress,
    localChecksum,
    requestedCodeId,
    cause,
  } = params;

  const [addressProbe, configProbe] = await Promise.allSettled([
    getAccountAddress(aaApiUrl, authenticatorType, identifier, requestedCodeId),
    getRegistrationConfig(aaApiUrl),
  ]);

  const apiAddress =
    addressProbe.status === "fulfilled"
      ? (addressProbe.value?.address ?? null)
      : null;
  const registrationConfig =
    configProbe.status === "fulfilled" ? (configProbe.value ?? null) : null;

  const lines = [
    `Account creation failed: ${errorMessage(cause)}`,
    `  signed address (local derivation): ${signedAddress}`,
    `  local checksum:                    ${localChecksum}`,
  ];

  if (requestedCodeId) {
    lines.push(`  requested code_id:                 ${requestedCodeId}`);
  }

  if (apiAddress === null) {
    lines.push(
      `  AA API address:                    <unavailable: ${errorMessage(
        addressProbe.status === "rejected" ? addressProbe.reason : "no address",
      )}>`,
    );
  } else {
    lines.push(`  AA API address:                    ${apiAddress}`);
  }

  if (registrationConfig) {
    const { default_code_id, allowed_code_ids, checksum } = registrationConfig;
    lines.push(
      `  AA API default code_id:            ${default_code_id}`,
      `  AA API allowed code_ids:           ${
        allowed_code_ids
          ? allowed_code_ids.join(", ")
          : "<chain query unavailable>"
      }`,
      `  AA API checksum (default code_id): ${checksum ?? "<chain query unavailable>"}`,
    );
  }

  // Rank the explanations: the most specific one the probes can support wins.
  if (
    requestedCodeId &&
    registrationConfig?.allowed_code_ids &&
    !registrationConfig.allowed_code_ids.includes(requestedCodeId)
  ) {
    lines.push(
      "",
      `Diagnosis: requested code_id "${requestedCodeId}" is not in the chain's ` +
        `allowed_code_ids. The dashboard proposed a code id the chain does not ` +
        `permit — pick one of the allowed values above.`,
    );
  } else if (apiAddress !== null && apiAddress !== signedAddress) {
    lines.push(
      "",
      `Diagnosis: the AA API derives a different address than the client signed, ` +
        `so the signature is over the wrong value. The client's account-creation ` +
        `config is out of sync with the API — check checksum, feeGranter, and ` +
        `addressPrefix${requestedCodeId ? ", and that the checksum matches the requested code_id" : ""}.`,
    );
  } else if (apiAddress !== null && apiAddress === signedAddress) {
    lines.push(
      "",
      `Diagnosis: address derivation is correct (client and API agree), so this ` +
        `is not a config drift. The failure is downstream — signature encoding, ` +
        `fee grant funding, or chain broadcast.`,
    );
  } else {
    lines.push(
      "",
      `Diagnosis: could not reach the AA API's derivation endpoints, so the ` +
        `address could not be cross-checked. Verify the AA API URL is correct ` +
        `and the service is reachable.`,
    );
  }

  const message = lines.join("\n");
  console.error(`[createAccount] ${message}`);

  return new AccountCreationError(message, {
    cause,
    signedAddress,
    apiAddress,
    registrationConfig,
  });
}
