/**
 * Generic `simulate()` orchestration: classification + bounded retry +
 * concrete-fee fallback, layered above any cosmjs-shaped client.
 *
 * Kept separate from the client classes on purpose: a cosmjs
 * `SigningStargateClient.simulate()` returns `Promise<number>` and throws on
 * failure, and that contract must not change. Robustness is layered here as
 * free functions over a structural `SimulateLike`, so it composes with
 * `RequireSigningClient`, `GranteeSignerClient`, `AAClient`, and plain
 * cosmjs clients alike.
 */

import { wait } from "../index";
import {
  classifySimulateError,
  diagnoseSimulateError,
  SIMULATE_RETRY_COUNT,
  SIMULATE_RETRY_DELAY_MS,
} from "./classify";

/**
 * Structural shape `simulateWithRetry` requires of its client. Matches the
 * cosmjs `simulate(signer, messages, memo): Promise<number>` signature, so
 * any cosmjs-derived client (or a hand-rolled mock) satisfies it.
 */
export interface SimulateLike {
  simulate(
    signer: string,
    messages: readonly { typeUrl: string }[],
    memo?: string,
  ): Promise<number>;
}

/**
 * Structured logger for simulate-failure telemetry. Receives the log label
 * and a structured payload — defaults to `console.warn` so existing callers
 * keep their console telemetry, but non-dashboard callers can inject their
 * own sink (or a no-op) instead of being forced into console output.
 */
export type SimulateLogger = (
  message: string,
  payload: Record<string, unknown>,
) => void;

/**
 * Caller-supplied context that gets attached to every simulate-failure
 * log line. Lets future incidents be diagnosed from log output alone — we
 * record granter/grantee identity, the msg shapes that were simulated, the
 * chain we're talking to, and whether the granter address matches the
 * smart-account sender (mismatch is a noisy class of bug).
 *
 * `chainId` is optional but strongly recommended: the postmortem case
 * (signers < alpha.9) only reproduced on mainnet, and an incident report
 * that doesn't note the network costs hours to disambiguate.
 */
export interface SimulateContext {
  granter: string;
  grantee: string;
  /** Treasury address when running the treasury grant path. */
  treasury?: string;
  /**
   * Free-form label identifying the calling flow in logs (e.g. `"treasury"`,
   * `"legacy"`, `"sign"`). Kept as a plain string so non-grant callers (the
   * signing window) aren't forced into a grant-shaped union.
   */
  label: string;
  /** Chain id the simulate is running against — mainnet vs testnet. */
  chainId?: string;
  /**
   * Optional telemetry sink for failed attempts. Defaults to `console.warn`
   * when omitted, preserving the existing console-logging behavior.
   */
  logger?: SimulateLogger;
}

export type SimulateRetryResult =
  | { kind: "success"; simmedGas: number }
  | { kind: "fallback"; lastError: unknown };

/**
 * Run `client.simulate(...)` with classification + bounded retry.
 *
 * - `fatal` errors re-throw immediately.
 * - `transient` errors are retried `SIMULATE_RETRY_COUNT` times with a fixed
 *   backoff before falling through to the `fallback` path.
 * - `non-blocking` errors skip the retry and return a `fallback` result so
 *   the caller can broadcast with a concrete fallback `StdFee` (derived from
 *   `SIMULATE_FALLBACK_GAS`). NOT `fee: "auto"` — cosmjs re-simulates on
 *   `"auto"` and would re-hit the same non-blocking failure.
 *
 * Every failed attempt logs a structured warning (via `context.logger`, or
 * `console.warn` by default) so the caller doesn't need to wrap simulate
 * themselves to keep telemetry.
 */
export async function simulateWithRetry(
  client: SimulateLike,
  signer: string,
  messages: readonly { typeUrl: string }[],
  memo: string,
  context: SimulateContext,
): Promise<SimulateRetryResult> {
  const totalAttempts = SIMULATE_RETRY_COUNT + 1;
  const log = context.logger ?? console.warn;
  let lastError: unknown;

  for (let attempt = 0; attempt < totalAttempts; attempt++) {
    try {
      const simmedGas = await client.simulate(signer, messages, memo);
      return { kind: "success", simmedGas };
    } catch (error) {
      lastError = error;
      const classification = classifySimulateError(error);
      const diagnosis = diagnoseSimulateError(error);

      log(`[Grant/${context.label}] simulate failed`, {
        attempt: attempt + 1,
        classification,
        diagnosis,
        message: error instanceof Error ? error.message : String(error),
        msgTypes: messages.map((m) => m.typeUrl),
        chainId: context.chainId,
        granter: context.granter,
        grantee: context.grantee,
        treasury: context.treasury,
        granterMatchesSender: context.granter === signer,
      });

      if (classification === "fatal") {
        throw error;
      }

      if (classification === "non-blocking") {
        return { kind: "fallback", lastError: error };
      }

      // Transient — wait then retry, unless this was the last attempt.
      if (attempt < totalAttempts - 1) {
        await wait(SIMULATE_RETRY_DELAY_MS);
        continue;
      }
    }
  }

  return { kind: "fallback", lastError };
}
