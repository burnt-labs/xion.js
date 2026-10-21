/**
 * Account numbers of at least 2^63.
 *
 * From Cosmos SDK 0.55 (xion v32) on, every new account gets a number of at
 * least 2^63 (`x/auth` `GenerateID`). Those numbers do not fit in a JS number,
 * so they have to travel as `bigint` from the chain's account query to the
 * sign doc. These tests run the real decode and sign path with such a number:
 * no CosmJS module is mocked, only the RPC transport.
 */
import { describe, it, expect } from "vitest";
import { Secp256k1, Secp256k1Signature, sha256 } from "@cosmjs/crypto";
import { toBech32 } from "@cosmjs/encoding";
import {
  makeSignBytes,
  Registry,
  type DirectSignResponse,
} from "@cosmjs/proto-signing";
import type { CometClient } from "@cosmjs/tendermint-rpc";
import { Any } from "cosmjs-types/google/protobuf/any";
import { BaseAccount } from "cosmjs-types/cosmos/auth/v1beta1/auth";
import { QueryAccountResponse } from "cosmjs-types/cosmos/auth/v1beta1/query";
import { SignDoc, TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { MsgSend } from "cosmjs-types/cosmos/bank/v1beta1/tx";
import { AbstractAccount } from "@burnt-labs/xion-types/abstractaccount/v1/account";
import { customAccountFromAny } from "../index";
import { AAClient, AADefaultRegistryTypes } from "../client";
import { AASigner, type AAccountData } from "../../../interfaces/AASigner";

/** 2^63 + 123456789: the smallest range SDK 0.55 hands out, plus an offset. */
const LARGE_ACCOUNT_NUMBER = 2n ** 63n + 123456789n;
const SEQUENCE = 7;
const CHAIN_ID = "xion-local-v32";
const AA_ADDRESS =
  "xion1sv6kdau6mvjlzkthdhpcl53e8zmhaltmgzz9jhxgkxhmpymla9gqrh0knw";

function abstractAccountAny(accountNumber: bigint): Any {
  return {
    typeUrl: "/abstractaccount.v1.AbstractAccount",
    value: AbstractAccount.encode(
      AbstractAccount.fromPartial({
        address: AA_ADDRESS,
        accountNumber,
        sequence: BigInt(SEQUENCE),
      }),
    ).finish(),
  };
}

/**
 * A CometClient that answers the two calls the signing path makes: the auth
 * Account query and status (for the chain ID).
 */
function fakeCometClient(account: Any): CometClient {
  return {
    abciQuery: async ({ path }: { path: string }) => {
      if (path !== "/cosmos.auth.v1beta1.Query/Account") {
        throw new Error(`unexpected query ${path}`);
      }
      return {
        code: 0,
        log: "",
        height: 100,
        value: QueryAccountResponse.encode({ account }).finish(),
      };
    },
    status: async () => ({ nodeInfo: { network: CHAIN_ID } }),
    disconnect: () => undefined,
  } as unknown as CometClient;
}

/** Signs the sign doc for real with a secp256k1 key, like AADirectSigner. */
class Secp256k1AASigner extends AASigner {
  public lastSignDoc: SignDoc | undefined;
  constructor(private readonly privkey: Uint8Array) {
    super(AA_ADDRESS);
    this.accountAuthenticatorIndex = 0;
  }
  async getAccounts(): Promise<readonly AAccountData[]> {
    return [
      {
        address: toBech32("xion", new Uint8Array(20)),
        algo: "secp256k1",
        pubkey: new Uint8Array(),
        authenticatorId: 0,
        accountAddress: AA_ADDRESS,
      },
    ];
  }
  async signDirect(
    _signerAddress: string,
    signDoc: SignDoc,
  ): Promise<DirectSignResponse> {
    this.lastSignDoc = signDoc;
    const signature = await Secp256k1.createSignature(
      sha256(makeSignBytes(signDoc)),
      this.privkey,
    );
    return {
      signed: signDoc,
      signature: {
        pub_key: { type: "tendermint/PubKeySecp256k1", value: "" },
        signature: Buffer.from(signature.toFixedLength().slice(0, 64)).toString(
          "base64",
        ),
      },
    };
  }
}

class TestAAClient extends AAClient {
  static forTest(comet: CometClient, signer: AASigner): TestAAClient {
    return new TestAAClient(comet, signer, {
      registry: new Registry(AADefaultRegistryTypes),
    });
  }
}

describe("account numbers >= 2^63 (SDK 0.55 GenerateID)", () => {
  it("is out of the safe integer range, so a number would lose it", () => {
    expect(LARGE_ACCOUNT_NUMBER > BigInt(Number.MAX_SAFE_INTEGER)).toBe(true);
    expect(BigInt(Number(LARGE_ACCOUNT_NUMBER))).not.toBe(LARGE_ACCOUNT_NUMBER);
  });

  it("customAccountFromAny decodes an AbstractAccount number exactly", () => {
    const account = customAccountFromAny(
      abstractAccountAny(LARGE_ACCOUNT_NUMBER),
    );
    expect(account.accountNumber).toBe(LARGE_ACCOUNT_NUMBER);
    expect(account.sequence).toBe(SEQUENCE);
    expect(account.pubkey).toBeNull();
  });

  it("customAccountFromAny decodes a BaseAccount (session key) number exactly", () => {
    const account = customAccountFromAny({
      typeUrl: "/cosmos.auth.v1beta1.BaseAccount",
      value: BaseAccount.encode(
        BaseAccount.fromPartial({
          address: "xion1grantee",
          accountNumber: LARGE_ACCOUNT_NUMBER,
          sequence: 3n,
        }),
      ).finish(),
    });
    expect(account.accountNumber).toBe(LARGE_ACCOUNT_NUMBER);
    expect(account.sequence).toBe(3);
  });

  it("decodes the largest uint64 account number", () => {
    const max = 2n ** 64n - 1n;
    expect(customAccountFromAny(abstractAccountAny(max)).accountNumber).toBe(
      max,
    );
  });

  describe("AAClient", () => {
    const privkey = sha256(new TextEncoder().encode("xion v32 large account"));

    it("getAccount and getSequence return the exact bigint", async () => {
      const keypair = await Secp256k1.makeKeypair(privkey);
      const client = TestAAClient.forTest(
        fakeCometClient(abstractAccountAny(LARGE_ACCOUNT_NUMBER)),
        new Secp256k1AASigner(keypair.privkey),
      );

      const account = await client.getAccount(AA_ADDRESS);
      expect(account?.accountNumber).toBe(LARGE_ACCOUNT_NUMBER);

      const { accountNumber, sequence } = await client.getSequence(AA_ADDRESS);
      expect(accountNumber).toBe(LARGE_ACCOUNT_NUMBER);
      expect(sequence).toBe(SEQUENCE);
    });

    it("signs a sign doc carrying the exact account number", async () => {
      const keypair = await Secp256k1.makeKeypair(privkey);
      const signer = new Secp256k1AASigner(keypair.privkey);
      const client = TestAAClient.forTest(
        fakeCometClient(abstractAccountAny(LARGE_ACCOUNT_NUMBER)),
        signer,
      );

      const txRaw = await client.sign(
        AA_ADDRESS,
        [
          {
            typeUrl: "/cosmos.bank.v1beta1.MsgSend",
            value: MsgSend.fromPartial({
              fromAddress: AA_ADDRESS,
              toAddress: AA_ADDRESS,
              amount: [{ denom: "uxion", amount: "1" }],
            }),
          },
        ],
        { amount: [{ denom: "uxion", amount: "1000" }], gas: "200000" },
        "large account number",
      );

      expect(signer.lastSignDoc?.accountNumber).toBe(LARGE_ACCOUNT_NUMBER);
      expect(signer.lastSignDoc?.chainId).toBe(CHAIN_ID);

      // Rebuild the sign doc the chain will check, from the tx bytes and the
      // exact account number, and verify the signature against it.
      const decoded = TxRaw.decode(TxRaw.encode(txRaw).finish());
      const signBytes = makeSignBytes(
        SignDoc.fromPartial({
          bodyBytes: decoded.bodyBytes,
          authInfoBytes: decoded.authInfoBytes,
          chainId: CHAIN_ID,
          accountNumber: LARGE_ACCOUNT_NUMBER,
        }),
      );
      // The AA signature is [authenticator id, ...secp256k1 signature].
      const sig = decoded.signatures[0];
      expect(sig[0]).toBe(0);
      const valid = await Secp256k1.verifySignature(
        Secp256k1Signature.fromFixedLength(sig.slice(1)),
        sha256(signBytes),
        keypair.pubkey,
      );
      expect(valid).toBe(true);

      // The number rounded through a JS number is a different sign doc.
      const rounded = makeSignBytes(
        SignDoc.fromPartial({
          bodyBytes: decoded.bodyBytes,
          authInfoBytes: decoded.authInfoBytes,
          chainId: CHAIN_ID,
          accountNumber: BigInt(Number(LARGE_ACCOUNT_NUMBER)),
        }),
      );
      expect(
        await Secp256k1.verifySignature(
          Secp256k1Signature.fromFixedLength(sig.slice(1)),
          sha256(rounded),
          keypair.pubkey,
        ),
      ).toBe(false);
    });
  });
});
