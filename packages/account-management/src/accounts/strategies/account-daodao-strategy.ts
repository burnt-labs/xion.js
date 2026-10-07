/**
 * DaoDao indexer strategy for querying smart accounts
 *
 * Resolves a login authenticator to the account contracts that currently hold it, through the
 * DaoDao indexer's `GET /{chainId}/generic/_/xion/accountsByAuthenticator` lookup.
 */

import { IndexerStrategy, SmartAccountWithCodeId } from "../../types/indexer";
import { isMatchingAuthenticator } from "../discovery";
import { fromBech32, fromHex, toBase64, toBech32 } from "@cosmjs/encoding";
import {
  AUTHENTICATOR_TYPE,
  normalizeEthereumAddress,
  type AuthenticatorType,
} from "@burnt-labs/signers";

/** Types the indexer's lookup accepts (dao-dao-indexer `XION_AUTHENTICATOR_TYPES`). */
const INDEXED_TYPES: ReadonlySet<string> = new Set([
  "Secp256K1",
  "Ed25519",
  "EthWallet",
  "JWT",
  "Secp256R1",
  "Passkey",
  "ZKEmail",
]);

const SDK_TYPES: ReadonlySet<string> = new Set(
  Object.values(AUTHENTICATOR_TYPE),
);

interface DaoDaoAuthenticatorResp {
  index: number;
  type: string;
  authenticator: string;
}

interface DaoDaoAccountResp {
  address: string;
  codeId: number;
  authenticators: DaoDaoAuthenticatorResp[];
}

const isIndex = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) >= 0;

/** Bech32 prefix of XION addresses, the only chain the lookup serves. */
const XION_ADDRESS_PREFIX = "xion";

/** Smart accounts are contracts: 32-byte addresses. */
const CONTRACT_ADDRESS_BYTES = 32;

/** A canonical `xion1…` contract address (not another chain's, not a user's). */
const isXionContractAddress = (value: string): boolean => {
  try {
    const { prefix, data } = fromBech32(value);
    return (
      prefix === XION_ADDRESS_PREFIX &&
      data.length === CONTRACT_ADDRESS_BYTES &&
      toBech32(prefix, data) === value
    );
  } catch {
    return false;
  }
};

/** A hex-encoded compressed or uncompressed secp256k1 public key. */
const SECP256K1_HEX = /^(0[23][0-9a-fA-F]{64}|04[0-9a-fA-F]{128})$/;

/**
 * The identity in the form the lookup expects. EthWallet addresses are sent
 * lowercase with `0x`, as the SDK's connectors and the AA API lookup send them
 * (`normalizeEthereumAddress`). Secp256K1 keys are stored base64 (the
 * contract's encoding), so a hex key is converted. Other types go as given.
 */
const toIndexedIdentity = (
  loginAuthenticator: string,
  authenticatorType: AuthenticatorType,
): string => {
  if (authenticatorType === AUTHENTICATOR_TYPE.EthWallet) {
    return normalizeEthereumAddress(loginAuthenticator);
  }
  if (
    authenticatorType === AUTHENTICATOR_TYPE.Secp256K1 &&
    SECP256K1_HEX.test(loginAuthenticator.trim())
  ) {
    return toBase64(fromHex(loginAuthenticator.trim()));
  }
  return loginAuthenticator;
};

/**
 * Whether an indexed authenticator is the login one. The lookup matches type
 * and identity exactly; only EthWallet addresses and Secp256K1 keys have an
 * equivalent encoding (casing, hex vs base64) that also counts.
 */
const holdsLoginAuthenticator = (
  { type, authenticator }: DaoDaoAuthenticatorResp,
  loginAuthenticator: string,
  authenticatorType: AuthenticatorType,
): boolean => {
  if (
    authenticatorType === AUTHENTICATOR_TYPE.EthWallet ||
    authenticatorType === AUTHENTICATOR_TYPE.Secp256K1
  ) {
    return isMatchingAuthenticator(
      { type: type as AuthenticatorType, authenticator },
      loginAuthenticator,
      authenticatorType,
    );
  }
  return type === authenticatorType && authenticator === loginAuthenticator;
};

const isAuthenticatorResp = (
  value: unknown,
): value is DaoDaoAuthenticatorResp => {
  const a = value as Partial<DaoDaoAuthenticatorResp> | null;
  return (
    typeof a === "object" &&
    a !== null &&
    isIndex(a.index) &&
    typeof a.type === "string" &&
    INDEXED_TYPES.has(a.type) &&
    typeof a.authenticator === "string" &&
    a.authenticator.length > 0
  );
};

const isAccountResp = (value: unknown): value is DaoDaoAccountResp => {
  const a = value as Partial<DaoDaoAccountResp> | null;
  return (
    typeof a === "object" &&
    a !== null &&
    typeof a.address === "string" &&
    isXionContractAddress(a.address) &&
    isIndex(a.codeId) &&
    a.codeId > 0 &&
    Array.isArray(a.authenticators) &&
    a.authenticators.every(isAuthenticatorResp)
  );
};

/** Default request timeout, the same as the DaoDao treasury strategy's. */
const DEFAULT_TIMEOUT_MS = 30000;

export class DaoDaoAccountStrategy implements IndexerStrategy {
  private readonly baseURL: string;
  private readonly timeoutMs: number;

  /**
   * @param baseURL - DaoDao indexer base URL (e.g. "https://daodaoindexer.burnt.com"),
   *                  see `getDaoDaoIndexerUrl` in `@burnt-labs/constants`
   * @param chainId - Chain the indexer path is scoped to (e.g. "xion-mainnet-1")
   * @param timeoutMs - Request timeout in milliseconds (default: 30000). A stalled
   *                    request is aborted and fails, so the composite falls through.
   */
  constructor(
    baseURL: string,
    chainId: string,
    timeoutMs: number = DEFAULT_TIMEOUT_MS,
  ) {
    this.baseURL = `${baseURL.replace(/\/+$/, "")}/${chainId}`;
    this.timeoutMs = timeoutMs;
  }

  async fetchSmartAccounts(
    loginAuthenticator: string,
    authenticatorType: AuthenticatorType,
  ): Promise<SmartAccountWithCodeId[]> {
    // Bounds the request and the body read: browser fetch has no response
    // timeout, and a stalled indexer would otherwise hold the composite.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      // The indexer rejects types it does not index (e.g. Sr25519) with a 400;
      // fail fast so the composite moves on without a request.
      if (!INDEXED_TYPES.has(authenticatorType)) {
        throw new Error(
          `the DaoDao indexer does not index ${authenticatorType} authenticators`,
        );
      }

      const params = new URLSearchParams({
        type: authenticatorType,
        authenticator: toIndexedIdentity(loginAuthenticator, authenticatorType),
      });
      const url = `${this.baseURL}/generic/_/xion/accountsByAuthenticator?${params.toString()}`;

      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });

      // A miss is `200 []`; any other status (including 404 while the
      // formula is not deployed) is a failure the composite falls through.
      if (!response.ok) {
        throw new Error(
          `DaoDao indexer request failed: ${response.status} ${response.statusText}`,
        );
      }

      const data: unknown = await response.json();

      // Only `[]` is a miss: a null or otherwise malformed body is a failure,
      // not proof that no account holds the authenticator.
      if (!Array.isArray(data)) {
        throw new Error("DaoDao indexer returned a non-list response");
      }
      // A partial entry would read as an existing account (e.g. codeId NaN,
      // index defaulted to 0), so fail and let the composite fall through.
      if (!data.every(isAccountResp)) {
        throw new Error("DaoDao indexer returned a malformed account entry");
      }
      // The lookup only returns accounts that hold the queried authenticator.
      // One that doesn't would be connected at a defaulted index (JWT,
      // Passkey, ...), so treat it as a bad response rather than a match.
      if (
        !data.every(({ authenticators }) =>
          authenticators.some((auth) =>
            holdsLoginAuthenticator(
              auth,
              loginAuthenticator,
              authenticatorType,
            ),
          ),
        )
      ) {
        throw new Error(
          "DaoDao indexer returned an account without the queried authenticator",
        );
      }

      return data.map(({ address, codeId, authenticators }) => ({
        id: address,
        codeId,
        // Authenticators of a type the SDK has no signer for (e.g. Secp256R1)
        // are left out; the rest keep their on-chain index.
        authenticators: authenticators
          .filter(({ type }) => SDK_TYPES.has(type))
          .map(({ index, type, authenticator }) => ({
            id: `${address}-${index}`,
            authenticator,
            authenticatorIndex: index,
            type: type as AuthenticatorType,
          })),
      }));
    } catch (error) {
      const errorMessage = controller.signal.aborted
        ? `DaoDao indexer request timed out after ${this.timeoutMs}ms`
        : error instanceof Error
          ? error.message
          : String(error);
      throw new Error(`DaoDao account strategy failed: ${errorMessage}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
