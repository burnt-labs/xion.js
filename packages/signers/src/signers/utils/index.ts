import { SignMode } from "cosmjs-types/cosmos/tx/signing/v1beta1/signing";
import { Account } from "@cosmjs/stargate";
import { Any } from "cosmjs-types/google/protobuf/any";
import { AuthInfo, SignerInfo } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { coins, StdFee } from "@cosmjs/amino";
import { Uint64 } from "@cosmjs/math";
import { AbstractAccount } from "@burnt-labs/xion-types/abstractaccount/v1/account";
import { assert } from "@cosmjs/utils";
import { accountFromAny } from "@cosmjs/stargate/build/accounts";

export type INodes<T> = {
  nodes: Array<T>;
};

function uint64FromProto(input: number | bigint | { toString(): string }): Uint64 {
  return Uint64.fromString(input.toString());
}

/**
 * Custom implementation of AccountParser. This is supposed to support the most relevant
 * common Cosmos SDK account types and AbstractAccount account types.
 * @param input encoded account from the chain
 * @returns decoded account
 */
export function customAccountFromAny(input: Any): Account {
  const { typeUrl, value } = input;
  switch (typeUrl) {
    case "/abstractaccount.v1.AbstractAccount": {
      const abstractAccount = AbstractAccount.decode(value);
      assert(abstractAccount);
      return {
        address: abstractAccount.address,
        pubkey: null,
        accountNumber: uint64FromProto(abstractAccount.accountNumber).toNumber(),
        sequence: uint64FromProto(abstractAccount.sequence).toNumber(),
      };
    }
    default:
      return accountFromAny(input);
  }
}

/**
 * Abstract Account specific implementation of the authInfo
 * Only one signer is allowed and must be a registered AbstractAccount
 * @param account AbstractAccount
 * @param pubKey
 * @param fee
 * @returns
 */
export function makeAAuthInfo(
  account: Account,
  pubKey: Uint8Array,
  fee: StdFee,
): AuthInfo {
  return AuthInfo.fromPartial({
    signerInfos: [
      SignerInfo.fromPartial({
        publicKey: {
          typeUrl: "/abstractaccount.v1.NilPubKey",
          value: new Uint8Array([10, 32, ...pubKey]), // a little hack to encode the pk into proto bytes
        },
        modeInfo: {
          single: {
            mode: SignMode.SIGN_MODE_DIRECT,
          },
        },
        sequence: BigInt(account.sequence),
      }),
    ],
    fee: {
      amount: fee.amount
        ? coins(fee.amount[0].amount, fee.amount[0].denom)
        : coins(1, "uxion"),
      gasLimit: BigInt(fee.gas),
      granter: fee.granter || "",
      payer: fee.payer || "",
    },
  });
}

export function encodeHex(bytes: Uint8Array) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
