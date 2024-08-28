import { DirectSignResponse, makeSignBytes } from "@cosmjs/proto-signing";
import { SignDoc } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { sha256 } from "@cosmjs/crypto";
import { get } from "@github/webauthn-json/browser-ponyfill";
import { AAccountData, AASigner } from "../interfaces/AASigner";
import { AAAlgo } from "../interfaces";
import { getAuthenticatorIdByAuthenticatorIndex } from "./utils";

function getBufferFromId(base64Url: string) {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const paddedBase64 = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );
  const buffer = Buffer.from(paddedBase64, "base64");
  return buffer;
}

function getRegisteredCredentials() {
  const registrations = JSON.parse(
    localStorage.xionUserStoredCreds || "[]",
  ).map((reg: any) => ({
    ...reg,
    id: getBufferFromId(reg.rawId),
  }));
  return registrations;
}

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
    const challenge = new Uint8Array(hashSignBytes);
    const challengeString = Buffer.from(challenge).toString("base64");

    const options: CredentialRequestOptions = {
      publicKey: {
        challenge: Buffer.from(challengeString),
        allowCredentials: getRegisteredCredentials(),
        userVerification: "preferred",
      },
    };

    const publicKeyCredential = await get(options);
    const pubKeyJson = publicKeyCredential.toJSON();
    const pubKeyCredArray = new TextEncoder().encode(
      JSON.stringify(pubKeyJson),
    );
    const pubKeyB64 = Buffer.from(pubKeyCredArray).toString("base64");

    return {
      signed: signDoc,
      signature: {
        pub_key: {
          type: "tendermint/PubKeySecp256k1",
          value: "", // This doesn't matter. All we need is the signature below
        },
        signature: pubKeyB64,
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
