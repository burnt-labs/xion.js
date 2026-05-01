/**
 * RequireSigningClient
 *
 * Unified signing client for all dashboard-mediated direct-signing modes:
 * popup, redirect, and iframe. Replaces the three separate
 * PopupSigningClient / RedirectSigningClient / IframeSigningClient classes,
 * which were structurally identical except for which controller method they
 * called.
 *
 * Uses a strategy pattern: the caller provides a `signAndBroadcastFn` that
 * captures the specific transport (popup postMessage, redirect navigation,
 * or iframe MessageChannel). The client itself is transport-agnostic.
 *
 * Simulation is transport-independent: `simulate()` performs a direct
 * read-only RPC call using the XION NilPubKey trick — no user interaction
 * required. This allows gas estimation before showing an approval UI.
 *
 * Returned by useAbstraxionSigningClient({ requireAuth: true }) in
 * popup, redirect, and iframe modes.
 */

import type { EncodeObject } from "@cosmjs/proto-signing";
import type { StdFee, DeliverTxResponse, Coin } from "@cosmjs/stargate";
import type { SignAndBroadcastResult } from "@burnt-labs/abstraxion-core";
import { simulateWithNilPubkey } from "@burnt-labs/signers";
import type { SignAndBroadcastFn } from "../controllers/types";

export class RequireSigningClient {
  constructor(
    private readonly signAndBroadcastFn: SignAndBroadcastFn,
    private readonly rpcUrl: string,
  ) {}

  /**
   * Sign and broadcast a transaction via the dashboard transport.
   *
   * Delegates to the strategy function provided at construction:
   * - popup: opens a dashboard popup window, waits for approval postMessage
   * - redirect: navigates to the dashboard signing view (fire-and-forget)
   * - iframe: sends SIGN_AND_BROADCAST over MessageChannel to the embedded iframe
   */
  async signAndBroadcast(
    address: string,
    messages: readonly EncodeObject[],
    fee: StdFee | "auto" | number,
    memo?: string,
  ): Promise<DeliverTxResponse | SignAndBroadcastResult | void> {
    return this.signAndBroadcastFn(address, messages, fee, memo);
  }

  /**
   * Convenience method to send tokens. Constructs a MsgSend and delegates
   * to the transport strategy via signAndBroadcast.
   */
  async sendTokens(
    senderAddress: string,
    recipientAddress: string,
    amount: readonly Coin[],
    fee: StdFee | "auto" | number,
    memo?: string,
  ): Promise<DeliverTxResponse | SignAndBroadcastResult | void> {
    const msg: EncodeObject = {
      typeUrl: "/cosmos.bank.v1beta1.MsgSend",
      value: {
        fromAddress: senderAddress,
        toAddress: recipientAddress,
        amount: [...amount],
      },
    };
    return this.signAndBroadcastFn(senderAddress, [msg], fee, memo);
  }

  /**
   * Simulate a transaction and return gas used.
   *
   * Uses the XION NilPubKey approach: sends a read-only SimulateRequest to
   * the chain RPC with an empty signature. No key material needed, no user
   * interaction triggered. Safe to call before showing an approval UI.
   *
   * @param signerAddress - The abstract account address to simulate as
   * @param messages - Messages to estimate gas for
   * @param memo - Optional memo
   * @returns Gas units used
   */
  async simulate(
    signerAddress: string,
    messages: readonly EncodeObject[],
    memo: string | undefined,
  ): Promise<number> {
    return simulateWithNilPubkey(this.rpcUrl, signerAddress, messages, memo);
  }
}
