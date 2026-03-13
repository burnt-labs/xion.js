/**
 * Response Shape Contract Tests
 *
 * Validates the TypeScript type definitions AND runtime shapes of every
 * response type in the SDK ↔ Dashboard MessageChannel protocol.
 *
 * WHY THESE TESTS EXIST:
 * In a split-repo setup the SDK can declare a return type (e.g. DeliverTxResponse)
 * that the dashboard never actually sends — tests pass because mocks are well-typed,
 * not because the real flow is correct. This happened with
 * signAndBroadcastWithMetaAccount: it was typed as Promise<DeliverTxResponse> but
 * the dashboard only ever sent { transactionHash }. No test caught it because every
 * test mocked the full response.
 *
 * HOW THE REGRESSION DETECTION WORKS:
 *
 *   1. Runtime assertions (expect) — verify actual object shapes at test time.
 *      Run by: pnpm exec vitest run tests/integration/response-shapes.integration.test.ts
 *
 *   2. @ts-expect-error directives — verify fields that must NOT exist in the type.
 *      If someone adds e.g. `height?: number` to SignAndBroadcastResult, the directive
 *      on `{ transactionHash: "x", height: 100 }` becomes an "Unused '@ts-expect-error'"
 *      error and `tsc --noEmit` fails. Vitest alone will NOT catch this because it uses
 *      esbuild (strips types without checking); the tsc step in CI is required.
 *      Run by: pnpm exec tsc --noEmit  (in packages/abstraxion)
 *
 * Both steps are wired in dashboard-contract-validation.yml.
 */

import { describe, it, expect } from "vitest";
import type {
  SignAndBroadcastResult,
  SignTransactionResponse,
  SignedTransaction,
  ConnectResponse,
  GetAddressResponse,
  AddAuthenticatorResponse,
  RemoveAuthenticatorResponse,
  RequestGrantResponse,
  AuthenticatorData,
  TransactionBroadcastEvent,
} from "@burnt-labs/abstraxion-core";

// ─── SIGN_AND_BROADCAST ────────────────────────────────────────────────────

describe("SignAndBroadcastResult (SIGN_AND_BROADCAST response)", () => {
  it("has exactly one field: transactionHash: string", () => {
    const result: SignAndBroadcastResult = { transactionHash: "ABCDEF123456" };
    expect(typeof result.transactionHash).toBe("string");
    // Exact key set — if the dashboard starts sending more fields,
    // widen SignAndBroadcastResult AND update this assertion.
    expect(Object.keys(result)).toEqual(["transactionHash"]);
  });

  it("rejects DeliverTxResponse fields that the dashboard never sends [compile-time]", () => {
    // Each @ts-expect-error asserts that the labelled field does NOT exist in
    // SignAndBroadcastResult. If anyone adds these to the type the directive
    // becomes "Unused '@ts-expect-error'" and tsc --noEmit fails — that compile
    // failure is the regression signal caught in CI.

    // @ts-expect-error — 'height' is not in SignAndBroadcastResult
    const _h: SignAndBroadcastResult = { transactionHash: "x", height: 100 };
    // @ts-expect-error — 'code' is not in SignAndBroadcastResult
    const _c: SignAndBroadcastResult = { transactionHash: "x", code: 0 };
    // @ts-expect-error — 'gasUsed' is not in SignAndBroadcastResult
    const _g: SignAndBroadcastResult = { transactionHash: "x", gasUsed: BigInt(50000) };
    // @ts-expect-error — 'events' is not in SignAndBroadcastResult
    const _e: SignAndBroadcastResult = { transactionHash: "x", events: [] };
    // @ts-expect-error — 'msgResponses' is not in SignAndBroadcastResult
    const _mr: SignAndBroadcastResult = { transactionHash: "x", msgResponses: [] };
    // @ts-expect-error — 'txIndex' is not in SignAndBroadcastResult
    const _ti: SignAndBroadcastResult = { transactionHash: "x", txIndex: 0 };

    void _h; void _c; void _g; void _e; void _mr; void _ti;
    // If tsc compiles this file clean, the type shape is correct.
    expect(true).toBe(true);
  });
});

// ─── TransactionBroadcastEvent (push event, NOT a MessageChannel response) ─

describe("TransactionBroadcastEvent (IframeSDKEvents.transactionBroadcast)", () => {
  it("is a push-event notification — richer than the request/response result", () => {
    const minimal: TransactionBroadcastEvent = { transactionHash: "ABCDEF123" };
    expect(minimal.transactionHash).toBeTruthy();

    const full: TransactionBroadcastEvent = {
      transactionHash: "ABCDEF123",
      height: 1000,
      code: 0,
      rawLog: "[]",
    };
    expect(full.height).toBe(1000);
    expect(full.code).toBe(0);
  });

  it("is intentionally distinct from SignAndBroadcastResult [compile-time]", () => {
    // Push events can carry optional extras (height, code, rawLog) that the
    // dashboard emits as informational notifications. The request/response type
    // (SignAndBroadcastResult) is intentionally narrower.
    const event: TransactionBroadcastEvent = { transactionHash: "x", height: 100 };

    // height is valid in TransactionBroadcastEvent but NOT in SignAndBroadcastResult.
    // If they were ever unified (same type), this @ts-expect-error would become unused
    // and tsc would fail — making the unification deliberate and visible.
    // @ts-expect-error — 'height' is not in SignAndBroadcastResult
    const _r: SignAndBroadcastResult = { transactionHash: "x", height: 100 };

    void event; void _r;
    expect(true).toBe(true);
  });
});

// ─── CONNECT ───────────────────────────────────────────────────────────────

describe("ConnectResponse (CONNECT response)", () => {
  it("address is a required string", () => {
    const response: ConnectResponse = { address: "xion1abc123" };
    expect(typeof response.address).toBe("string");
  });

  it("balance is optional", () => {
    const with_: ConnectResponse = { address: "xion1abc", balance: "1000uxion" };
    const without: ConnectResponse = { address: "xion1abc" };
    expect(with_.balance).toBeDefined();
    expect(without.balance).toBeUndefined();
  });

  it("rejects extra unknown fields [compile-time]", () => {
    // @ts-expect-error — 'chainId' is not in ConnectResponse
    const _extra: ConnectResponse = { address: "xion1abc", chainId: "xion-testnet-1" };
    void _extra;
    expect(true).toBe(true);
  });
});

// ─── GET_ADDRESS ───────────────────────────────────────────────────────────

describe("GetAddressResponse (GET_ADDRESS response)", () => {
  it("address is string when connected, null when not", () => {
    const connected: GetAddressResponse = { address: "xion1abc123" };
    const disconnected: GetAddressResponse = { address: null };
    expect(connected.address).toBeTruthy();
    expect(disconnected.address).toBeNull();
  });
});

// ─── ADD_AUTHENTICATOR ─────────────────────────────────────────────────────

describe("AddAuthenticatorResponse (ADD_AUTHENTICATOR response)", () => {
  it("contains a fully-shaped AuthenticatorData", () => {
    const auth: AuthenticatorData = {
      id: "1",
      type: "Secp256K1",
      authenticator: "0xpubkey",
      authenticatorIndex: 0,
    };
    const response: AddAuthenticatorResponse = { authenticator: auth };
    expect(response.authenticator.id).toBe("1");
    expect(typeof response.authenticator.authenticatorIndex).toBe("number");
  });

  it("rejects AuthenticatorData missing required fields [compile-time]", () => {
    // @ts-expect-error — 'authenticatorIndex' is required in AuthenticatorData
    const _incomplete: AuthenticatorData = { id: "1", type: "Secp256K1", authenticator: "0x" };
    void _incomplete;
    expect(true).toBe(true);
  });
});

// ─── REMOVE_AUTHENTICATOR / REQUEST_GRANT ─────────────────────────────────

describe("Boolean success responses", () => {
  it("RemoveAuthenticatorResponse has success: boolean", () => {
    const ok: RemoveAuthenticatorResponse = { success: true };
    const fail: RemoveAuthenticatorResponse = { success: false };
    expect(ok.success).toBe(true);
    expect(fail.success).toBe(false);
  });

  it("RequestGrantResponse has success: boolean", () => {
    const ok: RequestGrantResponse = { success: true };
    expect(typeof ok.success).toBe("boolean");
  });

  it("rejects extra fields on boolean responses [compile-time]", () => {
    // @ts-expect-error — 'grantee' is not in RemoveAuthenticatorResponse
    const _r: RemoveAuthenticatorResponse = { success: true, grantee: "xion1x" };
    // @ts-expect-error — 'treasury' is not in RequestGrantResponse
    const _g: RequestGrantResponse = { success: true, treasury: "xion1t" };
    void _r; void _g;
    expect(true).toBe(true);
  });
});

// ─── SIGN_TRANSACTION (sign-only, no broadcast) ────────────────────────────

describe("SignTransactionResponse (SIGN_TRANSACTION response)", () => {
  it("signedTx carries raw transaction bytes — not a hash", () => {
    const signedTx: SignedTransaction = {
      bodyBytes: new Uint8Array([1, 2, 3]),
      authInfoBytes: new Uint8Array([4, 5, 6]),
      signatures: [new Uint8Array([7, 8, 9])],
    };
    const response: SignTransactionResponse = { signedTx };
    expect(response.signedTx.bodyBytes).toBeInstanceOf(Uint8Array);
    expect(response.signedTx.signatures).toHaveLength(1);
  });

  it("is structurally incompatible with SignAndBroadcastResult [compile-time]", () => {
    // SignTransactionResponse carries raw bytes for caller-side broadcast.
    // SignAndBroadcastResult carries only the hash after dashboard-side broadcast.
    // These types must remain distinct — this test enforces that at compile time.
    const signed: SignTransactionResponse = {
      signedTx: {
        bodyBytes: new Uint8Array(),
        authInfoBytes: new Uint8Array(),
        signatures: [],
      },
    };
    // @ts-expect-error — SignTransactionResponse is not assignable to SignAndBroadcastResult
    const _asResult: SignAndBroadcastResult = signed;
    void _asResult;
    expect(true).toBe(true);
  });
});
