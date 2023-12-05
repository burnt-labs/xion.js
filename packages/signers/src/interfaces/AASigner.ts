import { AccountData, DirectSignResponse } from "@cosmjs/proto-signing";
import { SignDoc } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { AAAlgo } from "./smartAccount";

/**
 * @extends AccountData
 */
export interface AAccountData extends AccountData {
  readonly authenticatorId: number;
  // This is the signer account address. Not the AA address. This
  // address is recognized by the wallet and used to sign the transaction
  readonly accountAddress: string;
  // The AA algorithm type
  readonly aaalgo?: AAAlgo;
}
export abstract class AASigner {
  /// The abstract account address of the signer
  /// must be set by implementing class
  abstractAccount: string | undefined;

  constructor(abstractAccount: string) {
    this.abstractAccount = abstractAccount;
  }
  /**
   * This method is to be implemented by every class that implements this interface
   * it will be used by the client to create the transaction AA signature
   * required to verify the transaction on the chain
   * This method should return a DirectSignResponse object but only the signature field is required
   * to be set
   * @param _signerAddress the abstract account address to be used as the signer
   * @param signDoc the sign doc to be signed
   * @returns
   */
  signDirect(
    _signerAddress: string,
    signDoc: SignDoc
  ): Promise<DirectSignResponse> {
    // default
    return Promise.resolve({
      signed: signDoc,
      signature: {
        signature: "",
        pub_key: {
          type: "tendermint/PubKeySecp256k1",
          value: new Uint8Array(),
        },
      },
    });
  }

  /**
   * This method is to be implemented by every class that implements this interface
   * it will be used by the client to get the account data of the current abstract account
   * the pubKey of the account data should be set to an empty Uint8Array since it's not required
   * and to declare it an AA
   * @returns {AAccountData} of length 1
   */
  abstract getAccounts(): Promise<readonly AAccountData[]>;
}

// Default implementation for a signer class
export class AADefaultSigner extends AASigner {
  constructor(abstractAccount: string) {
    super(abstractAccount);
  }

  getAccounts(): Promise<readonly AAccountData[]> {
    throw new Error("Cannot get accounts from default signer");
  }
}
