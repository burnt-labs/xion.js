import { makeADR36AminoSignDoc, serializeSignDoc } from "@keplr-wallet/cosmos";
import { Hash, PrivKeySecp256k1 } from "@keplr-wallet/crypto";

function fromHex(hexString: string): Uint8Array {
  const matches = hexString.match(/.{1,2}/g);
  if (matches === null) {
    return new Uint8Array(0);
  }
  return new Uint8Array(matches.map((byte) => parseInt(byte, 16)));
}

export function signArb(
  address: string,
  privateKey: string,
): (message: string | Uint8Array) => string {
  const cryptoPrivKey = new PrivKeySecp256k1(fromHex(privateKey));

  return (message: string | Uint8Array): string => {
    const signDoc = makeADR36AminoSignDoc(address, message);
    const serializedSignDoc = serializeSignDoc(signDoc);
    const digest = Hash.sha256(serializedSignDoc);

    const signature = cryptoPrivKey.signDigest32(digest);
    return Buffer.from(
      new Uint8Array([...signature.r, ...signature.s]),
    ).toString("base64");
  };
}
