import { DirectSignResponse, makeSignBytes } from "@cosmjs/proto-signing";
import { Buffer } from "buffer";
import { SignDoc } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { AAccountData, AASigner } from "../interfaces/AASigner";
import { AAAlgo } from "../interfaces";

/**
 * This class is an implementation of the AASigner interface using zk-email.
 * This class is designed to be used with zk-email authenticators for signing transactions.
 * It ensures that the signer address is replaced with a valid wallet address
 * (as to the abstract account address) before signing the transaction.
 *
 * Note: instance variable abstractAccount must be set before any signing.
 * @abstractAccount the abstract account address of the signer
 * @accountAuthenticatorIndex the index of the abstract account authenticator
 * @implements AASigner
 */
export class AAZKEmailSigner extends AASigner {
  constructor(
    abstractAccount: string,
    public accountAuthenticatorIndex: number,
    public proof: string,
    public publicInputs: string,
  ) {
    super(abstractAccount);
    this.proof = proof;
    this.publicInputs = publicInputs;
  }

  async signDirect(
    _signerAddress: string,
    signDoc: SignDoc,
  ): Promise<DirectSignResponse> {
    // For zk-email, we combine the proof and publicInputs into a single JSON signature
    // This follows the zk-email standard format for proof verification

    // signBytes could be used in the future for additional verification
    const _signBytes = makeSignBytes(signDoc);
    void _signBytes; // Acknowledge intentionally unused variable

    // In a real implementation, you would:
    // 1. Verify the zk-proof against the public inputs
    // 2. Ensure the proof is still valid for the current transaction
    // 3. Combine proof and publicInputs into the signature format

    // Parse the stored proof and publicInputs
    let proofData;
    let publicInputs;

    try {
      proofData = JSON.parse(this.proof);
      publicInputs = JSON.parse(this.publicInputs);
    } catch {
      throw new Error("Invalid proof or publicInputs format");
    }

    // Create the combined signature structure
    const zkEmailSignature = {
      proof: {
        pi_a: proofData.pi_a || [],
        pi_b: proofData.pi_b || [[], [], []],
        pi_c: proofData.pi_c || [],
        protocol: proofData.protocol || "groth16",
      },
      publicInputs: publicInputs || [],
    };

    // Convert to base64 for transmission
    const signatureJson = JSON.stringify(zkEmailSignature);
    const base64Signature = Buffer.from(signatureJson, "utf-8").toString(
      "base64",
    );

    return {
      signed: signDoc,
      signature: {
        pub_key: {
          type: "tendermint/PubKeySecp256k1",
          value: "", // This doesn't matter for zk-email
        },
        signature: base64Signature,
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
        aaalgo: AAAlgo.ZKEmail,
      },
    ];
  }
}