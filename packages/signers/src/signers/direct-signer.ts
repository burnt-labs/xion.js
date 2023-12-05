import { DirectSignResponse, OfflineDirectSigner } from "@cosmjs/proto-signing";
import { SignDoc } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { AAccountData, AASigner } from "../interfaces/AASigner";

import { getAAccounts } from "./utils";

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
  signer: OfflineDirectSigner;
  indexerUrl: string;

  constructor(initializedSigner: OfflineDirectSigner, abstractAccount: string, indexerUrl?: string) {
    super(abstractAccount);
    this.signer = initializedSigner;
    this.indexerUrl = indexerUrl || "https://api.subquery.network/sq/burnt-labs/xion-indexer"
  }
  async signDirect(
    signerAddress: string,
    signDoc: SignDoc
  ): Promise<DirectSignResponse> {
    return this.signer.signDirect(signerAddress, signDoc);
  }

  async getAccounts(): Promise<readonly AAccountData[]> {
    const accounts = await this.signer.getAccounts();
    if (accounts.length === 0) {
      return [];
    }
    if (this.abstractAccount === undefined) {
      // we treat this class a a normal signer not an AA signer
      return accounts.map((account) => {
        return {
          ...account,
          authenticatorId: 0,
          accountAddress: account.address,
        };
      });
    }
    return await getAAccounts(accounts, this.abstractAccount, this.indexerUrl);
  }
}
