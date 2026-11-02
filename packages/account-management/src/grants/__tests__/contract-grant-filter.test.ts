import { describe, it, expect } from "vitest";
import { MsgGrant } from "cosmjs-types/cosmos/authz/v1beta1/tx";
import {
  AcceptedMessageKeysFilter,
  AllowAllMessagesFilter,
  CombinedLimit,
  ContractExecutionAuthorization,
  MaxCallsLimit,
} from "cosmjs-types/cosmwasm/wasm/v1/authz";
import {
  ContractExecFilterTypes,
  ContractExecLimitTypes,
  decodeAuthorization,
  type HumanContractExecAuth,
} from "@burnt-labs/abstraxion-core";
import { buildGrantMessages, generateContractGrant } from "../construction";
import type { ContractGrantDescription } from "../../types/grants";

const granter = "xion1granter123456789";
const grantee = "xion1grantee123456789";
const vault = "xion1vaultcontract123456789";
const expiration = BigInt(1_900_000_000);
const keys = ["admit_private", "cancel_pending_admission"];

const vaultGrant = (
  overrides: Record<string, unknown> = {},
): ContractGrantDescription =>
  ({
    address: vault,
    amounts: [],
    acceptedMessageKeys: keys,
    maxCalls: 50,
    ...overrides,
  }) as ContractGrantDescription;

const decodeGrant = (contracts: ContractGrantDescription[]) => {
  const msg = generateContractGrant(expiration, grantee, granter, contracts);
  const value = msg.value as MsgGrant;
  return {
    msg,
    value,
    authorization: ContractExecutionAuthorization.decode(
      value.grant!.authorization!.value,
    ),
  };
};

describe("generateContractGrant() with acceptedMessageKeys and maxCalls", () => {
  describe("filter encoding", () => {
    it("encodes AcceptedMessageKeysFilter with exactly the requested keys", () => {
      const { msg, value, authorization } = decodeGrant([vaultGrant()]);

      expect(msg.typeUrl).toBe(MsgGrant.typeUrl);
      expect(value.grant!.authorization!.typeUrl).toBe(
        ContractExecutionAuthorization.typeUrl,
      );
      const [grant] = authorization.grants;
      expect(grant.filter!.typeUrl).toBe(AcceptedMessageKeysFilter.typeUrl);
      expect(
        AcceptedMessageKeysFilter.decode(grant.filter!.value).keys,
      ).toEqual(keys);
    });

    it("encodes MaxCallsLimit with the call budget when amounts is empty", () => {
      const [grant] = decodeGrant([vaultGrant()]).authorization.grants;

      expect(grant.limit!.typeUrl).toBe(MaxCallsLimit.typeUrl);
      expect(MaxCallsLimit.decode(grant.limit!.value).remaining).toBe(50n);
    });

    it("encodes CombinedLimit with call budget and sorted funds when amounts is set", () => {
      const [grant] = decodeGrant([
        vaultGrant({
          amounts: [
            { denom: "uxion", amount: "100" },
            { denom: "ibc/ABC", amount: "7" },
          ],
        }),
      ]).authorization.grants;

      expect(grant.limit!.typeUrl).toBe(CombinedLimit.typeUrl);
      const limit = CombinedLimit.decode(grant.limit!.value);
      expect(limit.callsRemaining).toBe(50n);
      expect(limit.amounts).toEqual([
        { denom: "ibc/ABC", amount: "7" },
        { denom: "uxion", amount: "100" },
      ]);
      expect(grant.filter!.typeUrl).toBe(AcceptedMessageKeysFilter.typeUrl);
    });

    it("defaults the call budget to 255 when only keys are given", () => {
      const [grant] = decodeGrant([
        { address: vault, amounts: [], acceptedMessageKeys: keys },
      ]).authorization.grants;

      expect(MaxCallsLimit.decode(grant.limit!.value).remaining).toBe(255n);
    });

    it("keeps legacy descriptions on AllowAllMessagesFilter and their old limits", () => {
      const { authorization } = decodeGrant([
        "xion1legacystring",
        { address: "xion1legacyobject", amounts: [] },
      ]);

      expect(authorization.grants.map((g) => g.filter!.typeUrl)).toEqual([
        AllowAllMessagesFilter.typeUrl,
        AllowAllMessagesFilter.typeUrl,
      ]);
      expect(authorization.grants.map((g) => g.limit!.typeUrl)).toEqual([
        MaxCallsLimit.typeUrl,
        CombinedLimit.typeUrl,
      ]);
    });
  });

  describe("single-contract restriction", () => {
    it("names only the requested contract", () => {
      const { authorization } = decodeGrant([vaultGrant()]);

      expect(authorization.grants.map((g) => g.contract)).toEqual([vault]);
    });

    it("keeps the filter on its own entry when other contracts are listed", () => {
      const { authorization } = decodeGrant(["xion1other", vaultGrant()]);

      expect(
        authorization.grants.map((g) => [g.contract, g.filter!.typeUrl]),
      ).toEqual([
        ["xion1other", AllowAllMessagesFilter.typeUrl],
        [vault, AcceptedMessageKeysFilter.typeUrl],
      ]);
    });

    it.each([
      ["a string entry", vault],
      ["an upper-case string entry", vault.toUpperCase()],
      ["a legacy object entry", { address: vault, amounts: [] }],
      [
        "a second filtered entry",
        vaultGrant({ acceptedMessageKeys: ["revoke"] }),
      ],
    ])("rejects a filtered contract that also has %s", (_name, other) => {
      expect(() =>
        generateContractGrant(expiration, grantee, granter, [
          vaultGrant(),
          other as ContractGrantDescription,
        ]),
      ).toThrow(`Filtered contract grant for ${vault} must be its only entry`);
    });
  });

  describe("rejection of unknown keys", () => {
    it("rejects unknown fields on a filtered description", () => {
      expect(() =>
        generateContractGrant(expiration, grantee, granter, [
          vaultGrant({ acceptedKeys: keys }),
        ]),
      ).toThrow("Contract grant has unknown fields: acceptedKeys");
    });

    it("legacy entries still ignore unknown fields", () => {
      const { authorization } = decodeGrant([
        { address: vault, amounts: [], acceptedKeys: keys } as never,
      ]);

      expect(authorization.grants).toHaveLength(1);
      expect(authorization.grants[0].limit!.typeUrl).toBe(
        CombinedLimit.typeUrl,
      );
      expect(authorization.grants[0].filter!.typeUrl).toBe(
        AllowAllMessagesFilter.typeUrl,
      );
    });

    it.each([
      ["undefined", undefined],
      ["an empty list", []],
      ["an empty key", ["admit_private", ""]],
      ["a key with whitespace", [" admit_private"]],
      ["a duplicate key", ["admit_private", "admit_private"]],
      ["a non-string key", ["admit_private", 7]],
      ["a string", "admit_private"],
    ])(
      "rejects acceptedMessageKeys that is %s",
      (_name, acceptedMessageKeys) => {
        expect(() =>
          generateContractGrant(expiration, grantee, granter, [
            vaultGrant({ acceptedMessageKeys }),
          ]),
        ).toThrow(/acceptedMessageKeys must be/);
      },
    );

    it.each([0, -1, 1.5, "5", Number.MAX_SAFE_INTEGER + 1])(
      "rejects maxCalls %s",
      (maxCalls) => {
        expect(() =>
          generateContractGrant(expiration, grantee, granter, [
            vaultGrant({ maxCalls }),
          ]),
        ).toThrow("maxCalls must be a positive integer");
      },
    );

    it("rejects a filtered description without amounts", () => {
      expect(() =>
        generateContractGrant(expiration, grantee, granter, [
          vaultGrant({ amounts: undefined }),
        ]),
      ).toThrow("Filtered contract grant needs an address and amounts");
    });
  });

  describe("expiry and limits round-trip", () => {
    it("round-trips granter, grantee, expiry, keys and call budget through protobuf", () => {
      const { msg } = decodeGrant([vaultGrant()]);
      const decoded = MsgGrant.decode(
        MsgGrant.encode(msg.value as MsgGrant).finish(),
      );

      expect(decoded.granter).toBe(granter);
      expect(decoded.grantee).toBe(grantee);
      expect(decoded.grant!.expiration!.seconds).toBe(expiration);

      const readable = decodeAuthorization(
        decoded.grant!.authorization!.typeUrl,
        decoded.grant!.authorization!.value,
      );
      expect((readable.data as HumanContractExecAuth).grants).toEqual([
        expect.objectContaining({
          address: vault,
          limitType: ContractExecLimitTypes.MaxCalls,
          maxCalls: "50",
          filterType: ContractExecFilterTypes.AcceptedKeys,
          keys,
        }),
      ]);
    });

    it("passes the options through buildGrantMessages", () => {
      const [msg] = buildGrantMessages({
        granter,
        grantee,
        expiration,
        contracts: [vaultGrant()],
      });
      const authorization = ContractExecutionAuthorization.decode(
        (msg.value as MsgGrant).grant!.authorization!.value,
      );

      expect((msg.value as MsgGrant).grant!.expiration!.seconds).toBe(
        expiration,
      );
      expect(
        AcceptedMessageKeysFilter.decode(authorization.grants[0].filter!.value)
          .keys,
      ).toEqual(keys);
    });
  });
});
