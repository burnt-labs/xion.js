/**
 * @vitest-environment jsdom
 *
 * Tests proving the session restoration bug introduced by PR #336 (Jan 17 2026)
 * and verifying the fix.
 *
 * PR #336 changed fetchChainGrantsABCI to return REST-format authorizations
 * ({"@type": ..., spend_limit: [...]}) instead of raw protobuf ({typeUrl, value}).
 *
 * This broke compareGrantsToTreasuryWithConfigs which called decodeAuthorization()
 * on chain grants — that function expects raw protobuf (typeUrl + value bytes),
 * but now receives REST objects where .typeUrl is undefined.
 */
import { describe, it, expect } from "vitest";
import {
  decodeAuthorization,
  decodeRestFormatAuthorization,
} from "@/utils/grant/decoding";
import { compareChainGrantsToTreasuryGrants } from "@/utils/grant/compare";
import { AuthorizationTypes } from "@/utils/grant/constants";
import type { DecodedReadableAuthorization } from "@/types";

// ─── Test data ──────────────────────────────────────────────────────────────
// Base64-encoded protobuf values from existing GrantUtils tests (known-good)
const SEND_AUTH_BASE64 =
  "Cg0KBXV4aW9uEgQxMDAwEj94aW9uMWY3YzNjZDI2czh2ZXE5cnA5NHQ3eXNyZWFjejRhZW1laDB0bDB3Y215c2xqZ3JtNnFhcHF1NmpoNXg=";
const GENERIC_AUTH_BASE64 =
  "CigvY29zbXdhc20ud2FzbS52MS5Nc2dJbnN0YW50aWF0ZUNvbnRyYWN0";

// What fetchChainGrantsABCI returned BEFORE PR #336 (raw protobuf format)
const preJan17ChainGrant_Send = {
  typeUrl: "/cosmos.bank.v1beta1.SendAuthorization",
  value: SEND_AUTH_BASE64,
};

const preJan17ChainGrant_Generic = {
  typeUrl: "/cosmos.authz.v1beta1.GenericAuthorization",
  value: GENERIC_AUTH_BASE64,
};

// What fetchChainGrantsABCI returns AFTER PR #336 (REST JSON format)
const postJan17ChainGrant_Send = {
  "@type": "/cosmos.bank.v1beta1.SendAuthorization",
  spend_limit: [{ denom: "uxion", amount: "1000" }],
  allow_list: [
    "xion1f7c3cd26s8veq9rp94t7ysreacz4aemeh0tl0wcmysljgrm6qapqu6jh5x",
  ],
};

const postJan17ChainGrant_Generic = {
  "@type": "/cosmos.authz.v1beta1.GenericAuthorization",
  msg: "/cosmwasm.wasm.v1.MsgInstantiateContract",
};

// Treasury configs always come as raw protobuf (from indexer), unchanged by PR #336
const treasuryConfig_Send = {
  authorization: {
    type_url: "/cosmos.bank.v1beta1.SendAuthorization",
    value: SEND_AUTH_BASE64,
  },
};

const treasuryConfig_Generic = {
  authorization: {
    type_url: "/cosmos.authz.v1beta1.GenericAuthorization",
    value: GENERIC_AUTH_BASE64,
  },
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("Treasury grant comparison — session restoration bug", () => {
  describe("PRE PR #336: decodeAuthorization on raw protobuf — works", () => {
    it("decodes SendAuthorization from raw protobuf correctly", () => {
      const result = decodeAuthorization(
        preJan17ChainGrant_Send.typeUrl,
        preJan17ChainGrant_Send.value,
      );
      expect(result.type).toBe(AuthorizationTypes.Send);
      expect(result.data).toHaveProperty("spendLimit");
    });

    it("decodes GenericAuthorization from raw protobuf correctly", () => {
      const result = decodeAuthorization(
        preJan17ChainGrant_Generic.typeUrl,
        preJan17ChainGrant_Generic.value,
      );
      expect(result.type).toBe(AuthorizationTypes.Generic);
      expect(result.data).toHaveProperty("msg");
    });

    it("treasury comparison succeeds with raw protobuf chain grants", () => {
      // Decode chain grants from raw protobuf (pre-PR #336 path)
      const decodedChain = [preJan17ChainGrant_Send].map((g) =>
        decodeAuthorization(g.typeUrl, g.value),
      );
      const decodedTreasury = [treasuryConfig_Send].map((t) =>
        decodeAuthorization(t.authorization.type_url, t.authorization.value),
      );
      expect(
        compareChainGrantsToTreasuryGrants(decodedChain, decodedTreasury).match,
      ).toBe(true);
    });
  });

  describe("POST PR #336 BUG: decodeAuthorization on REST format — broken", () => {
    it("decodeAuthorization returns Unsupported when given REST-format (no .typeUrl)", () => {
      // This is the bug: AbstraxionAuth.compareGrantsToTreasuryWithConfigs
      // calls decodeAuthorization(grant.authorization.typeUrl, grant.authorization.value)
      // but after PR #336, .typeUrl is undefined (it's "@type" now)
      const restAuth = postJan17ChainGrant_Send as any;
      const result = decodeAuthorization(restAuth.typeUrl, restAuth.value);
      expect(result.type).toBe(AuthorizationTypes.Unsupported);
      expect(result.data).toBeNull();
    });

    it("treasury comparison FAILS when chain grants are REST format fed through decodeAuthorization", () => {
      // Simulate what compareGrantsToTreasuryWithConfigs does post-PR #336
      const decodedChain = [postJan17ChainGrant_Send].map((g) => {
        const auth = g as any;
        return decodeAuthorization(auth.typeUrl, auth.value);
        // auth.typeUrl = undefined, auth.value = undefined → Unsupported
      });
      const decodedTreasury = [treasuryConfig_Send].map((t) =>
        decodeAuthorization(t.authorization.type_url, t.authorization.value),
      );

      // All chain grants are Unsupported → decode_error
      expect(
        decodedChain.every((d) => d.type === AuthorizationTypes.Unsupported),
      ).toBe(true);
      const result = compareChainGrantsToTreasuryGrants(decodedChain, decodedTreasury);
      expect(result.match).toBe(false);
      expect(result.match === false && result.reason).toBe("decode_error");
    });
  });

  describe("FIX: decodeRestFormatAuthorization correctly handles REST format", () => {
    it("converts REST-format SendAuthorization to DecodedReadableAuthorization", () => {
      const result = decodeRestFormatAuthorization(postJan17ChainGrant_Send);
      expect(result.type).toBe(AuthorizationTypes.Send);
      expect(result.data).toHaveProperty("spendLimit");
      expect((result.data as any).spendLimit).toEqual([
        { denom: "uxion", amount: "1000" },
      ]);
      expect((result.data as any).allowList).toEqual([
        "xion1f7c3cd26s8veq9rp94t7ysreacz4aemeh0tl0wcmysljgrm6qapqu6jh5x",
      ]);
    });

    it("converts REST-format GenericAuthorization to DecodedReadableAuthorization", () => {
      const result = decodeRestFormatAuthorization(postJan17ChainGrant_Generic);
      expect(result.type).toBe(AuthorizationTypes.Generic);
      expect((result.data as any).msg).toBe(
        "/cosmwasm.wasm.v1.MsgInstantiateContract",
      );
    });

    it("converts REST-format StakeAuthorization to DecodedReadableAuthorization", () => {
      const restStake = {
        "@type": "/cosmos.staking.v1beta1.StakeAuthorization",
        max_tokens: { denom: "uxion", amount: "5000" },
        authorization_type: "AUTHORIZATION_TYPE_DELEGATE",
        allow_list: ["xionvaloper1abc"],
        deny_list: [],
      };
      const result = decodeRestFormatAuthorization(restStake);
      expect(result.type).toBe(AuthorizationTypes.Stake);
      expect((result.data as any).authorizationType).toBe(1); // numeric enum
      expect((result.data as any).maxTokens).toEqual({
        denom: "uxion",
        amount: "5000",
      });
    });

    it("returns Unsupported for unknown @type", () => {
      const result = decodeRestFormatAuthorization({
        "@type": "/unknown.type",
      });
      expect(result.type).toBe(AuthorizationTypes.Unsupported);
    });

    it("treasury comparison SUCCEEDS with fixed path", () => {
      // Use decodeRestFormatAuthorization for chain grants (the fix)
      const decodedChain = [postJan17ChainGrant_Send].map((g) =>
        decodeRestFormatAuthorization(g),
      );
      // Treasury configs still use raw protobuf → decodeAuthorization
      const decodedTreasury = [treasuryConfig_Send].map((t) =>
        decodeAuthorization(t.authorization.type_url, t.authorization.value),
      );

      expect(
        compareChainGrantsToTreasuryGrants(decodedChain, decodedTreasury).match,
      ).toBe(true);
    });

    it("produces equivalent DecodedReadableAuthorization as the raw protobuf path", () => {
      // The fix should produce the same decoded result as the original protobuf path
      const fromProtobuf = decodeAuthorization(
        preJan17ChainGrant_Send.typeUrl,
        preJan17ChainGrant_Send.value,
      );
      const fromRest = decodeRestFormatAuthorization(postJan17ChainGrant_Send);

      expect(fromRest.type).toBe(fromProtobuf.type);
      // Both should have spendLimit and allowList with same values
      expect((fromRest.data as any).spendLimit).toEqual(
        (fromProtobuf.data as any).spendLimit,
      );
      expect((fromRest.data as any).allowList).toEqual(
        (fromProtobuf.data as any).allowList,
      );
    });
  });
});
