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

  // ── Fee shape ─────────────────────────────────────────────────────
  // Accepts the same shapes as CosmJS signAndBroadcast: "auto" | number | StdFee.

  const fee = payload.fee as unknown;
  if (fee === "auto") {
    // ok
  } else if (typeof fee === "number") {
    if (!Number.isFinite(fee) || fee <= 0 || fee > 10) {
      fail(
        `fee: gas multiplier must be a finite number in (0, 10], got ${fee}`,
      );
    }
  } else if (fee && typeof fee === "object") {
    const f = fee as Record<string, unknown>;
    if (typeof f.gas !== "string" || f.gas.length === 0) {
      fail(`fee.gas: must be a non-empty string, got ${typeof f.gas}`);
    } else if (!/^\d+$/.test(f.gas)) {
      fail(`fee.gas: must be a non-negative integer string, got ${f.gas}`);
    }
    if (!Array.isArray(f.amount)) {
      fail(`fee.amount: must be an array, got ${typeof f.amount}`);
    } else {
      for (const [j, coin] of (f.amount as unknown[]).entries()) {
        if (!coin || typeof coin !== "object") {
          fail(
            `fee.amount[${j}]: expected { denom, amount }, got ${typeof coin}`,
          );
          continue;
        }
        const c = coin as Record<string, unknown>;
        if (typeof c.denom !== "string" || !c.denom) {
          fail(`fee.amount[${j}].denom: must be a non-empty string`);
        }
        if (typeof c.amount !== "string" || !/^\d+$/.test(c.amount)) {
          fail(
            `fee.amount[${j}].amount: must be a non-negative integer string, got ${c.amount}`,
          );
        }
      }
    }
  } else {
    fail(`fee: must be "auto", a number, or StdFee, got ${typeof fee}`);
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

    // Authz wrappers carry inner messages as protobuf Any — they are not
    // walked by the normalizer, so any CosmWasm message inside will keep
    // its plain-object `msg` field and fail to encode dashboard-side.
    if (
      msg.typeUrl === "/cosmos.authz.v1beta1.MsgExec" ||
      msg.typeUrl === "/cosmos.authz.v1beta1.MsgGrant"
    ) {
      warn(
        `messages[${i}] (${msg.typeUrl}): inner messages are not inspected; ` +
          `if any inner message is a CosmWasm type, ensure its 'msg' field is already Uint8Array`,
      );
      continue;
    }

    if (!isWasmMsgWithBytes(msg.typeUrl)) continue;

    // ── CosmWasm-specific checks ──────────────────────────────────

    const v = msg.value as Record<string, unknown>;
    const isExecute = msg.typeUrl.endsWith("MsgExecuteContract");
    const isMigrate = msg.typeUrl.endsWith("MsgMigrateContract");
    const isInstantiate = msg.typeUrl.includes("MsgInstantiateContract");

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
