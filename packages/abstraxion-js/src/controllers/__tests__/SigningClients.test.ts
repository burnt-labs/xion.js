/**
 * RequireSigningClient tests
 *
 * Verifies that RequireSigningClient:
 * - delegates signAndBroadcast and sendTokens to the provided strategy fn
 * - delegates simulate to simulateWithNilPubkey (no strategy fn involved)
 * - constructs the correct MsgSend payload for sendTokens
 *
 * The strategy fn is swapped per test to emulate popup, redirect, and iframe transports.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { RequireSigningClient } from "../../signing/RequireSigningClient";
import type { DeliverTxResponse, StdFee } from "@cosmjs/stargate";
import type { SignAndBroadcastResult } from "@burnt-labs/abstraxion-core";

// Mock simulateWithNilPubkey so tests don't need a live chain
vi.mock("@burnt-labs/signers", () => ({
  simulateWithNilPubkey: vi.fn().mockResolvedValue(100000),
}));

import { simulateWithNilPubkey } from "@burnt-labs/signers";

const RPC_URL = "https://rpc.xion-testnet-1.burnt.com:443";

const mockTxResponse: DeliverTxResponse = {
  code: 0,
  transactionHash: "TXHASH123",
  events: [],
  height: 100,
  gasUsed: BigInt(50000),
  gasWanted: BigInt(100000),
  msgResponses: [],
  txIndex: 0,
};

const mockBroadcastResult: SignAndBroadcastResult = {
  transactionHash: "TXHASH123",
};

const sampleMessages = [
  { typeUrl: "/cosmos.bank.v1beta1.MsgSend", value: { amount: "100" } },
];

const sampleFee: StdFee = {
  amount: [{ denom: "uxion", amount: "1000" }],
  gas: "200000",
};

describe("RequireSigningClient — popup strategy (DeliverTxResponse)", () => {
  let mockFn: ReturnType<typeof vi.fn>;
  let client: RequireSigningClient;

  beforeEach(() => {
    mockFn = vi.fn().mockResolvedValue(mockTxResponse);
    client = new RequireSigningClient(mockFn, RPC_URL);
  });

  it("delegates signAndBroadcast to strategy fn with correct args", async () => {
    const result = await client.signAndBroadcast(
      "xion1addr",
      sampleMessages,
      sampleFee,
      "memo",
    );

    expect(mockFn).toHaveBeenCalledWith(
      "xion1addr",
      sampleMessages,
      sampleFee,
      "memo",
    );
    expect(result).toBe(mockTxResponse);
  });

  it("delegates sendTokens by constructing MsgSend and calling strategy fn", async () => {
    const amount = [{ denom: "uxion", amount: "5000" }];

    await client.sendTokens("xion1sender", "xion1receiver", amount, "auto");

    expect(mockFn).toHaveBeenCalledWith(
      "xion1sender",
      [
        {
          typeUrl: "/cosmos.bank.v1beta1.MsgSend",
          value: {
            fromAddress: "xion1sender",
            toAddress: "xion1receiver",
            amount: [{ denom: "uxion", amount: "5000" }],
          },
        },
      ],
      "auto",
      undefined,
    );
  });
});

describe("RequireSigningClient — iframe strategy (SignAndBroadcastResult)", () => {
  let mockFn: ReturnType<typeof vi.fn>;
  let client: RequireSigningClient;

  beforeEach(() => {
    mockFn = vi.fn().mockResolvedValue(mockBroadcastResult);
    client = new RequireSigningClient(mockFn, RPC_URL);
  });

  it("returns SignAndBroadcastResult from iframe strategy", async () => {
    const result = await client.signAndBroadcast(
      "xion1addr",
      sampleMessages,
      "auto",
      "memo",
    );

    expect(result).toEqual(mockBroadcastResult);
    expect((result as SignAndBroadcastResult).transactionHash).toBe(
      "TXHASH123",
    );
  });

  it("delegates sendTokens to iframe strategy with MsgSend", async () => {
    await client.sendTokens(
      "xion1sender",
      "xion1receiver",
      [{ denom: "uxion", amount: "1000" }],
      "auto",
    );

    expect(mockFn).toHaveBeenCalledWith(
      "xion1sender",
      [
        {
          typeUrl: "/cosmos.bank.v1beta1.MsgSend",
          value: {
            fromAddress: "xion1sender",
            toAddress: "xion1receiver",
            amount: [{ denom: "uxion", amount: "1000" }],
          },
        },
      ],
      "auto",
      undefined,
    );
  });
});

describe("RequireSigningClient — simulate", () => {
  let mockFn: ReturnType<typeof vi.fn>;
  let client: RequireSigningClient;

  beforeEach(() => {
    mockFn = vi.fn();
    client = new RequireSigningClient(mockFn, RPC_URL);
    vi.mocked(simulateWithNilPubkey).mockClear();
  });

  it("calls simulateWithNilPubkey with rpcUrl, address, messages, and memo", async () => {
    const gas = await client.simulate("xion1addr", sampleMessages, "memo");

    expect(simulateWithNilPubkey).toHaveBeenCalledWith(
      RPC_URL,
      "xion1addr",
      sampleMessages,
      "memo",
    );
    expect(gas).toBe(100000);
  });

  it("never calls the strategy fn when simulating", async () => {
    await client.simulate("xion1addr", sampleMessages, undefined);

    expect(mockFn).not.toHaveBeenCalled();
  });

  it("passes undefined memo through to simulateWithNilPubkey", async () => {
    await client.simulate("xion1addr", sampleMessages, undefined);

    expect(simulateWithNilPubkey).toHaveBeenCalledWith(
      RPC_URL,
      "xion1addr",
      sampleMessages,
      undefined,
    );
  });
});
