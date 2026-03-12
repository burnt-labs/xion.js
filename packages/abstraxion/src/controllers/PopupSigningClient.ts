/**
 * PopupSigningClient
 *
 * A thin wrapper that implements the same signAndBroadcast / sendTokens
 * interface as GranteeSignerClient and AAClient, but delegates every call
 * to PopupController.promptAndSign() — which opens a dashboard popup where
 * the user approves the transaction and the dashboard signs + broadcasts it.
 *
 * Returned by useAbstraxionSigningClient({ requireAuth: true }) in popup mode.
 */

import type { EncodeObject } from "@cosmjs/proto-signing";
import type { StdFee, DeliverTxResponse, Coin } from "@cosmjs/stargate";
import type { PopupController } from "./PopupController";

export class PopupSigningClient {
  constructor(private controller: PopupController) {}

  async signAndBroadcast(
    address: string,
    messages: readonly EncodeObject[],
    fee: StdFee | "auto" | number,
    memo?: string,
  ): Promise<DeliverTxResponse> {
    return this.controller.promptSignAndBroadcast(address, messages, fee, memo);
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
    return this.controller.promptSignAndBroadcast(senderAddress, [msg], fee, memo);
  }
}
