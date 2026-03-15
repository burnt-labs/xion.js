/**
 * RedirectSigningClient
 *
 * A thin wrapper that implements the same signAndBroadcast / sendTokens
 * interface as GranteeSignerClient, AAClient, and PopupSigningClient, but
 * delegates to RedirectController.promptSignAndBroadcast() — which navigates to the
 * dashboard signing view. The page navigates away; on return, the result is
 * available via RedirectController.getSignResult().
 *
 * Returned by useAbstraxionSigningClient({ requireAuth: true }) in redirect mode.
 */

import type { EncodeObject } from "@cosmjs/proto-signing";
import type { StdFee, DeliverTxResponse, Coin } from "@cosmjs/stargate";
import type { RedirectController } from "./RedirectController";

export class RedirectSigningClient {
  constructor(private controller: RedirectController) {}

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
    return this.controller.promptSignAndBroadcast(
      senderAddress,
      [msg],
      fee,
      memo,
    );
  }
}
