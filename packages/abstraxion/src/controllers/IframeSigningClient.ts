/**
 * IframeSigningClient
 *
 * A thin wrapper that implements the same signAndBroadcast / sendTokens
 * interface as GranteeSignerClient, AAClient, and PopupSigningClient, but
 * delegates every call to IframeController.signWithMetaAccount() — which
 * sends SIGN_AND_BROADCAST via MessageChannel to the dashboard iframe
 * where the user approves and the dashboard signs + broadcasts.
 *
 * Returned by useAbstraxionSigningClient({ requireAuth: true }) in iframe mode.
 */

import type { EncodeObject } from "@cosmjs/proto-signing";
import type { StdFee, DeliverTxResponse, Coin } from "@cosmjs/stargate";
import type { IframeController } from "./IframeController";

export class IframeSigningClient {
  constructor(private controller: IframeController) {}

  async signAndBroadcast(
    address: string,
    messages: readonly EncodeObject[],
    fee: StdFee | "auto" | number,
    memo?: string,
  ): Promise<DeliverTxResponse> {
    return this.controller.signWithMetaAccount(address, messages, fee, memo);
  }

  async sendTokens(
    senderAddress: string,
    recipientAddress: string,
    amount: readonly Coin[],
    fee: StdFee | "auto" | number,
    memo?: string,
  ): Promise<DeliverTxResponse> {
    const msg: EncodeObject = {
      typeUrl: "/cosmos.bank.v1beta1.MsgSend",
      value: {
        fromAddress: senderAddress,
        toAddress: recipientAddress,
        amount: [...amount],
      },
    };
    return this.controller.signWithMetaAccount(senderAddress, [msg], fee, memo);
  }
}
