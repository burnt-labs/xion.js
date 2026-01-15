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
 * Custom account parser supporting XION AbstractAccount type
 *
 * Handles `/abstractaccount.v1.AbstractAccount` in addition to standard Cosmos SDK types
 *
 * @param input - Encoded account from chain
 * @returns Decoded account
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
