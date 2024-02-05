import { useContext, useEffect } from "react";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { AbstraxionContext } from "@/src/components/AbstraxionContext";

export interface AbstraxionAccount {
  bech32Address: string;
}

export interface UseAbstraxionAccountProps {
  data: AbstraxionAccount;
  isConnected: boolean;
}

export const useAbstraxionAccount = (): UseAbstraxionAccountProps => {
  const {
    isConnected,
    granterAddress,
    abstraxionAccount,
    isConnecting,
    setGranterAddress,
    setAbstraxionAccount,
    setIsConnected,
    setIsConnecting,
  } = useContext(AbstraxionContext);

  useEffect(() => {
    async function configureAccount() {
      setIsConnecting(true);
      const tempKeypair = localStorage.getItem("xion-authz-temp-account");
      if (tempKeypair) {
        const deserializedKeypair = await DirectSecp256k1HdWallet.deserialize(
          tempKeypair,
          "abstraxion",
        );
        setAbstraxionAccount(deserializedKeypair);
        const granterAccount = localStorage.getItem(
          "xion-authz-granter-account",
        );
        if (granterAccount) {
          setGranterAddress(granterAccount);
          setIsConnected(true);
        }
      } else {
        // Wipe granter even if it exists, clean context
        localStorage.removeItem("xion-authz-granter-account");
        setAbstraxionAccount(undefined);
        setGranterAddress("");
      }
      setIsConnecting(false);
    }

    if (!isConnecting && !abstraxionAccount && !granterAddress) {
      configureAccount();
    }
  }, [isConnected, abstraxionAccount, granterAddress]);

  return {
    data: {
      bech32Address: granterAddress,
    },
    isConnected,
  };
};
