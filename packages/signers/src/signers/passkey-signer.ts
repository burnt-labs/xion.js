import { DirectSignResponse, makeSignBytes } from "@cosmjs/proto-signing";
import { SignDoc } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { AAccountData, AASigner } from "../interfaces/AASigner";
import { encodeHex, getAuthenticatorIdByAuthenticatorIndex } from "./utils";
import { AAAlgo } from "../interfaces";
import { sha256 } from "@cosmjs/crypto";

/**
 * This class is an implementation of the AASigner interface using WebAuthn.
 * This class is designed to be used with WebAuthn authenticators for signing transactions.
 * It ensures that the signer address is replaced with a valid wallet address
 * (as to the abstract account address) before signing the transaction.
 *
 * Note: instance variable abstractAccount must be set before any signing.
 * @abstractAccount the abstract account address of the signer
 * @accountAuthenticatorIndex the index of the abstract account authenticator
 * @implements AASigner
 */
export class AAPasskeySigner extends AASigner {
  accountAuthenticatorIndex: number;
  indexerUrl: string;

  constructor(
    abstractAccount: string,
    accountAuthenticatorIndex: number,
    indexerUrl?: string,
  ) {
    super(abstractAccount);
    this.accountAuthenticatorIndex = accountAuthenticatorIndex;
    this.indexerUrl =
      indexerUrl || "https://api.subquery.network/sq/burnt-labs/xion-indexer";
  }

  async signDirect(
    signerAddress: string,
    signDoc: SignDoc,
  ): Promise<DirectSignResponse> {
    if (!this.abstractAccount) {
      throw new Error("No abstract account");
    }

    const signBytes = makeSignBytes(signDoc);
    const hashSignBytes = sha256(signBytes);
    const signBytesBuffer = Buffer.from(hashSignBytes);

    const credential = (await navigator.credentials.get({
      publicKey: {
        challenge: signBytesBuffer,
        allowCredentials: JSON.parse(
          localStorage.getItem("xion-passkeys") || "[]",
        ),
        userVerification: "preferred",
      },
    })) as PublicKeyCredential;

    if (!credential) {
      throw new Error("Failed to get WebAuthn credential");
    }

    const response = credential.response as AuthenticatorAssertionResponse;
    const byteArray = new Uint8Array(response.signature);
    const base64String = Buffer.from(byteArray).toString("base64");

    return {
      signed: signDoc,
      signature: {
        pub_key: {
          type: "tendermint/PubKeySecp256k1",
          value: "", // This doesn't matter. All we need is the signature below
        },
        signature: base64String,
      },
    };
  }

  async getAccounts(): Promise<readonly AAccountData[]> {
    if (this.abstractAccount === undefined) {
      return [];
    }

    return [
      {
        address: this.abstractAccount,
        algo: "secp256k1", // we don't really care about this
        pubkey: new Uint8Array(),
        authenticatorId: await getAuthenticatorIdByAuthenticatorIndex(
          this.abstractAccount,
          this.accountAuthenticatorIndex,
          this.indexerUrl,
        ),
        accountAddress: this.abstractAccount,
        aaalgo: AAAlgo.passkey,
      },
    ];
  }
}
