import {
  DirectSignResponse,
  makeSignBytes,
  OfflineDirectSigner,
} from "@cosmjs/proto-signing";
import { SignDoc } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { AAccountData, AASigner } from "../interfaces/AASigner";
import { SignArbitraryFn } from "./direct-signer.ts";

/**
 *  This class exists to
 */
export class AADirectLocalSigner extends AASigner {
  constructor(
    public signer: OfflineDirectSigner,
    public abstractAccount: string,
    public accountAuthenticatorIndex: number,
    public signArbFn: SignArbitraryFn,
    public accountData: AAccountData,
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
    return Promise.resolve([this.accountData]);
  }
}
