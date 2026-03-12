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
import type { StdSignature } from "@cosmjs/amino";

const mockStdSignature: StdSignature = {
  signature: "mockSig123==",
  pub_key: { type: "tendermint/PubKeySecp256k1", value: "mockPubKey==" },
};

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
    promptAndSign: vi.fn().mockResolvedValue(mockTxResponse),
    promptSignMessage: vi.fn().mockResolvedValue(mockStdSignature),
  };

  it("delegates signAndBroadcast to controller.promptAndSign", async () => {
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

    expect(mockController.promptAndSign).toHaveBeenCalledWith(
      "xion1addr",
      messages,
      fee,
      "memo",
    );
    expect(result).toBe(mockTxResponse);
  });

  it("delegates sendTokens to controller.promptAndSign with MsgSend", async () => {
    mockController.promptAndSign.mockClear();
    const client = new PopupSigningClient(mockController as any);

    const amount = [{ denom: "uxion", amount: "5000" }];

    await client.sendTokens("xion1sender", "xion1receiver", amount, "auto");

    expect(mockController.promptAndSign).toHaveBeenCalledWith(
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

  it("delegates signMessage to controller.promptSignMessage", async () => {
    mockController.promptSignMessage.mockClear();
    const client = new PopupSigningClient(mockController as any);

    const result = await client.signMessage("xion1addr", "Sign this");

    expect(mockController.promptSignMessage).toHaveBeenCalledWith(
      "xion1addr",
      "Sign this",
    );
    expect(result).toBe(mockStdSignature);
  });
});

describe("IframeSigningClient", () => {
  const mockController = {
    signWithMetaAccount: vi.fn().mockResolvedValue(mockTxResponse),
    signMessage: vi.fn().mockResolvedValue(mockStdSignature),
  };

  it("delegates signAndBroadcast to controller.signWithMetaAccount", async () => {
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

    expect(mockController.signWithMetaAccount).toHaveBeenCalledWith(
      "xion1addr",
      messages,
      "auto",
      "memo",
    );
    expect(result).toBe(mockTxResponse);
  });

  it("delegates sendTokens to controller.signWithMetaAccount with MsgSend", async () => {
    mockController.signWithMetaAccount.mockClear();
    const client = new IframeSigningClient(mockController as any);

    await client.sendTokens(
      "xion1sender",
      "xion1receiver",
      [{ denom: "uxion", amount: "1000" }],
      "auto",
    );

    expect(mockController.signWithMetaAccount).toHaveBeenCalledWith(
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

  it("delegates signMessage to controller.signMessage", async () => {
    mockController.signMessage.mockClear();
    const client = new IframeSigningClient(mockController as any);

    const result = await client.signMessage("xion1addr", "test message");

    expect(mockController.signMessage).toHaveBeenCalledWith(
      "xion1addr",
      "test message",
    );
    expect(result).toBe(mockStdSignature);
  });
});

describe("RedirectSigningClient", () => {
  const neverResolve = new Promise<never>(() => {});
  const mockController = {
    promptAndSign: vi.fn().mockResolvedValue(mockTxResponse),
    promptSignMessage: vi.fn().mockReturnValue(neverResolve),
  };

  it("delegates signAndBroadcast to controller.promptAndSign", async () => {
    const client = new RedirectSigningClient(mockController as any);

    const result = await client.signAndBroadcast(
      "xion1addr",
      [{ typeUrl: "/cosmos.bank.v1beta1.MsgSend", value: {} }],
      "auto",
    );

    expect(mockController.promptAndSign).toHaveBeenCalledWith(
      "xion1addr",
      [{ typeUrl: "/cosmos.bank.v1beta1.MsgSend", value: {} }],
      "auto",
      undefined,
    );
    expect(result).toBe(mockTxResponse);
  });

  it("delegates sendTokens to controller.promptAndSign with MsgSend", async () => {
    mockController.promptAndSign.mockClear();
    const client = new RedirectSigningClient(mockController as any);

    await client.sendTokens(
      "xion1sender",
      "xion1receiver",
      [{ denom: "uxion", amount: "2000" }],
      "auto",
      "tip",
    );

    expect(mockController.promptAndSign).toHaveBeenCalledWith(
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

  it("delegates signMessage to controller.promptSignMessage", async () => {
    mockController.promptSignMessage.mockClear();
    const client = new RedirectSigningClient(mockController as any);

    // signMessage is fire-and-forget (navigates away), so we just check delegation
    const promise = client.signMessage("xion1addr", "Sign this challenge");

    expect(mockController.promptSignMessage).toHaveBeenCalledWith(
      "xion1addr",
      "Sign this challenge",
    );

    // Don't await — the promise never resolves (page navigates away)
    expect(promise).toBeInstanceOf(Promise);
  });
});
