/**
 * Normalize transaction messages after JSON transport.
 *
 * Responsibility split:
 *  - SDK side    → sends `msg` as a plain JS object; JSON transport preserves it
 *  - Dashboard side → calls normalizeMessages() to convert each `msg` to Uint8Array
 *
 * Plain objects are used for transport because Uint8Array does not survive
 * JSON.stringify → JSON.parse (it degrades to `{"0":…, "1":…}`).
 * contractMsgToBytes() is exported as a standalone utility for callers who
 * need to encode in-memory without transport.
 *
 * Contract: any input shape other than a plain object throws — no silent coercion.
 */

import type { EncodeObject } from "@cosmjs/proto-signing";
import { WASM_MSG_TYPES_WITH_BYTES, type WasmMsgTypeUrl } from "./types";

/**
 * Convert a contract message object to the Uint8Array that protobuf expects.
 *
 * Only accepts a plain JS object. Throws on any other input — if you're
 * getting an error here, the SDK is sending the wrong type.
 */
export function contractMsgToBytes(msg: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(msg));
}

/**
 * Check whether a typeUrl is a CosmWasm message type whose `msg` field
 * needs byte normalization.
 */
export function isWasmMsgWithBytes(typeUrl: string): typeUrl is WasmMsgTypeUrl {
  return (WASM_MSG_TYPES_WITH_BYTES as readonly string[]).includes(typeUrl);
}

/**
 * Dashboard-side normalization: converts a post-transport CosmWasm message's
 * `msg` field from a plain JS object to Uint8Array for protobuf encoding.
 *
 * Note: the `instanceof Uint8Array` path is only reachable for in-memory
 * objects (e.g. double-normalize). After JSON transport, Uint8Array degrades
 * to a plain object and always takes the conversion path.
 */
export function normalizeMessage(message: EncodeObject): EncodeObject {
  if (!isWasmMsgWithBytes(message.typeUrl)) return message;

  const value = message.value as Record<string, unknown> | null | undefined;
  if (!value?.msg) return message;

  // Guard against double-normalize (only reachable for in-memory objects, not from transport)
  if (value.msg instanceof Uint8Array) return message;

  // Must be a plain object — anything else is a bug on the SDK side
  if (typeof value.msg !== "object" || Array.isArray(value.msg)) {
    throw new Error(
      `[normalizeMessage] ${message.typeUrl}.msg must be a plain object, ` +
        `got ${typeof value.msg}. Ensure the SDK sends the contract message ` +
        `as a JS object (e.g. { release: {} }).`,
    );
  }

  return {
    ...message,
    value: {
      ...value,
      msg: contractMsgToBytes(value.msg as Record<string, unknown>),
    },
  };
}

/**
 * Normalize all messages in a transport payload.
 *
 * Returns a new array (does not mutate the input). Messages that don't
 * need normalization are returned by reference.
 */
export function normalizeMessages(
  messages: readonly EncodeObject[],
): EncodeObject[] {
  return messages.map(normalizeMessage);
}
