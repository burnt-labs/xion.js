/**
 * Pre-flight validation for transaction payloads.
 * Logs issues and returns { ok, reason? } — non-blocking, unknown types pass through.
 */

import { isWasmMsgWithBytes } from "./normalize";
import type { TxTransportPayload } from "./types";

export interface PayloadValidation {
  ok: boolean;
  reason?: string;
}

export function validateTxPayload(
  payload: TxTransportPayload,
  context: string,
): PayloadValidation {
  const issues: string[] = [];

  function fail(msg: string) {
    issues.push(msg);
    console.warn(`[${context}] ${msg}`);
  }

  function warn(msg: string) {
    console.warn(`[${context}] ${msg}`);
  }

  // ── Top-level guards ──────────────────────────────────────────────

  if (!Array.isArray(payload.messages) || payload.messages.length === 0) {
    fail("messages must be a non-empty array");
    return { ok: false, reason: issues[0] };
  }

  // ── Per-message checks ────────────────────────────────────────────

  for (const [i, msg] of payload.messages.entries()) {
    const at = (field: string) => `messages[${i}].${field}`;

    if (!msg.typeUrl) {
      fail(`messages[${i}]: missing typeUrl`);
      continue;
    }
    if (msg.value == null) {
      fail(`messages[${i}]: missing value`);
      continue;
    }
    if (!isWasmMsgWithBytes(msg.typeUrl)) continue;

    // ── CosmWasm-specific checks ──────────────────────────────────

    const v = msg.value as Record<string, unknown>;
    const isExecute = msg.typeUrl.endsWith("MsgExecuteContract");
    const isMigrate = msg.typeUrl.endsWith("MsgMigrateContract");
    const isInstantiate = msg.typeUrl.endsWith("MsgInstantiateContract");

    if (!v.sender) fail(`${at("sender")}: required`);

    if ((isExecute || isMigrate) && !v.contract)
      fail(`${at("contract")}: required`);

    if (v.msg == null) fail(`${at("msg")}: required`);
    else if (
      !(v.msg instanceof Uint8Array) &&
      (typeof v.msg !== "object" || Array.isArray(v.msg))
    )
      fail(
        `${at("msg")}: must be a plain object, got ${Array.isArray(v.msg) ? "array" : typeof v.msg}`,
      );

    if (!isMigrate && v.funds !== undefined) {
      if (!Array.isArray(v.funds)) {
        fail(`${at("funds")}: must be an array`);
      } else {
        for (const [j, coin] of (v.funds as unknown[]).entries()) {
          if (!coin || typeof coin !== "object") {
            fail(
              `${at(`funds[${j}]`)}: expected { denom, amount }, got ${typeof coin}`,
            );
            continue;
          }
          const c = coin as Record<string, unknown>;
          if (typeof c.denom !== "string" || !c.denom)
            fail(`${at(`funds[${j}].denom`)}: must be a non-empty string`);
          if (typeof c.amount !== "string")
            fail(
              `${at(`funds[${j}].amount`)}: must be a string, got ${typeof c.amount}`,
            );
        }
      }
    }

    if ((isInstantiate || isMigrate) && (v.code_id ?? v.codeId) == null)
      warn(`${at("code_id")}: required`);
  }

  return issues.length === 0
    ? { ok: true }
    : { ok: false, reason: issues.join("; ") };
}
