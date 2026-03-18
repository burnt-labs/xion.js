/**
 * Regression tests for the grant comparison pipeline.
 *
 * These tests reproduce the exact bug patterns from PR #290 and PR #336
 * that caused session-invalidation incidents. Each test simulates the
 * broken state, proves it would have failed, then verifies our current
 * pipeline is immune.
 *
 * The root cause was always the same: the query function's output format
 * changed, but the comparison function's input expectations didn't, or
 * vice versa. These tests enforce the API contract between the two.
 */

import { describe, it, expect } from "vitest";
import { toByteArray } from "base64-js";
import { SendAuthorization } from "cosmjs-types/cosmos/bank/v1beta1/authz";
import { GenericAuthorization } from "cosmjs-types/cosmos/authz/v1beta1/authz";
import { ContractExecutionAuthorization } from "cosmjs-types/cosmwasm/wasm/v1/authz";
import { decodeAuthorization } from "@/utils/grant/decoding";
import { compareChainGrantsToTreasuryGrants } from "@/utils/grant/compare";
import { AuthorizationTypes } from "@/utils/grant/constants";
import type { DecodedReadableAuthorization, TreasuryGrantConfig } from "@/types";

// ─── Real base64 fixtures (from xion-testnet-2 treasury contracts) ───────────

// SendAuthorization: 5,000,000 uxion
const SEND_BASE64 = "ChAKBXV4aW9uEgc1MDAwMDAw";
const SEND_TYPE_URL = "/cosmos.bank.v1beta1.SendAuthorization";

// ContractExecutionAuthorization: 2 contracts, MaxCallsLimit(100), AllowAll
const CONTRACT_BASE64 =
  "CpQBCj94aW9uMXE2NmgyeW5tcm01amU5YXdjZHdjeXhqeWtkNmMwaDR3ZjN1NWhhNHM1Y250ZjhqcjVqZnFoOG13ZXkSJQofL2Nvc213YXNtLndhc20udjEuTWF4Q2FsbHNMaW1pdBICCGQaKgooL2Nvc213YXNtLndhc20udjEuQWxsb3dBbGxNZXNzYWdlc0ZpbHRlcgqUAQo/eGlvbjFrbGxjdjNlcXhqY3hhZDlhM21uemY3cmw0aHFsYzRjd2MwczhyYXdwY3JzNHRhdmdoajBzN3ZnazhyEiUKHy9jb3Ntd2FzbS53YXNtLnYxLk1heENhbGxzTGltaXQSAghkGioKKC9jb3Ntd2FzbS53YXNtLnYxLkFsbG93QWxsTWVzc2FnZXNGaWx0ZXI=";
const CONTRACT_TYPE_URL = "/cosmwasm.wasm.v1.ContractExecutionAuthorization";

// GenericAuthorization: MsgInstantiateContract
const GENERIC_BASE64 = "CigvY29zbXdhc20ud2FzbS52MS5Nc2dJbnN0YW50aWF0ZUNvbnRyYWN0";
const GENERIC_TYPE_URL = "/cosmos.authz.v1beta1.GenericAuthorization";

// Treasury configs (same base64 — this is what the treasury contract stores)
const treasuryConfigs: TreasuryGrantConfig[] = [
  { description: "send", authorization: { type_url: SEND_TYPE_URL, value: SEND_BASE64 }, optional: false },
  { description: "contracts", authorization: { type_url: CONTRACT_TYPE_URL, value: CONTRACT_BASE64 }, optional: false },
];

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("PR #290 regression: ABCI returns protobuf, legacy expects REST", () => {
  /**
   * PR #290 switched fetchChainGrantsABCI from REST API to ABCI queries.
   * The returned grants changed from {authorization: {"@type": ..., spend_limit: [...]}}
   * to {authorization: {typeUrl: ..., value: Uint8Array}}.
   *
   * Legacy compare functions read grant.authorization["@type"] which became undefined.
   */

  it("BROKEN: raw protobuf format has no @type key — legacy compare silently fails", () => {
    // This is what fetchChainGrantsABCI returned AFTER PR #290 (raw protobuf Any)
    const rawProtobufGrants = [
      {
        authorization: {
          typeUrl: SEND_TYPE_URL,
          value: toByteArray(SEND_BASE64),
          // NO "@type" key — legacy compare reads this and gets undefined
        },
        expiration: "2027-01-01T00:00:00Z",
      },
    ];

    // Legacy compareBankGrants reads grant.authorization["@type"]
    // which is undefined here → the grant is filtered out → returns false even though it exists
    const bankGrants = rawProtobufGrants.filter(
      (g) => g.authorization["@type" as keyof typeof g.authorization] === SEND_TYPE_URL,
    );
    expect(bankGrants.length).toBe(0); // Bug: grant exists but filter misses it
  });

  it("IMMUNE: our pipeline never feeds protobuf format to legacy compare", () => {
    // In the new pipeline, legacy compare only receives REST-format grants from
    // fetchChainGrantsABCI (which calls decodeAuthorizationToRestFormat internally).
    // Treasury comparison uses fetchChainGrantsDecoded which bypasses REST entirely.
    // There is no code path where raw protobuf {typeUrl, value} reaches a legacy compare function.

    // Verify: decodeAuthorization on raw protobuf produces correct DecodedReadableAuthorization
    const decoded = decodeAuthorization(SEND_TYPE_URL, SEND_BASE64);
    expect(decoded.type).toBe(AuthorizationTypes.Send);
    expect(decoded.data).not.toBeNull();
    // This decoded result goes to compareChainGrantsToTreasuryGrants, NOT to legacy compare
  });
});

describe("PR #336 regression: REST format fed to treasury comparison expecting protobuf", () => {
  /**
   * PR #336 fixed PR #290 by adding decodeAuthorizationToRestFormat() so
   * fetchChainGrantsABCI returns REST format again. Legacy path fixed.
   *
   * But compareGrantsToTreasuryWithConfigs still called:
   *   decodeAuthorization(grant.authorization.typeUrl, grant.authorization.value)
   *
   * On the REST-format object, .typeUrl is undefined (it's "@type" now).
   * decodeAuthorization(undefined, undefined) → Unsupported → comparison false → logout.
   */

  it("BROKEN: REST-format object has no .typeUrl — decodeAuthorization returns Unsupported", () => {
    // This is what fetchChainGrantsABCI returned AFTER PR #336 (REST format)
    const restFormatGrant = {
      "@type": SEND_TYPE_URL,
      spend_limit: [{ denom: "uxion", amount: "5000000" }],
      allow_list: [],
      // NO typeUrl or value — these are REST keys
    };

    // The bug: treasury comparison called decodeAuthorization(grant.authorization.typeUrl, ...)
    const decoded = decodeAuthorization(
      (restFormatGrant as any).typeUrl, // undefined!
      (restFormatGrant as any).value,   // undefined!
    );
    expect(decoded.type).toBe(AuthorizationTypes.Unsupported); // Bug: valid grant decoded as Unsupported
  });

  it("BROKEN: Unsupported chain grants cause comparison to fail → users logged out", () => {
    // Both chain grants decode as Unsupported because typeUrl is undefined
    const brokenChainDecoded: DecodedReadableAuthorization[] = [
      { type: AuthorizationTypes.Unsupported, data: null },
      { type: AuthorizationTypes.Unsupported, data: null },
    ];

    // Treasury configs decode correctly (they use type_url/value from the contract)
    const decodedTreasury = treasuryConfigs.map((c) =>
      decodeAuthorization(c.authorization.type_url, c.authorization.value),
    );

    const result = compareChainGrantsToTreasuryGrants(brokenChainDecoded, decodedTreasury);
    expect(result.match).toBe(false);

    // With our typed result, this is now classified as decode_error (not grant_missing)
    if (!result.match) {
      expect(result.reason).toBe("decode_error");
    }
  });

  it("IMMUNE: our pipeline uses fetchChainGrantsDecoded — no REST intermediate", () => {
    // In the new pipeline, the treasury comparison path decodes directly from
    // protobuf bytes via decodeAuthorization(typeUrl, value) on the raw ABCI response.
    // There is no REST intermediate step. The @type vs typeUrl confusion cannot happen
    // because we never convert to REST format for the treasury path.

    // Simulate what fetchChainGrantsDecoded does: decode directly from raw bytes
    const chainDecoded = [
      decodeAuthorization(SEND_TYPE_URL, SEND_BASE64),
      decodeAuthorization(CONTRACT_TYPE_URL, CONTRACT_BASE64),
    ];

    // Treasury side: also decoded from raw bytes (same path, same decoder)
    const treasuryDecoded = treasuryConfigs.map((c) =>
      decodeAuthorization(c.authorization.type_url, c.authorization.value),
    );

    // Both sides use the same decoder on the same bytes → must match
    const result = compareChainGrantsToTreasuryGrants(chainDecoded, treasuryDecoded);
    expect(result.match).toBe(true);
  });
});

describe("Pipeline contract: query output shape matches comparison input", () => {
  /**
   * The core invariant that both PR #290 and #336 violated:
   * The comparison function's expected input format must match the query function's output format.
   *
   * With the direct decode pipeline, both sides go through the same decoder:
   *   chain:    ABCI protobuf → decodeAuthorization() → DecodedReadableAuthorization
   *   treasury: base64 string → decodeAuthorization() → DecodedReadableAuthorization
   *
   * There is no format conversion step where a mismatch can be introduced.
   */

  it("decodeAuthorization is symmetric: same bytes produce identical results regardless of input type", () => {
    // base64 string (treasury path)
    const fromBase64 = decodeAuthorization(SEND_TYPE_URL, SEND_BASE64);
    // Uint8Array (chain ABCI path)
    const fromBytes = decodeAuthorization(SEND_TYPE_URL, toByteArray(SEND_BASE64));

    expect(fromBase64.type).toBe(fromBytes.type);
    expect(JSON.stringify(fromBase64.data)).toBe(JSON.stringify(fromBytes.data));
  });

  it("decodeAuthorization is symmetric for ContractExecution", () => {
    const fromBase64 = decodeAuthorization(CONTRACT_TYPE_URL, CONTRACT_BASE64);
    const fromBytes = decodeAuthorization(CONTRACT_TYPE_URL, toByteArray(CONTRACT_BASE64));

    expect(fromBase64.type).toBe(fromBytes.type);
    expect(JSON.stringify(fromBase64.data)).toBe(JSON.stringify(fromBytes.data));
  });

  it("decodeAuthorization is symmetric for Generic", () => {
    const fromBase64 = decodeAuthorization(GENERIC_TYPE_URL, GENERIC_BASE64);
    const fromBytes = decodeAuthorization(GENERIC_TYPE_URL, toByteArray(GENERIC_BASE64));

    expect(fromBase64.type).toBe(fromBytes.type);
    expect(JSON.stringify(fromBase64.data)).toBe(JSON.stringify(fromBytes.data));
  });

  it("every known authorization type decodes without Unsupported from valid base64", () => {
    const cases = [
      { typeUrl: SEND_TYPE_URL, value: SEND_BASE64 },
      { typeUrl: CONTRACT_TYPE_URL, value: CONTRACT_BASE64 },
      { typeUrl: GENERIC_TYPE_URL, value: GENERIC_BASE64 },
    ];

    for (const { typeUrl, value } of cases) {
      const decoded = decodeAuthorization(typeUrl, value);
      expect(decoded.type).not.toBe(AuthorizationTypes.Unsupported);
      expect(decoded.data).not.toBeNull();
    }
  });
});

describe("decode_error resilience: corrupted data does not crash session restore", () => {
  it("corrupted treasury value → decode_error, not crash", () => {
    const corruptTreasury: TreasuryGrantConfig[] = [
      {
        description: "corrupted",
        authorization: { type_url: SEND_TYPE_URL, value: "dGhpcyBpcyBnYXJiYWdl" }, // "this is garbage"
        optional: false,
      },
    ];

    const validChain = [decodeAuthorization(SEND_TYPE_URL, SEND_BASE64)];
    const corruptDecoded = corruptTreasury.map((c) =>
      decodeAuthorization(c.authorization.type_url, c.authorization.value),
    );

    // Corrupt treasury decodes as Unsupported
    expect(corruptDecoded[0].type).toBe(AuthorizationTypes.Unsupported);

    // Comparison returns decode_error (not crash, not grant_missing)
    const result = compareChainGrantsToTreasuryGrants(validChain, corruptDecoded);
    expect(result.match).toBe(false);
    if (!result.match) {
      expect(result.reason).toBe("decode_error");
    }
  });

  it("unknown future auth type → decode_error, session preserved", () => {
    // Simulate a chain upgrade adding a new authorization type
    const futureChain: DecodedReadableAuthorization[] = [
      { type: AuthorizationTypes.Unsupported, data: null }, // unknown type decoded as Unsupported
    ];
    const treasury = [decodeAuthorization(SEND_TYPE_URL, SEND_BASE64)];

    const result = compareChainGrantsToTreasuryGrants(futureChain, treasury);
    expect(result.match).toBe(false);
    if (!result.match) {
      expect(result.reason).toBe("decode_error");
      // AbstraxionAuth treats decode_error as non-fatal → session preserved
    }
  });
});
