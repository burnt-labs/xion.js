import { Account } from "@cosmjs/stargate";
import { Uint64 } from "@cosmjs/math";
import { assert } from "@cosmjs/utils";
import { accountFromAny } from "@cosmjs/stargate/build/accounts";
import { decodePubkey } from "@cosmjs/proto-signing";
import { Any } from "cosmjs-types/google/protobuf/any";
import { AbstractAccount } from "../types/abstractaccount/v1/account";

function uint64FromProto(input: number | bigint): number {
  return typeof input === "bigint" ? Number(input) : input;
}

function accountFromBaseAccount(input: AbstractAccount) {
  const { address, pubKey, accountNumber, sequence } = input;
  let pubkey = null;
  if (pubKey) {
    pubkey = decodePubkey(pubKey);
  }
  return {
    address,
    pubkey,
    accountNumber: uint64FromProto(accountNumber),
    sequence: uint64FromProto(sequence),
  };
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
      const abstractAccount = AbstractAccount.fromBinary(value);
      assert(abstractAccount);
      return accountFromBaseAccount(abstractAccount);
    }
    default:
      return accountFromAny(input);
  }
}
