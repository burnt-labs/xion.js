/**
 * simulateWithNilPubkey
 *
 * Standalone gas simulation utility for XION Abstract Accounts.
 *
 * Uses the NilPubKey approach: constructs a simulation TX with an empty
 * signature and the XION-specific `/abstractaccount.v1.NilPubKey` type.
 * The chain accepts this for gas estimation without validating the signature.
 *
 * This is purely a read-only RPC call — no key material required.
 * Used by RequireSigningClient so dApps can call client.simulate() without
 * triggering a popup/redirect/iframe approval flow.
 */

import { bech32 } from "bech32";
import { TxRaw, AuthInfo, Fee } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import {
  ServiceClientImpl,
  SimulateRequest,
} from "cosmjs-types/cosmos/tx/v1beta1/service";
import { SignMode } from "cosmjs-types/cosmos/tx/signing/v1beta1/signing";
import { EncodeObject, Registry } from "@cosmjs/proto-signing";
import {
  createProtobufRpcClient,
  QueryClient,
  setupAuthExtension,
} from "@cosmjs/stargate";
import { Comet38Client } from "@cosmjs/tendermint-rpc";
import { Uint53 } from "@cosmjs/math";
import { NilPubKey } from "@burnt-labs/xion-types/abstractaccount/v1/account";
import { AADefaultRegistryTypes } from "./client";
import { customAccountFromAny } from ".";
import { normalizeMessages } from "../../tx-payload/normalize";

/**
 * Simulate a transaction against the XION chain using NilPubKey.
 *
 * Opens its own RPC connections (does not reuse an existing client) so it
 * can be called from any context — including RequireSigningClient which has
 * no live signer.
 *
 * @param rpcUrl - Chain RPC endpoint
 * @param signerAddress - The abstract account address to simulate as
 * @param messages - Messages to include in the simulation
 * @param memo - Optional transaction memo
 * @returns Gas units used by the simulated transaction
 */
export async function simulateWithNilPubkey(
  rpcUrl: string,
  signerAddress: string,
  messages: readonly EncodeObject[],
  memo: string | undefined,
): Promise<number> {
  const cometClient = await Comet38Client.connect(rpcUrl);

  // All work after connect() runs in this try/finally so the RPC connection
  // is always closed — including failures in account lookup, bech32 decode,
  // or registry.encode that would otherwise leak the socket.
  try {
    // Attach auth extension so we can look up the sequence via the same comet connection.
    // customAccountFromAny handles /abstractaccount.v1.AbstractAccount; the default
    // StargateClient account parser would throw on this XION-specific account type.
    const queryClient = QueryClient.withExtensions(
      cometClient,
      setupAuthExtension,
    );
    const authAccount = await queryClient.auth.account(signerAddress);
    if (!authAccount) throw new Error(`Account not found: ${signerAddress}`);
    const { sequence } = customAccountFromAny(authAccount);

    const rpc = createProtobufRpcClient(queryClient);
    const txService = new ServiceClientImpl(rpc);

    // Derive NilPubKey bytes from the bech32 address (same approach as AAClient)
    const pubKeyBytes = bech32.fromWords(bech32.decode(signerAddress).words);
    const pubkey = Uint8Array.from(pubKeyBytes);

    const authInfo = AuthInfo.fromPartial({
      fee: Fee.fromPartial({}),
      signerInfos: [
        {
          publicKey: {
            typeUrl: "/abstractaccount.v1.NilPubKey",
            value: NilPubKey.encode({ addressBytes: pubkey }).finish(),
          },
          modeInfo: {
            single: {
              mode: SignMode.SIGN_MODE_DIRECT,
            },
          },
          sequence: BigInt(sequence),
        },
      ],
    });
    const authInfoBytes = AuthInfo.encode(authInfo).finish();

    const registry = new Registry(AADefaultRegistryTypes);
    const txBodyEncodeObject = {
      typeUrl: "/cosmos.tx.v1beta1.TxBody",
      value: {
        messages: normalizeMessages([...messages]),
        memo: memo || "AA Gas Simulation",
      },
    };
    const bodyBytes = registry.encode(txBodyEncodeObject);

    const tx = TxRaw.fromPartial({
      bodyBytes,
      authInfoBytes,
      signatures: [new Uint8Array()],
    });

    const request = SimulateRequest.fromPartial({
      txBytes: TxRaw.encode(tx).finish(),
    });

    const { gasInfo } = await txService.Simulate(request);
    if (!gasInfo) {
      throw new Error("No gas info returned");
    }

    return Uint53.fromString(gasInfo.gasUsed.toString()).toNumber();
  } finally {
    cometClient.disconnect();
  }
}
