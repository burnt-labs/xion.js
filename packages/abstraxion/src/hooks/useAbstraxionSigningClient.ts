import { useContext, useEffect, useState } from "react";
import { testnetChainInfo } from "@burnt-labs/constants";
import { GasPrice } from "@cosmjs/stargate";
import type { AbstraxionContextProps } from "@/src/components/AbstraxionContext";
import { AbstraxionContext } from "@/src/components/AbstraxionContext";
import { GranteeSignerClient } from "@/src/GranteeSignerClient.ts";

export const useAbstraxionSigningClient = () => {
  const { isConnected, abstraxionAccount, granterAddress } =
    useContext(AbstraxionContext);

  const [abstractClient, setAbstractClient] = useState<
    GranteeSignerClient | undefined
  >(undefined);

  useEffect(() => {
    async function getSigner() {
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
        console.error("Something went wrong: ", error);
        setAbstractClient(undefined);
      }
    }

    getSigner();
  }, [isConnected, abstraxionAccount, granterAddress]);

  return { client: abstractClient };
};
