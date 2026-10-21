/**
 * Session keys with account numbers of at least 2^63.
 *
 * From Cosmos SDK 0.55 (xion v32) on, every new account gets a number of at
 * least 2^63, including the grantee (session) key each login creates. These
 * tests run GranteeSignerClient's real account and sign path with such a
 * number and a real secp256k1 wallet; only the RPC transport is faked.
 */
import { describe, it, expect } from "vitest";
import { Secp256k1, Secp256k1Signature, sha256 } from "@cosmjs/crypto";
import {
  DirectSecp256k1Wallet,
  encodePubkey,
  makeSignBytes,
} from "@cosmjs/proto-signing";
import { encodeSecp256k1Pubkey } from "@cosmjs/amino";
import { GasPrice } from "@cosmjs/stargate";
import type { CometClient } from "@cosmjs/tendermint-rpc";
import { BaseAccount } from "cosmjs-types/cosmos/auth/v1beta1/auth";
import {
  QueryAccountRequest,
  QueryAccountResponse,
} from "cosmjs-types/cosmos/auth/v1beta1/query";
import { MsgExec } from "cosmjs-types/cosmos/authz/v1beta1/tx";
import { SignDoc, TxBody, TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { GranteeSignerClient } from "../GranteeSignerClient";

/** 2^63 + 123456789: the smallest range SDK 0.55 hands out, plus an offset. */
const LARGE_ACCOUNT_NUMBER = 2n ** 63n + 123456789n;
const SEQUENCE = 4;
const CHAIN_ID = "xion-local-v32";
const GRANTER =
  "xion1sv6kdau6mvjlzkthdhpcl53e8zmhaltmgzz9jhxgkxhmpymla9gqrh0knw";

function fakeCometClient(accounts: Map<string, BaseAccount>): CometClient {
  return {
    abciQuery: async ({ path, data }: { path: string; data: Uint8Array }) => {
      if (path !== "/cosmos.auth.v1beta1.Query/Account") {
        throw new Error(`unexpected query ${path}`);
      }
      const { address } = QueryAccountRequest.decode(data);
      const account = accounts.get(address);
      if (!account) {
        return { code: 22, log: "account not found", height: 100 };
      }
      return {
        code: 0,
        log: "",
        height: 100,
        value: QueryAccountResponse.encode({
          account: {
            typeUrl: "/cosmos.auth.v1beta1.BaseAccount",
            value: BaseAccount.encode(account).finish(),
          },
        }).finish(),
      };
    },
    status: async () => ({ nodeInfo: { network: CHAIN_ID } }),
    disconnect: () => undefined,
  } as unknown as CometClient;
}

async function setup() {
  const privkey = sha256(new TextEncoder().encode("xion v32 session key"));
  const wallet = await DirectSecp256k1Wallet.fromKey(privkey, "xion");
  const [grantee] = await wallet.getAccounts();
  const accounts = new Map([
    [
      grantee.address,
      BaseAccount.fromPartial({
        address: grantee.address,
        pubKey: encodePubkey(encodeSecp256k1Pubkey(grantee.pubkey)),
        accountNumber: LARGE_ACCOUNT_NUMBER,
        sequence: BigInt(SEQUENCE),
      }),
    ],
  ]);
  const client = GranteeSignerClient.createWithSigner(
    fakeCometClient(accounts),
    wallet,
    {
      granterAddress: GRANTER,
      granteeAddress: grantee.address,
      gasPrice: GasPrice.fromString("0.001uxion"),
    },
  );
  return { client, grantee };
}

describe("GranteeSignerClient with account numbers >= 2^63", () => {
  it("getAccount and getSequence return the exact bigint", async () => {
    const { client, grantee } = await setup();

    const account = await client.getAccount(grantee.address);
    expect(account?.accountNumber).toBe(LARGE_ACCOUNT_NUMBER);

    const { accountNumber, sequence } = await client.getSequence(
      grantee.address,
    );
    expect(accountNumber).toBe(LARGE_ACCOUNT_NUMBER);
    expect(sequence).toBe(SEQUENCE);
  });

  it("signs a MsgExec for the granter that verifies against the exact number", async () => {
    const { client, grantee } = await setup();

    const txRaw = await client.sign(
      GRANTER,
      [
        {
          typeUrl: "/cosmos.bank.v1beta1.MsgSend",
          value: {
            fromAddress: GRANTER,
            toAddress: GRANTER,
            amount: [{ denom: "uxion", amount: "1" }],
          },
        },
      ],
      {
        amount: [{ denom: "uxion", amount: "1000" }],
        gas: "200000",
        granter: GRANTER,
      },
      "",
    );

    const decoded = TxRaw.decode(TxRaw.encode(txRaw).finish());
    const body = TxBody.decode(decoded.bodyBytes);
    expect(body.messages[0].typeUrl).toBe("/cosmos.authz.v1beta1.MsgExec");
    expect(MsgExec.decode(body.messages[0].value).grantee).toBe(
      grantee.address,
    );

    const signDocFor = (accountNumber: bigint) =>
      sha256(
        makeSignBytes(
          SignDoc.fromPartial({
            bodyBytes: decoded.bodyBytes,
            authInfoBytes: decoded.authInfoBytes,
            chainId: CHAIN_ID,
            accountNumber,
          }),
        ),
      );
    const signature = Secp256k1Signature.fromFixedLength(decoded.signatures[0]);

    expect(
      await Secp256k1.verifySignature(
        signature,
        signDocFor(LARGE_ACCOUNT_NUMBER),
        grantee.pubkey,
      ),
    ).toBe(true);
    // A number rounded through a JS number is a different sign doc, which
    // the chain would reject.
    expect(
      await Secp256k1.verifySignature(
        signature,
        signDocFor(BigInt(Number(LARGE_ACCOUNT_NUMBER))),
        grantee.pubkey,
      ),
    ).toBe(false);
  });
});
