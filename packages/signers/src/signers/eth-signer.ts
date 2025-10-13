import { DirectSignResponse, makeSignBytes } from "@cosmjs/proto-signing";
import { SignDoc } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { AAccountData, AASigner } from "../interfaces/AASigner";
import { encodeHex } from "./utils";
import { AAAlgo } from "../interfaces";

/**
 * Interface for a personalSign function.
 * This function signs a message using an Ethereum account's private key and returns a signature.
 */
export interface PersonalSignFn {
  /**
   * Signs a given message with the provided address.
   *
   * @param message - The message to be signed as a hex string.
   * @returns A promise that resolves to the signature as a hex string.
   */
  (message: string): Promise<string>;
}

/**
 * This class is an implementation of the AASigner interface using the DirectSecp256k1HdWallet
 * or any other signer that implements the AASigner interface
 * This class use would generally be with a wallet since it's method of signing is the same as the
 * DirectSecp256k1HdWallet. The only difference is that it makes sure to replace the signer address
 * with a valid wallet address (as to the abstract account address) before signing the transaction.
 *
 * Note: instance variable abstractAccount must be set before any signing
 * @abstractAccount the abstract account address of the signer
 * @accountAuthenticatorIndex the index of the abstract account authenticator
 * @personalSign callback to the Ethereum signing function
 * @implements AASigner
 */

export class AAEthSigner extends AASigner {
  constructor(
    abstractAccount: string,
    public accountAuthenticatorIndex: number,
    public personalSign: PersonalSignFn,
  ) {
    super(abstractAccount);
  }

  async signDirect(
    signerAddress: string,
    signDoc: SignDoc,
  ): Promise<DirectSignResponse> {
    const signBytes = makeSignBytes(signDoc);
    const signBytesHex = "0x" + encodeHex(signBytes);
    const signature = await this.personalSign(signBytesHex);

    const byteArray = new Uint8Array(
      signature.match(/[\da-f]{2}/gi).map((hex) => parseInt(hex, 16)),
    );
    const base64String = btoa(String.fromCharCode.apply(null, byteArray));

    return {
      signed: signDoc,
      signature: {
        pub_key: {
          type: "tendermint/PubKeySecp256k1",
          value: "", // This doesn't matter. All we need is signature below
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
        authenticatorId: this.accountAuthenticatorIndex,
        accountAddress: this.abstractAccount,
        aaalgo: AAAlgo.ETHWALLET,
      },
    ];
  }
}
