import {
  DirectSignResponse,
  makeSignBytes,
  OfflineDirectSigner,
} from "@cosmjs/proto-signing";
import { SignDoc } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { AAAlgo, AAccountData, AASigner } from "../interfaces";
import { StdSignature } from "@cosmjs/amino";

export type SignArbitraryFn = (
  chainId: string,
  signer: string,
  data: string | Uint8Array,
) => Promise<StdSignature>;

/**
 * This class is an implementation of the AASigner interface using the DirectSecp256k1HdWallet
 * or any other signer that implements the AASigner interface
 * This class use would generally be with a wallet since it's method of signing is the same as the
 * DirectSecp256k1HdWallet. The only difference is that it makes sure to replace the signer address
 * with a valid wallet address (as to the abstract account address) before signing the transaction.
 *
 * Note: instance variable abstractAccount must be set before any signing
 * @abstractAccount the abstract account address of the signer
 * @signer the signer to be used to sign the transaction
 * @implements AASigner
 */
export class AADirectSigner extends AASigner {
  constructor(
    public signer: Pick<OfflineDirectSigner, "getAccounts">,
    abstractAccount: string,
    public accountAuthenticatorIndex: number,
    public signArbFn: SignArbitraryFn,
  ) {
    super(abstractAccount);
  }

  async signDirect(
    signerAddress: string,
    signDoc: SignDoc,
  ): Promise<DirectSignResponse> {
    const signBytes = makeSignBytes(signDoc);
    const signature = await this.signArbFn(
      signDoc.chainId,
      signerAddress,
      signBytes,
    );
    return {
      signed: signDoc,
      signature: {
        pub_key: {
          type: "tendermint/PubKeySecp256k1",
          value: "", // This doesn't matter. All we need is signature below
        },
        signature: signature.signature,
      },
    };
  }

  async getAccounts(): Promise<readonly AAccountData[]> {
    if (this.abstractAccount === undefined) {
      return [];
    }

    const accounts = await this.signer.getAccounts();
    if (accounts.length === 0) {
      return [];
    } else if (accounts.length > 1) {
      // @TODO How to handle this case?
      console.log("Signer returned more than 1 account");
    }

    return [
      {
        address: this.abstractAccount,
        algo: "secp256k1", // we don't really care about this
        pubkey: new Uint8Array(),
        authenticatorId: this.accountAuthenticatorIndex,
        accountAddress: accounts[0].address,
        aaalgo: AAAlgo.Secp256K1,
      },
    ];
  }
}
