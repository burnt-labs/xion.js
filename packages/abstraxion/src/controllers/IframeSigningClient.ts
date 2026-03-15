/**
 * IframeSigningClient
 *
 * A thin wrapper that implements the same signAndBroadcast / sendTokens
 * interface as GranteeSignerClient, AAClient, and PopupSigningClient, but
 * delegates every call to IframeController.signAndBroadcastWithMetaAccount() —
 * which sends SIGN_AND_BROADCAST via MessageChannel to the dashboard iframe
 * where the user approves and the dashboard signs + broadcasts.
 *
 * Returned by useAbstraxionSigningClient({ requireAuth: true }) in iframe mode.
 */

import type { EncodeObject } from "@cosmjs/proto-signing";
import type { StdFee, Coin } from "@cosmjs/stargate";
import type { SignAndBroadcastResult } from "@burnt-labs/abstraxion-core";
import type { IframeController } from "./IframeController";

export class IframeSigningClient {
  constructor(private controller: IframeController) {}

  async signAndBroadcast(
    address: string,
    messages: readonly EncodeObject[],
    fee: StdFee | "auto" | number,
    memo?: string,
  ): Promise<SignAndBroadcastResult> {
    return this.controller.signAndBroadcastWithMetaAccount(
      address,
      messages,
      fee,
      memo,
    );
  }

  async sendTokens(
    senderAddress: string,
    recipientAddress: string,
    amount: readonly Coin[],
    fee: StdFee | "auto" | number,
    memo?: string,
  ): Promise<SignAndBroadcastResult> {
    const msg: EncodeObject = {
      typeUrl: "/cosmos.bank.v1beta1.MsgSend",
      value: {
        fromAddress: senderAddress,
        toAddress: recipientAddress,
        amount: [...amount],
      },
    };
    return this.controller.signAndBroadcastWithMetaAccount(
      senderAddress,
      [msg],
      fee,
      memo,
    );
  }
}
