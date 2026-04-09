/**
 * Dashboard Emulator for integration tests.
 *
 * Replicates the exact steps the Abstraxion Dashboard performs when it
 * receives a transaction payload from the SDK via popup/iframe/redirect:
 *
 *   1. Decode base64 URL param → JSON string → TxTransportPayload
 *   2. Validate the payload
 *   3. Normalize CosmWasm messages (object msg → Uint8Array)
 *   4. Encode each message through the protobuf Registry
 *
 * Step 4 is the critical one — if a message fails to encode, the real
 * dashboard would fail at `client.simulate()` or `client.signAndBroadcast()`.
 *
 * This emulator uses the same Registry (AADefaultRegistryTypes) as the
 * real dashboard's AAClient, so any encoding mismatch is caught here.
 */

import { Registry } from "@cosmjs/proto-signing";
import type { EncodeObject } from "@cosmjs/proto-signing";
import { defaultRegistryTypes } from "@cosmjs/stargate";
import { wasmTypes } from "@cosmjs/cosmwasm-stargate";
import { toBase64, fromBase64 } from "../../crypto/encoding";
import { normalizeMessages } from "../normalize";
import { validateTxPayload } from "../validate";
import { abstractAccountTypes } from "../../signers/utils/messages";
import type { TxTransportPayload } from "../types";
import type { PayloadValidation } from "../validate";

// ── Registry (mirrors AADefaultRegistryTypes from client.ts) ────────

const AADefaultRegistryTypes: ReadonlyArray<[string, any]> = [
  ...defaultRegistryTypes,
  ...wasmTypes,
  ...abstractAccountTypes,
];

function createRegistry(): Registry {
  return new Registry(AADefaultRegistryTypes);
}

// ── Emulator result ─────────────────────────────────────────────────

export interface EmulatorResult {
  /** The decoded payload as received by the dashboard. */
  decodedPayload: TxTransportPayload;
  /** Validation result. */
  validation: PayloadValidation;
  /** Messages after normalization (Uint8Array msg fields). */
  normalizedMessages: EncodeObject[];
  /** Per-message protobuf encoding results. */
  encodingResults: Array<{
    typeUrl: string;
    /** Encoded bytes (null if encoding failed). */
    encoded: Uint8Array | null;
    /** Error message if encoding failed. */
    error: string | null;
  }>;
  /** True if all messages encoded successfully. */
  allEncoded: boolean;
}

// ── SDK-side: encode payload for transport ───────────────────────────

/**
 * Encode a TxTransportPayload exactly as the SDK controllers do.
 *
 * This is what PopupController, IframeController, and RedirectController
 * do before sending the payload to the dashboard.
 */
export function encodePayloadForTransport(payload: TxTransportPayload): string {
  // BigInt values from protobuf types (e.g. codeId, proposalId) must be
  // converted to strings for JSON serialization — same as what happens
  // in the real SDK controllers via JSON.stringify.
  const jsonStr = JSON.stringify(payload, (_key, value) =>
    typeof value === "bigint" ? value.toString() : value,
  );
  return toBase64(jsonStr);
}

// ── Dashboard-side: full receive + process pipeline ─────────────────

/**
 * Emulate the full dashboard receive pipeline.
 *
 * Takes a base64-encoded payload (as it arrives in the URL) and runs
 * every step the dashboard performs before signing.
 */
export function emulateDashboardReceive(encodedPayload: string): EmulatorResult {
  // Step 1: Decode (mirrors decodeTxPayload in SignTransactionView)
  const json = fromBase64(encodedPayload);
  const decodedPayload = JSON.parse(json) as TxTransportPayload;

  // Step 2: Validate
  const validation = validateTxPayload(decodedPayload, "DashboardEmulator");

  // Step 3: Normalize (mirrors handleApprove in SignTransactionView)
  const normalizedMessages = normalizeMessages(decodedPayload.messages);

  // Step 4: Encode through Registry (mirrors client.simulate / signAndBroadcast)
  const registry = createRegistry();
  const encodingResults = normalizedMessages.map((msg) => {
    try {
      const encoded = registry.encode(msg);
      return {
        typeUrl: msg.typeUrl,
        encoded,
        error: null,
      };
    } catch (err) {
      return {
        typeUrl: msg.typeUrl,
        encoded: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });

  return {
    decodedPayload,
    validation,
    normalizedMessages,
    encodingResults,
    allEncoded: encodingResults.every((r) => r.encoded !== null),
  };
}

// ── Combined: SDK encode → Dashboard receive ────────────────────────

/**
 * Full round-trip: SDK constructs payload → encodes → dashboard decodes →
 * normalizes → protobuf encodes.
 *
 * This is the integration test entry point. If this succeeds, the message
 * will work in production.
 */
export function roundTrip(payload: TxTransportPayload): EmulatorResult {
  const encoded = encodePayloadForTransport(payload);
  return emulateDashboardReceive(encoded);
}

/**
 * Get all registered typeUrls from the AADefaultRegistryTypes.
 */
export function getRegisteredTypeUrls(): string[] {
  return AADefaultRegistryTypes.map(([typeUrl]) => typeUrl);
}
