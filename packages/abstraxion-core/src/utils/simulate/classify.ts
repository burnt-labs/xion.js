/**
 * Simulate-error classification for grant / signing transactions.
 *
 * Clients run `client.simulate(...)` before broadcast to pre-compute gas.
 * Some simulate failures are real (bad msg shape) and some are false
 * positives (simulate disagrees with deliver — e.g. authz code 2 on a smart
 * account that just hasn't been warmed up).
 *
 * We classify each failure into three buckets so the caller can decide
 * whether to fail hard, retry, or fall back to broadcasting with a concrete
 * `StdFee` (derived from `SIMULATE_FALLBACK_GAS`) and let the chain be the
 * source of truth. The fallback fee is deliberately concrete and NOT
 * `"auto"`: cosmjs's `"auto"` re-runs simulate internally, so it would just
 * re-trip the same failure we're trying to route around.
 *
 * This module is framework-agnostic and client-agnostic: the classifiers
 * are pure functions over an error value, and `simulateWithRetry` is generic
 * over any structural `{ simulate(...) }` client. User-facing copy and any
 * debug toggles stay in the consuming application, not here.
 */

/**
 * Classification of a `client.simulate(...)` failure.
 *
 * - `fatal`: hard config/structure error. Surface to user, don't retry,
 *   don't broadcast — the underlying tx would also fail.
 * - `transient`: chain busy, sequence mismatch, AA warm-up. Retry simulate.
 * - `non-blocking`: simulate disagrees with deliver but the *signed*
 *   broadcast carries real credentials and would land. Skip retry,
 *   broadcast with a concrete fallback fee (NOT `"auto"` — cosmjs's
 *   `"auto"` re-runs simulate internally and would just re-fail).
 */
export type SimulateErrorClass = "fatal" | "transient" | "non-blocking";

/**
 * Retry policy for `transient` failures: how many attempts and the delay
 * between them in milliseconds. The first attempt is always made; the
 * retry count is the number of *additional* attempts.
 */
export const SIMULATE_RETRY_COUNT = 1;
export const SIMULATE_RETRY_DELAY_MS = 1000;

/**
 * Default gas amount used to construct a concrete `StdFee` when simulate
 * fails non-fatally. Derived from the dashboard's worst case: an 8-msg legacy
 * grant + fee grant bundle at ≈ 130k gas (per the postmortem); treasury
 * bundles are smaller. 400k gives ~3× headroom on that worst case before a
 * gas-adjustment multiplier is applied — plenty of margin without paying for
 * gas we'll never use. Fee-granted broadcasts pay nothing for unused gas;
 * unfunded broadcasts pay sub-millicent worst case at this size.
 *
 * This is a sensible **default, not a law** — callers with a different worst
 * case should override it with their own concrete gas figure.
 */
export const SIMULATE_FALLBACK_GAS = 400_000;

const TRANSIENT_PATTERNS: RegExp[] = [
  /account sequence mismatch/i,
  /incorrect account sequence/i,
  /timed?\s*out/i,
  /econnreset|enetunreach|etimedout/i,
  /rpc error.*temporarily/i,
];

/**
 * Patterns that simulate fails on but a signed broadcast lands fine. These
 * are wire-format / contract-version mismatches that only bite the
 * placeholder-signature simulate path: the actual signAndBroadcast carries
 * real credentials, so the contract's `cred_bytes` guard is satisfied.
 *
 * Treated as `non-blocking` (skip retry, broadcast directly), and tagged
 * with a `hint` for telemetry so the next incident in this family is
 * diagnosable from the console alone.
 *
 * The canonical case: `@burnt-labs/signers` pre-alpha.9 sent
 * `signatures: [new Uint8Array()]`, which mainnet's pre-audit AA contract
 * (`code_id 5`, `FEFA4D0C`) rejects with `EmptySignature` before the
 * `simulate=true` skip. Broadcast is never affected because the signer fills
 * `signatures[0]` with the real credential before sending — the pre-flight
 * simulate is the only thing tripping the guard.
 */
interface ProtocolMismatchSignal {
  pattern: RegExp;
  hint: string;
}

const PROTOCOL_MISMATCH_SIGNALS: ProtocolMismatchSignal[] = [
  {
    pattern: /signature is empty/i,
    hint: "AA simulate produced 'signature is empty' — typically @burnt-labs/signers < alpha.9 against a pre-audit-fix AA contract (e.g. mainnet code_id 5, FEFA4D0C). The signed broadcast still carries a real credential and will land; the simulate placeholder is the only thing tripping the guard. Verify SDK version and the granter's AA code_id.",
  },
  {
    pattern: /EmptySignature/,
    hint: "AA contract returned EmptySignature — simulate-only wire-format mismatch with the deployed contract version. Broadcast lands.",
  },
];

const NON_BLOCKING_PATTERNS: RegExp[] = [
  // authz code 2: simulate-time grant lookup race, observed on first-connect
  // smart accounts that haven't warmed up yet. Deliver path consistently
  // lands. The codespace/code pair can appear in either order depending on
  // whether the error comes from a Tendermint broadcast response or a
  // cosmjs-formatted simulate failure.
  /codespace:\s*authz[\s\S]*code:?\s*2\b/i,
  /code:?\s*2\b[\s\S]*codespace:\s*authz/i,
  // Generic Querier error on a smart account that has no prior tx history —
  // before_tx / after_tx hooks not yet primed. Deliver path lands.
  /Querier contract error/i,
];

/**
 * Classify a simulate error into one of `SimulateErrorClass`.
 *
 * Pattern matching is intentionally permissive: we'd rather risk one extra
 * broadcast attempt than show the user a dead-end error. Anything we don't
 * recognise is treated as `fatal` so the user sees a real message instead
 * of a silently swallowed problem.
 *
 * Protocol-mismatch signals classify as `non-blocking` — they're
 * simulate-only failures (placeholder-signature wire issues) and the
 * signed broadcast that follows would land. They're broken out separately
 * only so `diagnoseSimulateError` can attach a developer-targeted hint.
 */
export function classifySimulateError(error: unknown): SimulateErrorClass {
  const message = error instanceof Error ? error.message : String(error);

  for (const { pattern } of PROTOCOL_MISMATCH_SIGNALS) {
    if (pattern.test(message)) return "non-blocking";
  }

  for (const pattern of NON_BLOCKING_PATTERNS) {
    if (pattern.test(message)) return "non-blocking";
  }

  for (const pattern of TRANSIENT_PATTERNS) {
    if (pattern.test(message)) return "transient";
  }

  return "fatal";
}

/**
 * If the error matches a known protocol/version-mismatch signature, return
 * a one-line diagnosis hint for the telemetry log. Returns null otherwise.
 *
 * The hint is intended for developers reading the console after an
 * incident, not the end user — it names the SDK package, the contract
 * version family, and points at the postmortem so the next investigator
 * has a head start.
 */
export function diagnoseSimulateError(error: unknown): string | null {
  const message = error instanceof Error ? error.message : String(error);
  for (const { pattern, hint } of PROTOCOL_MISMATCH_SIGNALS) {
    if (pattern.test(message)) return hint;
  }
  return null;
}

/**
 * Classification for the outer grant-flow error caught after simulate +
 * broadcast have already run. Different shape from `SimulateErrorClass`
 * because "non-blocking" is a simulate-only concept — once we've reached the
 * catch block in `grant()`, the broadcast has either failed for real or
 * never happened.
 *
 * - `account`: the user's smart account isn't usable as-is for this grant —
 *   canonically "Authenticator not found" on a first-connect account that
 *   hasn't been instantiated. Retrying as-is won't help; the user resolves it
 *   by disconnecting and logging in again, NOT by contacting the dApp team.
 *   Broken out from `config` so the copy can give that actionable guidance.
 * - `config`: dApp-side misconfiguration (bad contract grants, fee-grant
 *   setup, treasury not deployed). The current operation will not succeed by
 *   retrying as-is. Tell the user to contact the dApp team.
 * - `transient`: chain busy, sequence mismatch, network blip. Retrying often
 *   succeeds; surface a soft message and let the user hit Try again.
 * - `unknown`: anything we don't recognise. Keep the generic copy but expose
 *   the raw error behind a debug toggle so future incidents are diagnosable
 *   without a code session.
 */
export type GrantErrorClass = "account" | "config" | "transient" | "unknown";

/**
 * Account-side errors the *user* can resolve by disconnecting + re-logging
 * in. Checked before `CONFIG_ERROR_PATTERNS` so missing-authenticator gets
 * its own actionable copy instead of the generic "contact the dApp" message.
 */
const ACCOUNT_ERROR_PATTERNS: RegExp[] = [
  // First-connect smart accounts that haven't been instantiated yet.
  /Authenticator[\s\S]*not found/i,
];

const CONFIG_ERROR_PATTERNS: RegExp[] = [
  // Invalid contract grant config — consumers may surface a tailored message
  // for these, but the catch in grant() may still see a thrown variant.
  /invalid contract grants?/i,
  /InvalidContractGrant/i,
  // Fee-grant misconfiguration coming back from the API.
  /FeeGrantValidationError/i,
  // Treasury contract not deployed / address invalid.
  /contract:?\s*not found/i,
  /no such contract/i,
  // URL safety guard from the abstraxion-config layer.
  /Unsafe redirect URL/i,
];

/**
 * Classify a grant-flow error into one of `GrantErrorClass`.
 *
 * Reuses `classifySimulateError`'s `transient` patterns when nothing else
 * matches — chain-level transients look the same whether they came from
 * simulate or broadcast. Anything we can't place falls through to `unknown`
 * so the user still gets the dead-end UI's "show details" affordance instead
 * of being lied to about the cause.
 */
export function classifyGrantError(error: unknown): GrantErrorClass {
  const message = error instanceof Error ? error.message : String(error);

  for (const pattern of ACCOUNT_ERROR_PATTERNS) {
    if (pattern.test(message)) return "account";
  }

  for (const pattern of CONFIG_ERROR_PATTERNS) {
    if (pattern.test(message)) return "config";
  }

  // Reuse the simulate classifier for chain-level transients — sequence
  // mismatch / timeouts / RPC blips look identical on either path.
  if (classifySimulateError(error) === "transient") {
    return "transient";
  }

  return "unknown";
}
