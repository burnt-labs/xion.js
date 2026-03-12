/**
 * Signing client delegation tests
 *
 * Verifies that PopupSigningClient, IframeSigningClient, and RedirectSigningClient
 * correctly delegate signAndBroadcast and sendTokens to their respective controllers.
 *
 * These are thin wrappers — the test ensures the contract is maintained so
 * dashboard changes that break the controller methods surface here.
 */

import { describe, it, expect, vi } from "vitest";
import { PopupSigningClient } from "../PopupSigningClient";
import { IframeSigningClient } from "../IframeSigningClient";
import { RedirectSigningClient } from "../RedirectSigningClient";
import type { DeliverTxResponse, StdFee } from "@cosmjs/stargate";

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

describe("PopupSigningClient", () => {
  const mockController = {
    promptSignAndBroadcast: vi.fn().mockResolvedValue(mockTxResponse),
  };

  it("delegates signAndBroadcast to controller.promptSignAndBroadcast", async () => {
    const client = new PopupSigningClient(mockController as any);

    const messages = [
      { typeUrl: "/cosmos.bank.v1beta1.MsgSend", value: { amount: "100" } },
    ];
    const fee: StdFee = {
      amount: [{ denom: "uxion", amount: "1000" }],
      gas: "200000",
    };

    const result = await client.signAndBroadcast(
      "xion1addr",
      messages,
      fee,
      "memo",
    );

    expect(mockController.promptSignAndBroadcast).toHaveBeenCalledWith(
      "xion1addr",
      messages,
      fee,
      "memo",
    );
    expect(result).toBe(mockTxResponse);
  });

  it("delegates sendTokens to controller.promptSignAndBroadcast with MsgSend", async () => {
    mockController.promptSignAndBroadcast.mockClear();
    const client = new PopupSigningClient(mockController as any);

    const amount = [{ denom: "uxion", amount: "5000" }];

    await client.sendTokens("xion1sender", "xion1receiver", amount, "auto");

    expect(mockController.promptSignAndBroadcast).toHaveBeenCalledWith(
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

describe("IframeSigningClient", () => {
  const mockController = {
    signAndBroadcastWithMetaAccount: vi.fn().mockResolvedValue(mockTxResponse),
  };

  it("delegates signAndBroadcast to controller.signAndBroadcastWithMetaAccount", async () => {
    const client = new IframeSigningClient(mockController as any);

    const messages = [
      { typeUrl: "/cosmos.bank.v1beta1.MsgSend", value: {} },
    ];

    const result = await client.signAndBroadcast(
      "xion1addr",
      messages,
      "auto",
      "memo",
    );

    expect(mockController.signAndBroadcastWithMetaAccount).toHaveBeenCalledWith(
      "xion1addr",
      messages,
      "auto",
      "memo",
    );
    expect(result).toBe(mockTxResponse);
  });

  it("delegates sendTokens to controller.signAndBroadcastWithMetaAccount with MsgSend", async () => {
    mockController.signAndBroadcastWithMetaAccount.mockClear();
    const client = new IframeSigningClient(mockController as any);

    await client.sendTokens(
      "xion1sender",
      "xion1receiver",
      [{ denom: "uxion", amount: "1000" }],
      "auto",
    );

    expect(mockController.signAndBroadcastWithMetaAccount).toHaveBeenCalledWith(
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

describe("RedirectSigningClient", () => {
  const mockController = {
    promptSignAndBroadcast: vi.fn().mockResolvedValue(mockTxResponse),
  };

  it("delegates signAndBroadcast to controller.promptSignAndBroadcast", async () => {
    const client = new RedirectSigningClient(mockController as any);

    const result = await client.signAndBroadcast(
      "xion1addr",
      [{ typeUrl: "/cosmos.bank.v1beta1.MsgSend", value: {} }],
      "auto",
    );

    expect(mockController.promptSignAndBroadcast).toHaveBeenCalledWith(
      "xion1addr",
      [{ typeUrl: "/cosmos.bank.v1beta1.MsgSend", value: {} }],
      "auto",
      undefined,
    );
    expect(result).toBe(mockTxResponse);
  });

  it("delegates sendTokens to controller.promptSignAndBroadcast with MsgSend", async () => {
    mockController.promptSignAndBroadcast.mockClear();
    const client = new RedirectSigningClient(mockController as any);

    await client.sendTokens(
      "xion1sender",
      "xion1receiver",
      [{ denom: "uxion", amount: "2000" }],
      "auto",
      "tip",
    );

    expect(mockController.promptSignAndBroadcast).toHaveBeenCalledWith(
      "xion1sender",
      [
        {
          typeUrl: "/cosmos.bank.v1beta1.MsgSend",
          value: {
            fromAddress: "xion1sender",
            toAddress: "xion1receiver",
            amount: [{ denom: "uxion", amount: "2000" }],
          },
        },
      ],
      "auto",
      "tip",
    );
  });
});
