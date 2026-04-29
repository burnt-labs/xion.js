import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { validateTxPayload } from "../validate";
import { WASM_MSG_TYPES_WITH_BYTES, type TxTransportPayload } from "../types";

const WASM_MSG_EXECUTE = WASM_MSG_TYPES_WITH_BYTES[0];
const WASM_MSG_INSTANTIATE = WASM_MSG_TYPES_WITH_BYTES[1];
const WASM_MSG_INSTANTIATE2 = WASM_MSG_TYPES_WITH_BYTES[2];
const WASM_MSG_MIGRATE = WASM_MSG_TYPES_WITH_BYTES[3];

// Suppress console.warn output during tests
beforeEach(() => vi.spyOn(console, "warn").mockImplementation(() => {}));
afterEach(() => vi.restoreAllMocks());

// ── Top-level guards ────────────────────────────────────────────────

describe("top-level payload shape", () => {
  it("fails when messages is not an array", () => {
    const r = validateTxPayload(
      {
        messages: "bad" as unknown as TxTransportPayload["messages"],
        fee: "auto",
      },
      "Test",
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("messages");
  });

  it("fails when messages is empty", () => {
    const r = validateTxPayload({ messages: [], fee: "auto" }, "Test");
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("messages");
  });

  it("passes a valid MsgSend payload", () => {
    const r = validateTxPayload(
      {
        messages: [
          {
            typeUrl: "/cosmos.bank.v1beta1.MsgSend",
            value: { fromAddress: "xion1a", toAddress: "xion1b", amount: [] },
          },
        ],
        fee: "auto",
      },
      "Test",
    );
    expect(r.ok).toBe(true);
    expect(r.reason).toBeUndefined();
  });
});

// ── Message-level guards ────────────────────────────────────────────

describe("message shape", () => {
  it("fails when typeUrl is missing", () => {
    const r = validateTxPayload(
      { messages: [{ typeUrl: "", value: {} }], fee: "auto" },
      "Test",
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("typeUrl");
  });

  it("fails when value is null", () => {
    const r = validateTxPayload(
      {
        messages: [{ typeUrl: "/cosmos.bank.v1beta1.MsgSend", value: null }],
        fee: "auto",
      },
      "Test",
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("value");
  });

  it("passes unknown non-wasm typeUrls without inspection", () => {
    const r = validateTxPayload(
      {
        messages: [
          { typeUrl: "/custom.v1.SomeMsg", value: { anything: true } },
        ],
        fee: "auto",
      },
      "Test",
    );
    expect(r.ok).toBe(true);
  });
});

// ── MsgExecuteContract ──────────────────────────────────────────────

describe("MsgExecuteContract", () => {
  it("passes a fully valid message", () => {
    const r = validateTxPayload(
      {
        messages: [
          {
            typeUrl: WASM_MSG_EXECUTE,
            value: {
              sender: "xion1s",
              contract: "xion1c",
              msg: { release: {} },
              funds: [],
            },
          },
        ],
        fee: "auto",
      },
      "Test",
    );
    expect(r.ok).toBe(true);
  });

  it("fails when sender is missing", () => {
    const r = validateTxPayload(
      {
        messages: [
          { typeUrl: WASM_MSG_EXECUTE, value: { contract: "xion1c", msg: {} } },
        ],
        fee: "auto",
      },
      "Test",
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("sender");
  });

  it("fails when contract is missing", () => {
    const r = validateTxPayload(
      {
        messages: [
          { typeUrl: WASM_MSG_EXECUTE, value: { sender: "xion1s", msg: {} } },
        ],
        fee: "auto",
      },
      "Test",
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("contract");
  });

  it("fails when msg is missing", () => {
    const r = validateTxPayload(
      {
        messages: [
          {
            typeUrl: WASM_MSG_EXECUTE,
            value: { sender: "xion1s", contract: "xion1c" },
          },
        ],
        fee: "auto",
      },
      "Test",
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("msg");
  });

  it("fails when msg is a string", () => {
    const r = validateTxPayload(
      {
        messages: [
          {
            typeUrl: WASM_MSG_EXECUTE,
            value: { sender: "xion1s", contract: "xion1c", msg: '{"x":1}' },
          },
        ],
        fee: "auto",
      },
      "Test",
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("msg");
  });

  it("fails when msg is a number", () => {
    const r = validateTxPayload(
      {
        messages: [
          {
            typeUrl: WASM_MSG_EXECUTE,
            value: { sender: "xion1s", contract: "xion1c", msg: 42 },
          },
        ],
        fee: "auto",
      },
      "Test",
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("msg");
  });

  it("accepts msg as Uint8Array (pre-encoded)", () => {
    const r = validateTxPayload(
      {
        messages: [
          {
            typeUrl: WASM_MSG_EXECUTE,
            value: {
              sender: "xion1s",
              contract: "xion1c",
              msg: new Uint8Array([123, 125]),
            },
          },
        ],
        fee: "auto",
      },
      "Test",
    );
    expect(r.ok).toBe(true);
  });

  it("fails when funds is not an array", () => {
    const r = validateTxPayload(
      {
        messages: [
          {
            typeUrl: WASM_MSG_EXECUTE,
            value: {
              sender: "xion1s",
              contract: "xion1c",
              msg: {},
              funds: "bad",
            },
          },
        ],
        fee: "auto",
      },
      "Test",
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("funds");
  });

  it("fails on malformed coin in funds", () => {
    const r = validateTxPayload(
      {
        messages: [
          {
            typeUrl: WASM_MSG_EXECUTE,
            value: {
              sender: "xion1s",
              contract: "xion1c",
              msg: {},
              funds: [{ denom: "", amount: 100 }],
            },
          },
        ],
        fee: "auto",
      },
      "Test",
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("denom");
    expect(r.reason).toContain("amount");
  });
});

// ── MsgInstantiateContract ──────────────────────────────────────────

describe("MsgInstantiateContract", () => {
  it("passes a fully valid message", () => {
    const r = validateTxPayload(
      {
        messages: [
          {
            typeUrl: WASM_MSG_INSTANTIATE,
            value: {
              sender: "xion1s",
              code_id: "42",
              label: "t",
              msg: {},
              funds: [],
            },
          },
        ],
        fee: "auto",
      },
      "Test",
    );
    expect(r.ok).toBe(true);
  });

  it("fails (warn) when code_id is missing", () => {
    const r = validateTxPayload(
      {
        messages: [
          {
            typeUrl: WASM_MSG_INSTANTIATE,
            value: { sender: "xion1s", label: "t", msg: {} },
          },
        ],
        fee: "auto",
      },
      "Test",
    );
    // code_id is a warn, not a hard error — ok is still true
    expect(r.ok).toBe(true);
    expect(r.reason).toBeUndefined();
  });
});

// ── MsgInstantiateContract2 ─────────────────────────────────────────

describe("MsgInstantiateContract2", () => {
  it("passes a fully valid message", () => {
    const r = validateTxPayload(
      {
        messages: [
          {
            typeUrl: WASM_MSG_INSTANTIATE2,
            value: {
              sender: "xion1s",
              code_id: "42",
              label: "t",
              msg: {},
              funds: [],
            },
          },
        ],
        fee: "auto",
      },
      "Test",
    );
    expect(r.ok).toBe(true);
  });

  it("warns (non-blocking) when code_id is missing", () => {
    const r = validateTxPayload(
      {
        messages: [
          {
            typeUrl: WASM_MSG_INSTANTIATE2,
            value: { sender: "xion1s", label: "t", msg: {} },
          },
        ],
        fee: "auto",
      },
      "Test",
    );
    expect(r.ok).toBe(true);
    expect(r.reason).toBeUndefined();
  });
});

// ── MsgMigrateContract ──────────────────────────────────────────────

describe("MsgMigrateContract", () => {
  it("passes a fully valid message", () => {
    const r = validateTxPayload(
      {
        messages: [
          {
            typeUrl: WASM_MSG_MIGRATE,
            value: {
              sender: "xion1s",
              contract: "xion1c",
              code_id: "43",
              msg: {},
            },
          },
        ],
        fee: "auto",
      },
      "Test",
    );
    expect(r.ok).toBe(true);
  });
});

// ── Multiple messages ───────────────────────────────────────────────

describe("multiple messages", () => {
  it("accumulates issues from all messages into reason", () => {
    const r = validateTxPayload(
      {
        messages: [
          { typeUrl: WASM_MSG_EXECUTE, value: {} }, // missing sender, contract, msg
          { typeUrl: WASM_MSG_EXECUTE, value: { sender: "xion1s" } }, // missing contract, msg
        ],
        fee: "auto",
      },
      "Test",
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("sender");
    expect(r.reason).toContain("contract");
    expect(r.reason).toContain("msg");
  });
});

// ── Console output ──────────────────────────────────────────────────

describe("console logging", () => {
  it("logs nothing for a valid payload", () => {
    const spy = vi.spyOn(console, "warn");
    validateTxPayload(
      {
        messages: [{ typeUrl: "/cosmos.bank.v1beta1.MsgSend", value: {} }],
        fee: "auto",
      },
      "Test",
    );
    expect(spy).not.toHaveBeenCalled();
  });

  it("logs to console.warn on failure", () => {
    const spy = vi.spyOn(console, "warn");
    validateTxPayload(
      {
        messages: "bad" as unknown as TxTransportPayload["messages"],
        fee: "auto",
      },
      "Test",
    );
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toContain("[Test]");
  });

  it("includes the context prefix", () => {
    const spy = vi.spyOn(console, "warn");
    validateTxPayload(
      {
        messages: "bad" as unknown as TxTransportPayload["messages"],
        fee: "auto",
      },
      "PopupController",
    );
    expect(spy.mock.calls[0][0]).toContain("[PopupController]");
  });
});
