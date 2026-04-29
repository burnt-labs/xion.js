/**
 * Shared types for transaction payloads transported between xion.js SDK
 * controllers (popup / iframe / redirect) and the Abstraxion Dashboard.
 *
 * Built on top of CosmJS types (EncodeObject, Coin, StdFee) — we only
 * define the transport-specific wrapper and the list of message typeUrls
 * whose `msg` field needs byte normalization after JSON round-tripping.
 */

import type { EncodeObject } from "@cosmjs/proto-signing";
import type { Coin, StdFee } from "@cosmjs/stargate";
import type {
  MsgExecuteContractEncodeObject,
  MsgInstantiateContractEncodeObject,
  MsgInstantiateContract2EncodeObject,
  MsgMigrateContractEncodeObject,
} from "@cosmjs/cosmwasm-stargate";

// Re-exports: SDK devs can import from this module without depending
// on CosmJS packages directly.

export type { EncodeObject, Coin, StdFee };
export type {
  MsgExecuteContractEncodeObject,
  MsgInstantiateContractEncodeObject,
  MsgInstantiateContract2EncodeObject,
  MsgMigrateContractEncodeObject,
};

// ── CosmJS type guards (re-exported) ────────────────────────────────

export {
  isMsgExecuteEncodeObject,
  isMsgInstantiateContractEncodeObject,
  isMsgInstantiateContract2EncodeObject,
  isMsgMigrateEncodeObject,
} from "@cosmjs/cosmwasm-stargate";

// ── Wasm typeUrls that carry a `msg` bytes field ────────────────────

/**
 * CosmWasm message typeUrls whose `msg` field needs byte normalization.
 *
 * These carry a JSON contract message encoded as Uint8Array. After JSON
 * transport the `msg` arrives as a plain object and must be re-encoded.
 *
 * NOT included (different concern):
 *  - MsgStoreCode.wasmByteCode — raw binary, never a JSON object
 *  - MsgInstantiateContract2.salt — raw binary (but its `msg` IS handled)
 *  - MsgExec.msgs — protobuf Any-wrapped, not JSON
 *  - IBC proof fields — raw merkle proofs
 */
export const WASM_MSG_TYPES_WITH_BYTES = [
  "/cosmwasm.wasm.v1.MsgExecuteContract",
  "/cosmwasm.wasm.v1.MsgInstantiateContract",
  "/cosmwasm.wasm.v1.MsgInstantiateContract2",
  "/cosmwasm.wasm.v1.MsgMigrateContract",
] as const;

export type WasmMsgTypeUrl = (typeof WASM_MSG_TYPES_WITH_BYTES)[number];

// ── Transport envelope ──────────────────────────────────────────────

/**
 * The JSON payload that travels from the SDK to the dashboard via popup
 * URL param, iframe postMessage, or redirect URL param.
 *
 * `messages` uses CosmJS `EncodeObject` — after JSON transport the
 * `value` loses typed fields (Uint8Array → plain object), which is
 * what the normalizer fixes.
 *
 * `fee` accepts the same shapes as CosmJS `signAndBroadcast`:
 *   - `StdFee` (explicit gas + amounts)
 *   - `"auto"` (simulate first)
 *   - `number` (gas multiplier)
 */
export interface TxTransportPayload {
  messages: readonly EncodeObject[];
  fee: StdFee | "auto" | number;
  memo?: string;
}
