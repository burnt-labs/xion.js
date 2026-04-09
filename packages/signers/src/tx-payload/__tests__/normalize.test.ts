import { describe, it, expect } from "vitest";
import {
  contractMsgToBytes,
  normalizeMessage,
  normalizeMessages,
  isWasmMsgWithBytes,
} from "../normalize";
import { WASM_MSG_TYPES_WITH_BYTES } from "../types";
import type { EncodeObject } from "@cosmjs/proto-signing";

const WASM_MSG_EXECUTE = WASM_MSG_TYPES_WITH_BYTES[0];
const WASM_MSG_INSTANTIATE = WASM_MSG_TYPES_WITH_BYTES[1];
const WASM_MSG_MIGRATE = WASM_MSG_TYPES_WITH_BYTES[2];

// ── contractMsgToBytes ──────────────────────────────────────────────

describe("contractMsgToBytes", () => {
  it("stringifies an object and encodes to UTF-8 bytes", () => {
    const msg = { create_game: { game_id: "abc123", opponent: "xion1..." } };
    const result = contractMsgToBytes(msg);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(JSON.parse(new TextDecoder().decode(result))).toEqual(msg);
  });

  it("handles nested objects with special characters", () => {
    const msg = { memo: "tip 🎉", data: { nested: true } };
    const result = contractMsgToBytes(msg);
    const decoded = JSON.parse(new TextDecoder().decode(result));
    expect(decoded).toEqual(msg);
  });

  it("handles empty object", () => {
    const result = contractMsgToBytes({});
    expect(new TextDecoder().decode(result)).toBe("{}");
  });
});

// ── isWasmMsgWithBytes ──────────────────────────────────────────────

describe("isWasmMsgWithBytes", () => {
  it("returns true for MsgExecuteContract", () => {
    expect(isWasmMsgWithBytes(WASM_MSG_EXECUTE)).toBe(true);
  });

  it("returns true for MsgInstantiateContract", () => {
    expect(isWasmMsgWithBytes(WASM_MSG_INSTANTIATE)).toBe(true);
  });

  it("returns true for MsgMigrateContract", () => {
    expect(isWasmMsgWithBytes(WASM_MSG_MIGRATE)).toBe(true);
  });

  it("returns false for MsgSend", () => {
    expect(isWasmMsgWithBytes("/cosmos.bank.v1beta1.MsgSend")).toBe(false);
  });

  it("returns false for arbitrary strings", () => {
    expect(isWasmMsgWithBytes("")).toBe(false);
    expect(isWasmMsgWithBytes("/custom.v1.SomeMsg")).toBe(false);
  });
});

// ── normalizeMessage ────────────────────────────────────────────────

describe("normalizeMessage", () => {
  it("passes non-wasm messages through unchanged", () => {
    const msg: EncodeObject = {
      typeUrl: "/cosmos.bank.v1beta1.MsgSend",
      value: {
        fromAddress: "xion1sender",
        toAddress: "xion1recipient",
        amount: [{ denom: "uxion", amount: "1000" }],
      },
    };
    const result = normalizeMessage(msg);
    expect(result).toBe(msg); // same reference — no copy
  });

  it("converts MsgExecuteContract.msg from object to Uint8Array", () => {
    const contractMsg = { create_game: { game_id: "g1" } };
    const msg: EncodeObject = {
      typeUrl: WASM_MSG_EXECUTE,
      value: {
        sender: "xion1sender",
        contract: "xion1contract",
        msg: contractMsg,
        funds: [{ denom: "uxion", amount: "100000" }],
      },
    };

    const result = normalizeMessage(msg);
    const resultValue = result.value as Record<string, unknown>;

    expect(resultValue.msg).toBeInstanceOf(Uint8Array);
    expect(JSON.parse(new TextDecoder().decode(resultValue.msg as Uint8Array))).toEqual(
      contractMsg,
    );
    // Other fields preserved
    expect(resultValue.sender).toBe("xion1sender");
    expect(resultValue.contract).toBe("xion1contract");
    expect(resultValue.funds).toEqual([{ denom: "uxion", amount: "100000" }]);
  });

  it("throws when MsgExecuteContract.msg is a string", () => {
    const msg: EncodeObject = {
      typeUrl: WASM_MSG_EXECUTE,
      value: {
        sender: "xion1sender",
        contract: "xion1contract",
        msg: '{"release":{}}',
        funds: [],
      },
    };

    expect(() => normalizeMessage(msg)).toThrow("must be a plain object");
  });

  it("throws when MsgExecuteContract.msg is an array", () => {
    const msg: EncodeObject = {
      typeUrl: WASM_MSG_EXECUTE,
      value: {
        sender: "xion1sender",
        contract: "xion1contract",
        msg: [1, 2, 3],
        funds: [],
      },
    };

    expect(() => normalizeMessage(msg)).toThrow("must be a plain object");
  });

  it("leaves MsgExecuteContract.msg as-is when already Uint8Array", () => {
    const msgBytes = new TextEncoder().encode('{"release":{}}');
    const msg: EncodeObject = {
      typeUrl: WASM_MSG_EXECUTE,
      value: {
        sender: "xion1sender",
        contract: "xion1contract",
        msg: msgBytes,
        funds: [],
      },
    };

    const result = normalizeMessage(msg);
    const resultValue = result.value as Record<string, unknown>;
    expect(resultValue.msg).toBe(msgBytes); // same reference
  });

  it("normalizes MsgInstantiateContract.msg", () => {
    const initMsg = { admin: "xion1admin", count: 0 };
    const msg: EncodeObject = {
      typeUrl: WASM_MSG_INSTANTIATE,
      value: {
        sender: "xion1sender",
        code_id: "42",
        label: "test",
        msg: initMsg,
        funds: [],
      },
    };

    const result = normalizeMessage(msg);
    const resultValue = result.value as Record<string, unknown>;
    expect(resultValue.msg).toBeInstanceOf(Uint8Array);
    expect(JSON.parse(new TextDecoder().decode(resultValue.msg as Uint8Array))).toEqual(
      initMsg,
    );
  });

  it("normalizes MsgMigrateContract.msg", () => {
    const migrateMsg = { new_config: { enabled: true } };
    const msg: EncodeObject = {
      typeUrl: WASM_MSG_MIGRATE,
      value: {
        sender: "xion1sender",
        contract: "xion1contract",
        code_id: "43",
        msg: migrateMsg,
      },
    };

    const result = normalizeMessage(msg);
    const resultValue = result.value as Record<string, unknown>;
    expect(resultValue.msg).toBeInstanceOf(Uint8Array);
    expect(JSON.parse(new TextDecoder().decode(resultValue.msg as Uint8Array))).toEqual(
      migrateMsg,
    );
  });

  it("handles wasm message with null value gracefully", () => {
    const msg: EncodeObject = {
      typeUrl: WASM_MSG_EXECUTE,
      value: null,
    };
    const result = normalizeMessage(msg);
    expect(result).toBe(msg);
  });

  it("handles wasm message with missing msg field gracefully", () => {
    const msg: EncodeObject = {
      typeUrl: WASM_MSG_EXECUTE,
      value: { sender: "xion1sender", contract: "xion1contract" },
    };
    const result = normalizeMessage(msg);
    expect(result).toBe(msg);
  });
});

// ── normalizeMessages ───────────────────────────────────────────────

describe("normalizeMessages", () => {
  it("normalizes a mixed array of wasm and non-wasm messages", () => {
    const messages: EncodeObject[] = [
      {
        typeUrl: "/cosmos.bank.v1beta1.MsgSend",
        value: {
          fromAddress: "xion1a",
          toAddress: "xion1b",
          amount: [{ denom: "uxion", amount: "1000" }],
        },
      },
      {
        typeUrl: WASM_MSG_EXECUTE,
        value: {
          sender: "xion1a",
          contract: "xion1c",
          msg: { increment: {} },
          funds: [],
        },
      },
    ];

    const result = normalizeMessages(messages);

    expect(result).toHaveLength(2);

    // MsgSend untouched
    expect(result[0]).toBe(messages[0]);

    // MsgExecuteContract.msg normalized
    const execValue = result[1].value as Record<string, unknown>;
    expect(execValue.msg).toBeInstanceOf(Uint8Array);
    expect(JSON.parse(new TextDecoder().decode(execValue.msg as Uint8Array))).toEqual({
      increment: {},
    });
  });

  it("returns a new array (does not mutate input)", () => {
    const messages: EncodeObject[] = [
      {
        typeUrl: WASM_MSG_EXECUTE,
        value: {
          sender: "xion1a",
          contract: "xion1c",
          msg: { release: {} },
          funds: [],
        },
      },
    ];
    const result = normalizeMessages(messages);
    expect(result).not.toBe(messages);
  });

  it("handles empty array", () => {
    expect(normalizeMessages([])).toEqual([]);
  });
});

// ── End-to-end: JSON round-trip simulation ──────────────────────────

describe("JSON round-trip simulation (popup transport)", () => {
  it("recovers MsgExecuteContract.msg after JSON.stringify → JSON.parse", () => {
    const originalMsg = {
      create_game: {
        game_id: "game_abc123",
        opponent: "xion1djcqkp4n2df9e73fjakcwfpf7t5uqs0jmvwxt5",
        time_control: "1d",
        wager_amount: "100000",
        allow_spectator_wagers: false,
      },
    };

    // Simulate what the SDK does: construct EncodeObject
    const originalMessage: EncodeObject = {
      typeUrl: WASM_MSG_EXECUTE,
      value: {
        sender: "xion10f7l88m0afqzwvfcnzrd2rxk5z9mzwxkzlvlg36fu2yqqxgxh4nsvncw7f",
        contract: "xion1shle62n59n7mfs9pmtgy26cs5xm0jtjrcjzpp0a2c7z88gd9np5qx6xpm5",
        msg: originalMsg,
        funds: [{ denom: "uxion", amount: "100000" }],
      },
    };

    // Simulate popup transport: JSON.stringify → JSON.parse
    const transported = JSON.parse(JSON.stringify(originalMessage));

    // Dashboard normalizes
    const [normalized] = normalizeMessages([transported]);
    const normalizedValue = normalized.value as Record<string, unknown>;

    // msg is now Uint8Array with correct JSON
    expect(normalizedValue.msg).toBeInstanceOf(Uint8Array);
    const recoveredMsg = JSON.parse(
      new TextDecoder().decode(normalizedValue.msg as Uint8Array),
    );
    expect(recoveredMsg).toEqual(originalMsg);

    // Other fields preserved
    expect(normalizedValue.sender).toBe(
      "xion10f7l88m0afqzwvfcnzrd2rxk5z9mzwxkzlvlg36fu2yqqxgxh4nsvncw7f",
    );
    expect(normalizedValue.funds).toEqual([{ denom: "uxion", amount: "100000" }]);
  });

  it("handles multiple wasm messages in a batch", () => {
    const messages: EncodeObject[] = [
      {
        typeUrl: WASM_MSG_EXECUTE,
        value: {
          sender: "xion1a",
          contract: "xion1c",
          msg: { method_a: {} },
          funds: [],
        },
      },
      {
        typeUrl: WASM_MSG_EXECUTE,
        value: {
          sender: "xion1a",
          contract: "xion1d",
          msg: { method_b: { arg: 42 } },
          funds: [{ denom: "uxion", amount: "500" }],
        },
      },
    ];

    // Round trip
    const transported = JSON.parse(JSON.stringify(messages));
    const normalized = normalizeMessages(transported);

    for (let i = 0; i < normalized.length; i++) {
      const v = normalized[i].value as Record<string, unknown>;
      expect(v.msg).toBeInstanceOf(Uint8Array);
      const original = (messages[i].value as Record<string, unknown>).msg;
      expect(JSON.parse(new TextDecoder().decode(v.msg as Uint8Array))).toEqual(original);
    }
  });
});
