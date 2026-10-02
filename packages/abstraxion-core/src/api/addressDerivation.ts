/**
 * Smart-account address derivation, resolved from the chain.
 *
 * Since xion v31, x/abstractaccount derives every new abstract-account address
 * with instantiate2 over a fixed, per-chain `address_derivation_hash` module
 * param instead of the registered code's own checksum. The chain refuses to
 * change that param once it is set, so it is cached per chain for the life of
 * the process.
 *
 * Accounts registered before v31 sit at addresses derived from the data_hash
 * of the code they were instantiated from. Those checksums are returned as
 * `legacyChecksums` (the data_hash of every code id the module allows) so
 * discovery can still find them.
 */

import { toHex } from "@cosmjs/encoding";
import { getRpcClient } from "../utils/rpcClient";

/** ABCI query path for x/abstractaccount params */
export const ABSTRACT_ACCOUNT_PARAMS_PATH = "/abstractaccount.v1.Query/Params";
/** ABCI query path for x/wasm code info (checksum without the wasm bytes) */
export const WASM_CODE_INFO_PATH = "/cosmwasm.wasm.v1.Query/CodeInfo";

/**
 * Raw ABCI query: returns the response value bytes, or throws.
 * Injectable so callers (and tests) can supply their own transport.
 */
export type AbciQueryFn = (
  path: string,
  data: Uint8Array,
) => Promise<Uint8Array>;

/** x/abstractaccount params relevant to address derivation */
export interface AbstractAccountDerivationParams {
  /** Uppercase hex `address_derivation_hash`, or null if the chain has none configured */
  addressDerivationHash: string | null;
  /** Code ids the module accepts for registration */
  allowedCodeIds: number[];
  allowAllCodeIds: boolean;
  registrationEnabled: boolean;
}

export interface ResolveAddressDerivationOptions {
  /** RPC endpoint used for the ABCI queries (http(s) or ws(s)) */
  rpcUrl?: string;
  /** Chain id; cache key. Falls back to rpcUrl when omitted. */
  chainId?: string;
  /**
   * Optional checksum pin from app config. When the chain has a derivation
   * hash and the pin disagrees, resolution throws
   * {@link AddressDerivationMismatchError} instead of deriving a wrong address.
   */
  pinnedChecksum?: string | null;
  /** Override the ABCI transport (defaults to a CometBFT client on rpcUrl) */
  query?: AbciQueryFn;
}

export interface ResolvedAddressDerivation {
  /** Uppercase hex checksum to derive new addresses with */
  checksum: string;
  /** Where `checksum` came from */
  source: "chain" | "pin";
  /**
   * Uppercase hex checksums that pre-v31 accounts may have been derived with,
   * excluding `checksum`. Discovery checks these after the primary address.
   */
  legacyChecksums: string[];
}

/**
 * The configured checksum pin disagrees with the chain's address derivation
 * hash. Addresses derived from the pin would never match what the chain
 * registers, so this is fatal rather than silently corrected.
 */
export class AddressDerivationMismatchError extends Error {
  readonly pinnedChecksum: string;
  readonly chainChecksum: string;
  readonly chainId?: string;

  constructor(pinnedChecksum: string, chainChecksum: string, chainId?: string) {
    super(
      `smartAccountContract.checksum (${pinnedChecksum}) does not match the ` +
        `x/abstractaccount address_derivation_hash on ${chainId ?? "this chain"} ` +
        `(${chainChecksum}). New accounts are derived from the chain's hash, so ` +
        `the pinned value would sign the wrong address. Remove the checksum ` +
        `from config to use the chain value, or set it to ${chainChecksum}.`,
    );
    this.name = "AddressDerivationMismatchError";
    this.pinnedChecksum = pinnedChecksum;
    this.chainChecksum = chainChecksum;
    this.chainId = chainId;
  }
}

// ---------------------------------------------------------------------------
// Minimal protobuf reading (the published xion-types predate field 8)
// ---------------------------------------------------------------------------

function readVarint(buf: Uint8Array, pos: number): [number, number] {
  let result = 0;
  let shift = 0;
  for (;;) {
    if (pos >= buf.length) throw new Error("Truncated protobuf varint");
    const byte = buf[pos++];
    // Multiplication keeps precision past 2^31 (code ids and gas fit in 2^53)
    result += (byte % 0x80) * 2 ** shift;
    if (byte < 0x80) return [result, pos];
    shift += 7;
    if (shift > 63) throw new Error("Malformed protobuf varint");
  }
}

type ProtoField =
  | { field: number; wire: 0; value: number }
  | { field: number; wire: 2; value: Uint8Array };

function readFields(buf: Uint8Array): ProtoField[] {
  const fields: ProtoField[] = [];
  let pos = 0;
  while (pos < buf.length) {
    let key: number;
    [key, pos] = readVarint(buf, pos);
    const field = Math.floor(key / 8);
    const wire = key % 8;
    if (wire === 0) {
      let value: number;
      [value, pos] = readVarint(buf, pos);
      fields.push({ field, wire, value });
    } else if (wire === 2) {
      let len: number;
      [len, pos] = readVarint(buf, pos);
      if (pos + len > buf.length) throw new Error("Truncated protobuf field");
      fields.push({ field, wire, value: buf.subarray(pos, pos + len) });
      pos += len;
    } else if (wire === 1) {
      pos += 8;
    } else if (wire === 5) {
      pos += 4;
    } else {
      throw new Error(`Unsupported protobuf wire type ${wire}`);
    }
  }
  return fields;
}

function encodeVarint(value: number): number[] {
  const out: number[] = [];
  let v = value;
  while (v >= 0x80) {
    out.push((v % 0x80) + 0x80);
    v = Math.floor(v / 0x80);
  }
  out.push(v);
  return out;
}

/**
 * Decode a QueryParamsResponse from x/abstractaccount.
 * Params: 1 allow_all_code_ids, 2 allowed_code_ids, 7 registration_enabled,
 * 8 address_derivation_hash.
 */
export function decodeAbstractAccountParams(
  value: Uint8Array,
): AbstractAccountDerivationParams {
  const paramsField = readFields(value).find(
    (f) => f.field === 1 && f.wire === 2,
  );
  const params: AbstractAccountDerivationParams = {
    addressDerivationHash: null,
    allowedCodeIds: [],
    allowAllCodeIds: false,
    registrationEnabled: false,
  };
  if (!paramsField) return params;

  for (const f of readFields(paramsField.value as Uint8Array)) {
    if (f.field === 1 && f.wire === 0) params.allowAllCodeIds = f.value !== 0;
    if (f.field === 2 && f.wire === 0) params.allowedCodeIds.push(f.value);
    if (f.field === 2 && f.wire === 2) {
      // packed repeated uint64
      let pos = 0;
      while (pos < f.value.length) {
        let id: number;
        [id, pos] = readVarint(f.value, pos);
        params.allowedCodeIds.push(id);
      }
    }
    if (f.field === 7 && f.wire === 0) {
      params.registrationEnabled = f.value !== 0;
    }
    if (f.field === 8 && f.wire === 2) {
      params.addressDerivationHash =
        f.value.length === 32 ? toHex(f.value).toUpperCase() : null;
    }
  }
  return params;
}

/** Decode the checksum (field 3) of a wasm QueryCodeInfoResponse */
export function decodeCodeInfoChecksum(value: Uint8Array): string | null {
  const checksum = readFields(value).find((f) => f.field === 3 && f.wire === 2);
  if (!checksum || (checksum.value as Uint8Array).length !== 32) return null;
  return toHex(checksum.value as Uint8Array).toUpperCase();
}

// ---------------------------------------------------------------------------
// Chain queries
// ---------------------------------------------------------------------------

function defaultQuery(rpcUrl: string): AbciQueryFn {
  return async (path, data) => {
    const client = await getRpcClient(rpcUrl);
    try {
      const response = await client.abciQuery({ path, data });
      if (response.code !== 0) {
        throw new Error(
          `ABCI query ${path} failed (code ${response.code}): ${response.log ?? ""}`,
        );
      }
      return response.value;
    } finally {
      client.disconnect();
    }
  };
}

/** Normalize a checksum string to uppercase hex without 0x */
export function normalizeChecksum(checksum: string): string {
  return checksum.trim().replace(/^0x/i, "").toUpperCase();
}

/** Query x/abstractaccount params */
export async function fetchAbstractAccountParams(
  query: AbciQueryFn,
): Promise<AbstractAccountDerivationParams> {
  const value = await query(ABSTRACT_ACCOUNT_PARAMS_PATH, new Uint8Array());
  return decodeAbstractAccountParams(value);
}

/** Query the data_hash of a stored wasm code */
export async function fetchCodeChecksum(
  query: AbciQueryFn,
  codeId: number,
): Promise<string | null> {
  const value = await query(
    WASM_CODE_INFO_PATH,
    new Uint8Array([0x08, ...encodeVarint(codeId)]),
  );
  return decodeCodeInfoChecksum(value);
}

/**
 * Chain-side derivation facts, cached per chain. `hash` is null when the
 * chain answered but has no derivation hash (pre-v31 or registration
 * unconfigured): addresses then derive from the code's own checksum.
 */
interface ChainDerivation {
  hash: string | null;
  legacyChecksums: string[];
  /** False when a legacy code lookup failed: usable now, but not cached */
  complete: boolean;
}

const derivationCache = new Map<string, Promise<ChainDerivation>>();

/** Clear the per-chain derivation cache (tests, or a chain reset on localnet) */
export function clearAddressDerivationCache(): void {
  derivationCache.clear();
}

async function loadChainDerivation(
  query: AbciQueryFn,
): Promise<ChainDerivation> {
  const params = await fetchAbstractAccountParams(query);
  if (!params.addressDerivationHash) {
    return { hash: null, legacyChecksums: [], complete: true };
  }

  // Pre-v31 accounts were derived from the data_hash of the code they were
  // instantiated from. Every code id the module allows is a candidate. A
  // failed lookup doesn't block resolution, but the result is then marked
  // incomplete so it is not cached and the next call retries the lookup.
  let complete = true;
  const codeChecksums = await Promise.all(
    params.allowedCodeIds.map((id) =>
      fetchCodeChecksum(query, id).catch(() => {
        complete = false;
        return null;
      }),
    ),
  );
  const legacyChecksums = [
    ...new Set(codeChecksums.filter((c): c is string => !!c)),
  ].filter((c) => c !== params.addressDerivationHash);

  return { hash: params.addressDerivationHash, legacyChecksums, complete };
}

/**
 * Resolve the checksum to derive smart-account addresses with.
 *
 * - Chain has an address_derivation_hash: use it. A pin that disagrees throws
 *   {@link AddressDerivationMismatchError}.
 * - Chain has none (pre-v31 / unconfigured): use the pin; without a pin, throw.
 * - Chain unreachable: use the pin if there is one (not cached, so the next
 *   call retries the chain); without a pin, rethrow.
 *
 * Complete chain reads are cached per (chainId, rpcUrl), since the chain
 * forbids changing the hash once set. A read whose legacy code lookups
 * partly failed, or one with neither chainId nor rpcUrl, is not cached.
 */
export async function resolveAddressDerivation(
  options: ResolveAddressDerivationOptions,
): Promise<ResolvedAddressDerivation> {
  const pin = options.pinnedChecksum
    ? normalizeChecksum(options.pinnedChecksum)
    : undefined;

  const query =
    options.query ??
    (options.rpcUrl ? defaultQuery(options.rpcUrl) : undefined);
  if (!query) {
    if (pin) return { checksum: pin, source: "pin", legacyChecksums: [] };
    throw new Error(
      "Cannot resolve smart account checksum: no rpcUrl to read the chain's " +
        "address_derivation_hash from, and no smartAccountContract.checksum pin.",
    );
  }

  // Without a chain identity (a bare custom `query`), nothing ties two calls
  // to the same chain, so the read is not cached.
  const cacheKey =
    options.chainId || options.rpcUrl
      ? `${options.chainId ?? ""}|${options.rpcUrl ?? ""}`
      : undefined;
  let pending = cacheKey ? derivationCache.get(cacheKey) : undefined;
  if (!pending) {
    pending = loadChainDerivation(query);
  }
  if (cacheKey && !derivationCache.has(cacheKey)) {
    const load = pending;
    derivationCache.set(cacheKey, load);
    // Only complete, successful reads stay cached
    const evict = () => {
      if (derivationCache.get(cacheKey) === load) {
        derivationCache.delete(cacheKey);
      }
    };
    load.then((result) => {
      if (!result.complete) evict();
    }, evict);
  }

  let chain: ChainDerivation;
  try {
    chain = await pending;
  } catch (error) {
    if (pin) {
      console.warn(
        `[abstraxion] Could not read address_derivation_hash from chain ` +
          `${options.chainId ?? options.rpcUrl}; using the configured checksum ` +
          `pin. ${error instanceof Error ? error.message : String(error)}`,
      );
      return { checksum: pin, source: "pin", legacyChecksums: [] };
    }
    throw new Error(
      "Failed to read x/abstractaccount address_derivation_hash from chain " +
        `${options.chainId ?? options.rpcUrl}: ` +
        (error instanceof Error ? error.message : String(error)),
    );
  }

  if (!chain.hash) {
    if (pin) return { checksum: pin, source: "pin", legacyChecksums: [] };
    throw new Error(
      `Chain ${options.chainId ?? options.rpcUrl} has no x/abstractaccount ` +
        `address_derivation_hash configured; set smartAccountContract.checksum ` +
        `to the account code's checksum.`,
    );
  }

  if (pin && pin !== chain.hash) {
    throw new AddressDerivationMismatchError(pin, chain.hash, options.chainId);
  }

  return {
    checksum: chain.hash,
    source: "chain",
    legacyChecksums: chain.legacyChecksums,
  };
}

/** Convenience: just the checksum from {@link resolveAddressDerivation} */
export async function resolveSmartAccountChecksum(
  options: ResolveAddressDerivationOptions,
): Promise<string> {
  return (await resolveAddressDerivation(options)).checksum;
}
