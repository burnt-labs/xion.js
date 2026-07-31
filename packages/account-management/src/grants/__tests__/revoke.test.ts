import { describe, it, expect } from "vitest";
import {
  getMsgTypeUrlForRevoke,
  STAKE_AUTHORIZATION_TYPE_URL,
} from "../revoke";

describe("getMsgTypeUrlForRevoke", () => {
  describe("simple authorization → msg mappings", () => {
    it.each([
      [
        "/cosmos.bank.v1beta1.SendAuthorization",
        "/cosmos.bank.v1beta1.MsgSend",
      ],
      ["/cosmos.gov.v1beta1.VoteAuthorization", "/cosmos.gov.v1beta1.MsgVote"],
      ["/cosmos.gov.v1.VoteAuthorization", "/cosmos.gov.v1.MsgVote"],
      [
        "/ibc.applications.transfer.v1.TransferAuthorization",
        "/ibc.applications.transfer.v1.MsgTransfer",
      ],
      [
        "/cosmwasm.wasm.v1.ContractExecutionAuthorization",
        "/cosmwasm.wasm.v1.MsgExecuteContract",
      ],
      [
        "/cosmwasm.wasm.v1.ContractMigrationAuthorization",
        "/cosmwasm.wasm.v1.MsgMigrateContract",
      ],
      [
        "/cosmos.distribution.v1beta1.SetWithdrawAddressAuthorization",
        "/cosmos.distribution.v1beta1.MsgSetWithdrawAddress",
      ],
    ])("maps %s → %s", (authType, expected) => {
      expect(getMsgTypeUrlForRevoke(authType)).toBe(expected);
    });
  });

  describe("StakeAuthorization variants", () => {
    it.each([
      ["AUTHORIZATION_TYPE_DELEGATE", "/cosmos.staking.v1beta1.MsgDelegate"],
      [1, "/cosmos.staking.v1beta1.MsgDelegate"],
      ["1", "/cosmos.staking.v1beta1.MsgDelegate"],
      [
        "AUTHORIZATION_TYPE_UNDELEGATE",
        "/cosmos.staking.v1beta1.MsgUndelegate",
      ],
      [2, "/cosmos.staking.v1beta1.MsgUndelegate"],
      ["2", "/cosmos.staking.v1beta1.MsgUndelegate"],
      [
        "AUTHORIZATION_TYPE_REDELEGATE",
        "/cosmos.staking.v1beta1.MsgBeginRedelegate",
      ],
      [3, "/cosmos.staking.v1beta1.MsgBeginRedelegate"],
      ["3", "/cosmos.staking.v1beta1.MsgBeginRedelegate"],
    ])(
      "maps StakeAuthorization with type %s → %s",
      (stakeAuthType, expected) => {
        expect(
          getMsgTypeUrlForRevoke(STAKE_AUTHORIZATION_TYPE_URL, stakeAuthType),
        ).toBe(expected);
      },
    );

    it("falls back to the authorization type url for an unknown stake type", () => {
      expect(
        getMsgTypeUrlForRevoke(
          STAKE_AUTHORIZATION_TYPE_URL,
          "AUTHORIZATION_TYPE_UNSPECIFIED",
        ),
      ).toBe(STAKE_AUTHORIZATION_TYPE_URL);
    });

    it("falls back when no stake type is provided", () => {
      expect(getMsgTypeUrlForRevoke(STAKE_AUTHORIZATION_TYPE_URL)).toBe(
        STAKE_AUTHORIZATION_TYPE_URL,
      );
    });
  });

  describe("unmapped authorizations", () => {
    it("returns the input for GenericAuthorization (caller handles its msg field)", () => {
      const generic = "/cosmos.authz.v1beta1.GenericAuthorization";
      expect(getMsgTypeUrlForRevoke(generic)).toBe(generic);
    });

    it("returns the input for an unrecognized authorization type", () => {
      expect(getMsgTypeUrlForRevoke("/some.unknown.Authorization")).toBe(
        "/some.unknown.Authorization",
      );
    });

    it("ignores stakeAuthType for non-stake authorizations", () => {
      expect(
        getMsgTypeUrlForRevoke("/cosmos.bank.v1beta1.SendAuthorization", 1),
      ).toBe("/cosmos.bank.v1beta1.MsgSend");
    });
  });
});
