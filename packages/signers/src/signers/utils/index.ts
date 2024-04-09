import { SignMode } from "cosmjs-types/cosmos/tx/signing/v1beta1/signing";
import { Account } from "@cosmjs/stargate";
import { Any } from "../../types/generated/google/protobuf/any";
import { BaseAccount } from "cosmjs-types/cosmos/auth/v1beta1/auth";
import { AuthInfo, SignerInfo } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { decodePubkey, AccountData, Algo } from "@cosmjs/proto-signing";
import { coins, StdFee, type Pubkey } from "@cosmjs/amino";
import { Uint64 } from "@cosmjs/math";
import { AbstractAccount } from "../../types/generated/abstractaccount/v1/account";
import { assert } from "@cosmjs/utils";
import { accountFromAny } from "@cosmjs/stargate/build/accounts";
import { AAccountData } from "../../interfaces/AASigner";
import {
  AAAlgo,
  AddAuthenticator,
  IQueryAAResponse,
  ISmartAccountAuthenticator,
  ISmartAccounts,
} from "../../interfaces/smartAccount";
import {
  AllSmartWalletQueryByIdAndTypeAndAuthenticator,
  SingleSmartWalletQuery,
  SmartWalletIndexQueryByAccountId,
} from "../../interfaces/queries";
import { OTPsAuthenticateResponse } from "stytch";
import {
  ApolloClient,
  InMemoryCache,
  NormalizedCacheObject,
} from "@apollo/client";

let apolloClientInstance: ApolloClient<NormalizedCacheObject>;

export const getApolloClient = (url?: string) => {
  if (!apolloClientInstance) {
    apolloClientInstance = new ApolloClient({
      uri: url || "https://api.subquery.network/sq/burnt-labs/xion-indexer",
      cache: new InMemoryCache(),
      assumeImmutableResults: true,
    });
  }
  return apolloClientInstance;
};

export type INodes<T> = {
  nodes: Array<T>;
};

function uint64FromProto(input: number | bigint): Uint64 {
  return Uint64.fromString(input.toString());
}

function accountFromBaseAccount(input: BaseAccount) {
  const { address, pubKey, accountNumber, sequence } = input;
  let pubkey: Pubkey | null = null;
  if (pubKey) {
    pubkey = decodePubkey(pubKey);
  }
  return {
    address,
    pubkey,
    accountNumber: uint64FromProto(accountNumber).toNumber(),
    sequence: uint64FromProto(sequence).toNumber(),
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

/**
 * This method gets all the AA accounts in which the signers in the accountData
 * are authenticators for
 *  @param accounts the account data of the signer
 *  @param abstractAccount the abstract account address
 **/
export async function getAAccounts(
  accounts: readonly AccountData[],
  abstractAccount: string,
  indexerUrl: string,
): Promise<AAccountData[]> {
  const defaultData: AAccountData = {
    address: "",
    accountAddress: "",
    algo: AAAlgo.Secp256K1,
    pubkey: new Uint8Array(),
    authenticatorId: 0,
  };
  const allAAAcounts: AAccountData[] = [];
  // here we get all the accounts of the super DirectSecp256k1HdWallet
  // class then we use the public key and algo type to query the xion-indexer
  // for the abstract account authenticators matching the public key and algo type
  const apolloClient = getApolloClient(indexerUrl);
  if (!apolloClient || !accounts || accounts.length === 0) {
    return [defaultData];
  }
  for (const account of accounts) {
    const { data } = await apolloClient.query<IQueryAAResponse>({
      query: AllSmartWalletQueryByIdAndTypeAndAuthenticator,
      variables: {
        id: abstractAccount,
        type: AAAlgo[account.algo],
        authenticator: Buffer.from(account.pubkey).toString("base64"),
      },
    });
    if (data) {
      const smartAccounts: ISmartAccounts = data.smartAccounts;
      if (!smartAccounts.nodes.length) {
        // No smart account found for this account
        continue;
      }
      for (const node of smartAccounts.nodes) {
        const smartAccountAuthenticators: INodes<ISmartAccountAuthenticator> =
          node.authenticators;
        if (!smartAccountAuthenticators.nodes.length) {
          // No authenticator found for this account
          continue;
        }
        for (const authenticator of smartAccountAuthenticators.nodes) {
          const splitAuthenticatorId = authenticator.id.split("-");
          allAAAcounts.push({
            address: splitAuthenticatorId[0],
            accountAddress: account.address,
            algo: authenticator.type.toLowerCase() as Algo,
            pubkey: new Uint8Array(), // to signify an AA account
            authenticatorId: Number(splitAuthenticatorId[1]),
          });
        }
      }
    }
  }
  return allAAAcounts;
}

/**
 * Get the last authenticator id of the abstract account
 * @param abstractAccount
 * @returns
 */
export async function getAALastAuthenticatorId(
  abstractAccount: string,
  indexerUrl: string,
): Promise<number> {
  const apolloClient = getApolloClient(indexerUrl);
  const { data } = await apolloClient.query<{
    smartAccount: { id: string; latestAuthenticatorId: number };
  }>({
    query: SingleSmartWalletQuery,
    variables: {
      id: abstractAccount,
    },
  });
  if (!data || !data.smartAccount || !data.smartAccount.latestAuthenticatorId) {
    return 0;
  }
  return data.smartAccount.latestAuthenticatorId;
}

/**
 * Get the last authenticator id of the abstract account
 * @param abstractAccount
 * @returns
 */
export async function getAuthenticatorIdByAuthenticatorIndex(
  abstractAccount: string,
  authenticatorIndex: number,
  indexerUrl: string,
): Promise<number> {
  const apolloClient = getApolloClient(indexerUrl);
  const { data } = await apolloClient.query<{
    smartAccounts: {
      nodes: {
        authenticators: {
          nodes: {
            authenticator: string;
            authenticatorIndex: number;
            id: string;
            type: string;
            version: string;
          }[];
        };
        id: string;
      }[];
    };
  }>({
    query: SmartWalletIndexQueryByAccountId,
    variables: {
      id: abstractAccount,
      index: authenticatorIndex,
    },
  });
  if (!data || !data.smartAccounts) {
    return 0;
  }

  if (data.smartAccounts.nodes.length > 1) {
    console.warn(
      "Unexpected behavior. Indexer returned multiple smart accounts",
    );
  }

  if (data.smartAccounts.nodes[0].authenticators.nodes.length > 1) {
    console.warn(
      "Unexpected behavior. Indexer returned multiple authenticators",
    );
  }

  // Always returning the first one found because this query should only return an array of 1
  return (
    data.smartAccounts.nodes[0].authenticators.nodes[0].authenticatorIndex || 0
  );
}

/**
 * Build an add authenticator message for the abstract account
 * @param authType
 * @param abstractAccount the abstract account address
 * @param authData
 * @returns
 */
export async function buildAddJWTAuthenticatorMsg(
  abstractAccount: string,
  session: OTPsAuthenticateResponse, // this is the extra data required for the authenticator,
  indexerUrl: string,
  aud: string,
): Promise<AddAuthenticator | undefined> {
  // get the AA lastAuthenticatorId
  const lastAuthenticatorId = await getAALastAuthenticatorId(
    abstractAccount,
    indexerUrl,
  );
  let addAuthMsg: AddAuthenticator = {
    add_auth_method: {
      add_authenticator: {
        Jwt: {
          id: lastAuthenticatorId + 1,
          aud,
          sub: session.user.user_id,
          token: session.session_token,
        },
      },
    },
  };
  return addAuthMsg;
}

export function encodeHex(bytes: Uint8Array) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
