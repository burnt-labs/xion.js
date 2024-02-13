import { useContext, useEffect, useState } from "react";
import { testnetChainInfo } from "@burnt-labs/constants";
import { GasPrice } from "@cosmjs/stargate";
import { makeADR36AminoSignDoc, serializeSignDoc } from "@keplr-wallet/cosmos";
import { Hash, PrivKeySecp256k1 } from "@keplr-wallet/crypto";
import type { OfflineDirectSigner } from "@cosmjs/proto-signing";
import { AbstraxionContext } from "@/src/components/AbstraxionContext";
import { GranteeSignerClient } from "@/src/GranteeSignerClient.ts";

function fromHex(hexString: string): Uint8Array {
  const matches = hexString.match(/.{1,2}/g);
  if (matches === null) {
    return new Uint8Array(0);
  }
  return new Uint8Array(matches.map((byte) => parseInt(byte, 16)));
}

function signArb(
  address: string,
  offlineSigner: OfflineDirectSigner,
): (message: string | Uint8Array) => Promise<string> {
  // const cryptoPrivKey = new PrivKeySecp256k1(fromHex(privateKey));

  return async (message: string | Uint8Array): Promise<string> => {
    const signDoc = makeADR36AminoSignDoc(address, message);
    // const serializedSignDoc = serializeSignDoc(signDoc);
    const { signature } = await offlineSigner.signDirect(address, signDoc);
    return signature.signature;
    // const digest = Hash.sha256(serializedSignDoc);

    // const signature = cryptoPrivKey.signDigest32(digest);
    // return Buffer.from(
    //   new Uint8Array([...signature.r, ...signature.s]),
    // ).toString("base64");
  };
}

export const useAbstraxionSigningClient = (): GranteeSignerClient => {
  const { isConnected, abstraxionAccount, granterAddress } =
    useContext(AbstraxionContext);

  const [abstractClient, setAbstractClient] = useState<
    GranteeSignerClient | undefined
  >(undefined);

  useEffect(() => {
    async function getSigner(): Promise<void> {
      try {
        if (!abstraxionAccount) {
          throw new Error("No account found.");
        }

        if (!granterAddress) {
          throw new Error("No granter found.");
        }
        const granteeAddress = await abstraxionAccount
          .getAccounts()
          .then((accounts) => {
            if (accounts.length === 0) {
              throw new Error("No account found.");
            }
            return accounts[0].address;
          });

        const directClient = await GranteeSignerClient.connectWithSigner(
          testnetChainInfo.rpc,
          abstraxionAccount,
          {
            gasPrice: GasPrice.fromString("0uxion"),
            granterAddress,
            granteeAddress,
          },
        );

        setAbstractClient(directClient);
      } catch (error) {
        console.log("Something went wrong: ", error);
        setAbstractClient(undefined);
      }
    }

    getSigner();
  }, [isConnected, abstraxionAccount, granterAddress]);

  return { client: abstractClient, signArb };
};
