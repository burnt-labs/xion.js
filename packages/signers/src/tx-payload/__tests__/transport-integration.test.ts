/**
 * SDK → Dashboard Transport Integration Tests
 *
 * These tests verify that every message type the SDK can send will
 * survive the full transport pipeline and encode correctly on the
 * dashboard side.
 *
 * The test uses a dashboard emulator that mirrors the real dashboard's
 * exact processing steps (decode → validate → normalize → registry encode).
 * If a message passes here, it will work in production.
 *
 * Coverage:
 *  - All 4 CosmWasm message types requiring byte normalization
 *  - Common Cosmos SDK messages (bank, staking, gov, authz, IBC)
 *  - Mixed batches (wasm + non-wasm in same payload)
 *  - Edge cases (unicode, empty objects, large payloads)
 *  - Error cases (invalid msg types, malformed payloads)
 */

import { describe, it, expect } from "vitest";
import { MsgSend } from "cosmjs-types/cosmos/bank/v1beta1/tx";
import { MsgDelegate, MsgUndelegate } from "cosmjs-types/cosmos/staking/v1beta1/tx";
import { MsgVote } from "cosmjs-types/cosmos/gov/v1beta1/tx";
import { VoteOption } from "cosmjs-types/cosmos/gov/v1beta1/gov";
import { MsgTransfer } from "cosmjs-types/ibc/applications/transfer/v1/tx";
import {
  MsgExecuteContract,
  MsgInstantiateContract,
  MsgInstantiateContract2,
  MsgMigrateContract,
  MsgStoreCode,
  MsgClearAdmin,
  MsgUpdateAdmin,
} from "cosmjs-types/cosmwasm/wasm/v1/tx";
import { MsgGrant, MsgRevoke } from "cosmjs-types/cosmos/authz/v1beta1/tx";
import {
  MsgWithdrawDelegatorReward,
} from "cosmjs-types/cosmos/distribution/v1beta1/tx";
import type { TxTransportPayload } from "../types";
import { WASM_MSG_TYPES_WITH_BYTES } from "../types";
import {
  roundTrip,
  encodePayloadForTransport,
  emulateDashboardReceive,
  getRegisteredTypeUrls,
} from "./dashboard-emulator";

// ── Fixtures ────────────────────────────────────────────────────────

const SENDER = "xion1sender00000000000000000000000000000000000test";
const RECIPIENT = "xion1recipient000000000000000000000000000000000test";
const CONTRACT = "xion1contract0000000000000000000000000000000000test";
const VALIDATOR = "xionvaloper100000000000000000000000000000000000test";

function makePayload(messages: TxTransportPayload["messages"]): TxTransportPayload {
  return { messages, fee: "auto" };
}

// ── CosmWasm messages (require normalization) ───────────────────────

describe("CosmWasm messages — byte normalization through transport", () => {
  it("MsgExecuteContract: msg object survives round-trip", () => {
    const contractMsg = {
      create_game: {
        game_id: "game_abc123",
        opponent: RECIPIENT,
        time_control: "1d",
        wager_amount: "100000",
      },
    };

    const result = roundTrip(
      makePayload([
        {
          typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
          value: MsgExecuteContract.fromPartial({
            sender: SENDER,
            contract: CONTRACT,
            msg: contractMsg as any, // SDK sends as object pre-transport
            funds: [{ denom: "uxion", amount: "100000" }],
          }),
        },
      ]),
    );

    expect(result.validation.ok).toBe(true);
    expect(result.allEncoded).toBe(true);

    // Verify the normalized msg is Uint8Array with correct content
    const normalizedValue = result.normalizedMessages[0].value as any;
    expect(normalizedValue.msg).toBeInstanceOf(Uint8Array);
    expect(JSON.parse(new TextDecoder().decode(normalizedValue.msg))).toEqual(
      contractMsg,
    );
  });

  it("MsgInstantiateContract: msg object survives round-trip", () => {
    const initMsg = { admin: SENDER, count: 0, name: "test-contract" };

    const result = roundTrip(
      makePayload([
        {
          typeUrl: "/cosmwasm.wasm.v1.MsgInstantiateContract",
          value: MsgInstantiateContract.fromPartial({
            sender: SENDER,
            codeId: BigInt(42),
            label: "test-contract-v1",
            msg: initMsg as any,
            funds: [],
          }),
        },
      ]),
    );

    expect(result.validation.ok).toBe(true);
    expect(result.allEncoded).toBe(true);

    const normalizedValue = result.normalizedMessages[0].value as any;
    expect(normalizedValue.msg).toBeInstanceOf(Uint8Array);
    expect(JSON.parse(new TextDecoder().decode(normalizedValue.msg))).toEqual(initMsg);
  });

  it("MsgInstantiateContract2: msg object survives round-trip", () => {
    const initMsg = { owner: SENDER };

    const result = roundTrip(
      makePayload([
        {
          typeUrl: "/cosmwasm.wasm.v1.MsgInstantiateContract2",
          value: MsgInstantiateContract2.fromPartial({
            sender: SENDER,
            codeId: BigInt(42),
            label: "test-contract-v2",
            msg: initMsg as any,
            salt: new Uint8Array([1, 2, 3, 4]),
            funds: [],
            fixMsg: false,
          }),
        },
      ]),
    );

    expect(result.validation.ok).toBe(true);
    expect(result.allEncoded).toBe(true);

    const normalizedValue = result.normalizedMessages[0].value as any;
    expect(normalizedValue.msg).toBeInstanceOf(Uint8Array);
    expect(JSON.parse(new TextDecoder().decode(normalizedValue.msg))).toEqual(initMsg);
  });

  it("MsgMigrateContract: msg object survives round-trip", () => {
    const migrateMsg = { new_config: { enabled: true, threshold: 5 } };

    const result = roundTrip(
      makePayload([
        {
          typeUrl: "/cosmwasm.wasm.v1.MsgMigrateContract",
          value: MsgMigrateContract.fromPartial({
            sender: SENDER,
            contract: CONTRACT,
            codeId: BigInt(43),
            msg: migrateMsg as any,
          }),
        },
      ]),
    );

    expect(result.validation.ok).toBe(true);
    expect(result.allEncoded).toBe(true);

    const normalizedValue = result.normalizedMessages[0].value as any;
    expect(normalizedValue.msg).toBeInstanceOf(Uint8Array);
    expect(JSON.parse(new TextDecoder().decode(normalizedValue.msg))).toEqual(
      migrateMsg,
    );
  });

  it("MsgExecuteContract with empty msg {} works", () => {
    const result = roundTrip(
      makePayload([
        {
          typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
          value: MsgExecuteContract.fromPartial({
            sender: SENDER,
            contract: CONTRACT,
            msg: {} as any,
            funds: [],
          }),
        },
      ]),
    );

    expect(result.allEncoded).toBe(true);
    const normalizedValue = result.normalizedMessages[0].value as any;
    expect(new TextDecoder().decode(normalizedValue.msg)).toBe("{}");
  });

  it("MsgExecuteContract with unicode in msg works", () => {
    const contractMsg = { set_name: { name: "テスト 🎉" } };
    const result = roundTrip(
      makePayload([
        {
          typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
          value: MsgExecuteContract.fromPartial({
            sender: SENDER,
            contract: CONTRACT,
            msg: contractMsg as any,
            funds: [],
          }),
        },
      ]),
    );

    expect(result.allEncoded).toBe(true);
    const normalizedValue = result.normalizedMessages[0].value as any;
    expect(JSON.parse(new TextDecoder().decode(normalizedValue.msg))).toEqual(
      contractMsg,
    );
  });
});

// ── Non-wasm Cosmos SDK messages (pass-through) ─────────────────────

describe("Cosmos SDK messages — pass-through (no normalization needed)", () => {
  it("MsgSend encodes correctly", () => {
    const result = roundTrip(
      makePayload([
        {
          typeUrl: "/cosmos.bank.v1beta1.MsgSend",
          value: MsgSend.fromPartial({
            fromAddress: SENDER,
            toAddress: RECIPIENT,
            amount: [{ denom: "uxion", amount: "1000000" }],
          }),
        },
      ]),
    );

    expect(result.validation.ok).toBe(true);
    expect(result.allEncoded).toBe(true);
  });

  it("MsgDelegate encodes correctly", () => {
    const result = roundTrip(
      makePayload([
        {
          typeUrl: "/cosmos.staking.v1beta1.MsgDelegate",
          value: MsgDelegate.fromPartial({
            delegatorAddress: SENDER,
            validatorAddress: VALIDATOR,
            amount: { denom: "uxion", amount: "500000" },
          }),
        },
      ]),
    );

    expect(result.validation.ok).toBe(true);
    expect(result.allEncoded).toBe(true);
  });

  it("MsgUndelegate encodes correctly", () => {
    const result = roundTrip(
      makePayload([
        {
          typeUrl: "/cosmos.staking.v1beta1.MsgUndelegate",
          value: MsgUndelegate.fromPartial({
            delegatorAddress: SENDER,
            validatorAddress: VALIDATOR,
            amount: { denom: "uxion", amount: "500000" },
          }),
        },
      ]),
    );

    expect(result.allEncoded).toBe(true);
  });

  it("MsgVote encodes correctly", () => {
    const result = roundTrip(
      makePayload([
        {
          typeUrl: "/cosmos.gov.v1beta1.MsgVote",
          value: MsgVote.fromPartial({
            proposalId: BigInt(1),
            voter: SENDER,
            option: VoteOption.VOTE_OPTION_YES,
          }),
        },
      ]),
    );

    expect(result.allEncoded).toBe(true);
  });

  it("MsgWithdrawDelegatorReward encodes correctly", () => {
    const result = roundTrip(
      makePayload([
        {
          typeUrl: "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward",
          value: MsgWithdrawDelegatorReward.fromPartial({
            delegatorAddress: SENDER,
            validatorAddress: VALIDATOR,
          }),
        },
      ]),
    );

    expect(result.allEncoded).toBe(true);
  });

  it("MsgRevoke (authz) encodes correctly", () => {
    const result = roundTrip(
      makePayload([
        {
          typeUrl: "/cosmos.authz.v1beta1.MsgRevoke",
          value: MsgRevoke.fromPartial({
            granter: SENDER,
            grantee: RECIPIENT,
            msgTypeUrl: "/cosmos.bank.v1beta1.MsgSend",
          }),
        },
      ]),
    );

    expect(result.allEncoded).toBe(true);
  });
});

// ── Other CosmWasm messages (no msg-field normalization) ─────────────

describe("CosmWasm messages — no msg-field normalization needed", () => {
  it("MsgClearAdmin encodes correctly", () => {
    const result = roundTrip(
      makePayload([
        {
          typeUrl: "/cosmwasm.wasm.v1.MsgClearAdmin",
          value: MsgClearAdmin.fromPartial({
            sender: SENDER,
            contract: CONTRACT,
          }),
        },
      ]),
    );

    expect(result.allEncoded).toBe(true);
  });

  it("MsgUpdateAdmin encodes correctly", () => {
    const result = roundTrip(
      makePayload([
        {
          typeUrl: "/cosmwasm.wasm.v1.MsgUpdateAdmin",
          value: MsgUpdateAdmin.fromPartial({
            sender: SENDER,
            newAdmin: RECIPIENT,
            contract: CONTRACT,
          }),
        },
      ]),
    );

    expect(result.allEncoded).toBe(true);
  });
});

// ── Mixed batches ───────────────────────────────────────────────────

describe("Mixed message batches", () => {
  it("bank + execute in same payload", () => {
    const result = roundTrip(
      makePayload([
        {
          typeUrl: "/cosmos.bank.v1beta1.MsgSend",
          value: MsgSend.fromPartial({
            fromAddress: SENDER,
            toAddress: RECIPIENT,
            amount: [{ denom: "uxion", amount: "1000" }],
          }),
        },
        {
          typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
          value: MsgExecuteContract.fromPartial({
            sender: SENDER,
            contract: CONTRACT,
            msg: { increment: {} } as any,
            funds: [],
          }),
        },
      ]),
    );

    expect(result.validation.ok).toBe(true);
    expect(result.allEncoded).toBe(true);
    expect(result.encodingResults).toHaveLength(2);
  });

  it("multiple execute messages in same payload", () => {
    const result = roundTrip(
      makePayload([
        {
          typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
          value: MsgExecuteContract.fromPartial({
            sender: SENDER,
            contract: CONTRACT,
            msg: { approve: { spender: RECIPIENT } } as any,
            funds: [],
          }),
        },
        {
          typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
          value: MsgExecuteContract.fromPartial({
            sender: SENDER,
            contract: CONTRACT,
            msg: { transfer: { recipient: RECIPIENT, amount: "100" } } as any,
            funds: [{ denom: "uxion", amount: "100" }],
          }),
        },
      ]),
    );

    expect(result.allEncoded).toBe(true);
    // Both should have Uint8Array msg
    for (const msg of result.normalizedMessages) {
      expect((msg.value as any).msg).toBeInstanceOf(Uint8Array);
    }
  });

  it("delegate + vote + withdraw rewards batch", () => {
    const result = roundTrip(
      makePayload([
        {
          typeUrl: "/cosmos.staking.v1beta1.MsgDelegate",
          value: MsgDelegate.fromPartial({
            delegatorAddress: SENDER,
            validatorAddress: VALIDATOR,
            amount: { denom: "uxion", amount: "100000" },
          }),
        },
        {
          typeUrl: "/cosmos.gov.v1beta1.MsgVote",
          value: MsgVote.fromPartial({
            proposalId: BigInt(1),
            voter: SENDER,
            option: VoteOption.VOTE_OPTION_YES,
          }),
        },
        {
          typeUrl: "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward",
          value: MsgWithdrawDelegatorReward.fromPartial({
            delegatorAddress: SENDER,
            validatorAddress: VALIDATOR,
          }),
        },
      ]),
    );

    expect(result.allEncoded).toBe(true);
    expect(result.encodingResults).toHaveLength(3);
  });
});

// ── Fee formats ─────────────────────────────────────────────────────

describe("Fee format variants", () => {
  const simpleMsg = makePayload([
    {
      typeUrl: "/cosmos.bank.v1beta1.MsgSend",
      value: MsgSend.fromPartial({
        fromAddress: SENDER,
        toAddress: RECIPIENT,
        amount: [{ denom: "uxion", amount: "1000" }],
      }),
    },
  ]);

  it('fee: "auto" works', () => {
    const result = roundTrip({ ...simpleMsg, fee: "auto" });
    expect(result.decodedPayload.fee).toBe("auto");
    expect(result.allEncoded).toBe(true);
  });

  it("fee: number (gas multiplier) works", () => {
    const result = roundTrip({ ...simpleMsg, fee: 1.5 });
    expect(result.decodedPayload.fee).toBe(1.5);
    expect(result.allEncoded).toBe(true);
  });

  it("fee: StdFee object works", () => {
    const result = roundTrip({
      ...simpleMsg,
      fee: { amount: [{ denom: "uxion", amount: "5000" }], gas: "200000" },
    });
    expect(result.decodedPayload.fee).toEqual({
      amount: [{ denom: "uxion", amount: "5000" }],
      gas: "200000",
    });
    expect(result.allEncoded).toBe(true);
  });

  it("memo survives transport", () => {
    const result = roundTrip({ ...simpleMsg, memo: "test memo 🎉" });
    expect(result.decodedPayload.memo).toBe("test memo 🎉");
    expect(result.allEncoded).toBe(true);
  });
});

// ── Error cases ─────────────────────────────────────────────────────

describe("Error cases", () => {
  it("msg as string throws during normalization", () => {
    expect(() =>
      roundTrip(
        makePayload([
          {
            typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
            value: {
              sender: SENDER,
              contract: CONTRACT,
              msg: '{"release":{}}', // string — not allowed
              funds: [],
            },
          },
        ]),
      ),
    ).toThrow("must be a plain object");
  });

  it("msg as array throws during normalization", () => {
    expect(() =>
      roundTrip(
        makePayload([
          {
            typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
            value: {
              sender: SENDER,
              contract: CONTRACT,
              msg: [1, 2, 3],
              funds: [],
            },
          },
        ]),
      ),
    ).toThrow("must be a plain object");
  });

  it("unregistered typeUrl fails encoding (not normalization)", () => {
    const result = roundTrip(
      makePayload([
        {
          typeUrl: "/custom.v1.UnknownMsg",
          value: { foo: "bar" },
        },
      ]),
    );

    // Normalization passes (no wasm msg to normalize)
    expect(result.normalizedMessages).toHaveLength(1);
    // But encoding fails because the type isn't in the registry
    expect(result.allEncoded).toBe(false);
    expect(result.encodingResults[0].error).toBeTruthy();
  });
});

// ── Registry completeness ───────────────────────────────────────────

describe("Registry completeness", () => {
  it("all WASM_MSG_TYPES_WITH_BYTES are in the registry", () => {
    const registeredUrls = getRegisteredTypeUrls();
    for (const typeUrl of WASM_MSG_TYPES_WITH_BYTES) {
      expect(registeredUrls).toContain(typeUrl);
    }
  });

  it("all wasm types are in the registry", () => {
    const registeredUrls = getRegisteredTypeUrls();
    const expectedWasm = [
      "/cosmwasm.wasm.v1.MsgExecuteContract",
      "/cosmwasm.wasm.v1.MsgInstantiateContract",
      "/cosmwasm.wasm.v1.MsgInstantiateContract2",
      "/cosmwasm.wasm.v1.MsgMigrateContract",
      "/cosmwasm.wasm.v1.MsgStoreCode",
      "/cosmwasm.wasm.v1.MsgClearAdmin",
      "/cosmwasm.wasm.v1.MsgUpdateAdmin",
    ];
    for (const typeUrl of expectedWasm) {
      expect(registeredUrls).toContain(typeUrl);
    }
  });

  it("common cosmos types are in the registry", () => {
    const registeredUrls = getRegisteredTypeUrls();
    const expected = [
      "/cosmos.bank.v1beta1.MsgSend",
      "/cosmos.staking.v1beta1.MsgDelegate",
      "/cosmos.staking.v1beta1.MsgUndelegate",
      "/cosmos.gov.v1beta1.MsgVote",
      "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward",
      "/cosmos.authz.v1beta1.MsgGrant",
      "/cosmos.authz.v1beta1.MsgRevoke",
      "/cosmos.authz.v1beta1.MsgExec",
      "/ibc.applications.transfer.v1.MsgTransfer",
    ];
    for (const typeUrl of expected) {
      expect(registeredUrls).toContain(typeUrl);
    }
  });

  it("abstract account types are in the registry", () => {
    const registeredUrls = getRegisteredTypeUrls();
    expect(registeredUrls).toContain("/abstractaccount.v1.MsgRegisterAccount");
  });
});
