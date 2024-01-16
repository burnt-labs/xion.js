import { useContext, useEffect, useState } from "react";
import { GasPrice, SigningCosmWasmClient } from "graz/dist/cosmjs";
import { testnetChainInfo } from "@burnt-labs/constants";
import {
  AbstraxionContext,
  AbstraxionContextProps,
} from "@/src/components/AbstraxionContext";

export const useAbstraxionSigningClient = () => {
  const { isConnected, abstraxionAccount } = useContext(
    AbstraxionContext,
  ) as AbstraxionContextProps;

  const [abstractClient, setAbstractClient] = useState<
    SigningCosmWasmClient | undefined
  >(undefined);

  useEffect(() => {
    async function getSigner() {
      try {
        if (!abstraxionAccount) {
          throw new Error("No account found.");
        }
        const directClient = await SigningCosmWasmClient.connectWithSigner(
          testnetChainInfo.rpc,
          abstraxionAccount,
          {
            gasPrice: GasPrice.fromString("0uxion"),
          },
        );

        setAbstractClient(directClient);
      } catch (error) {
        console.log("Something went wrong: ", error);
      }
    }

    if (isConnected && abstraxionAccount) {
      getSigner();
    }
  }, [abstraxionAccount, isConnected]);

  return { client: abstractClient };
};
