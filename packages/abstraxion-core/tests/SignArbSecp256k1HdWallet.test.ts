import { TextDecoder, TextEncoder } from "node:util";
import { SignArbSecp256k1HdWallet } from "../src/SignArbSecp256k1HdWallet";
import { AccountData } from "@cosmjs/proto-signing";
import { serializeSignDoc } from "@cosmjs/amino";
import { Secp256k1, Secp256k1Signature, Sha256 } from "@cosmjs/crypto";
import { makeADR36AminoSignDoc } from "../src/utils";

global.TextEncoder = TextEncoder;
// @ts-expect-error: TextDecoder is not available in testing environment by default.
global.TextDecoder = TextDecoder;

describe("SignArbSecp256k1HdWallet", () => {
  let wallet: SignArbSecp256k1HdWallet;
  let account: AccountData;

  beforeEach(async () => {
    wallet = await SignArbSecp256k1HdWallet.generate(12, {
      prefix: "xion",
    });

    [account] = await wallet.getAccounts();
  });

  test("signArb returns a signature for a valid signer address and message", async () => {
    const signerAddress = account.address; // Empty test account
    const message = "test";
    const signature = await wallet.signArb(signerAddress, message);
    expect(signature).toBeDefined();
    expect(typeof signature).toBe("string");
  });

  test("example of how to confirm signArb result", async () => {
    async function verifyXionSignature(
      address: string,
      pubKey: string,
      messageString: string,
      signature: string,
    ): Promise<boolean> {
      const signatureBuffer = Buffer.from(signature, "base64");
      const uint8Signature = new Uint8Array(signatureBuffer); // Convert the buffer to an Uint8Array
      const pubKeyValueBuffer = Buffer.from(pubKey, "base64"); // Decode the base64 encoded value
      const pubKeyUint8Array = new Uint8Array(pubKeyValueBuffer); // Convert the buffer to an Uint8Array

      const signDoc = makeADR36AminoSignDoc(address, messageString);
      const serializedSignDoc = serializeSignDoc(signDoc);
      const messageHash = new Sha256(serializedSignDoc).digest();

      const signatureParts = Secp256k1Signature.fromFixedLength(uint8Signature);

      return Secp256k1.verifySignature(
        signatureParts,
        messageHash,
        pubKeyUint8Array,
      );
    }

    const granterAddress =
      "xion15wvfkv5wkp7dvxquxm3nkhrfy98nahjqpp3a2r5h9tcj29r9wxnq6j5eeh";

    const { pubkey, address: granteeAddress } = account;

    const exampleMessage = "Test message";

    // Passing in as a string since this is likely how be encoded when sent to an api
    const base64PubKey = Buffer.from(pubkey).toString("base64");
    const signature = await wallet.signArb(granteeAddress, exampleMessage);

    const result = await verifyXionSignature(
      granteeAddress,
      base64PubKey,
      exampleMessage,
      signature,
    );

    expect(result).toBeTruthy();

    // After the signature is verified, we must check to see if ANY grant that exists between the granter and the grantee.
    // Please see `packages/abstraxion-core/src/AbstraxionAuth.ts` or the docs for an example of how to do this.
  });
});
