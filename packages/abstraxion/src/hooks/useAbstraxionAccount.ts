import { useContext, useEffect } from "react";
import {
  AbstraxionContext,
  AbstraxionContextProps,
} from "@/src/components/AbstraxionContext";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";

export interface AbstraxionAccount {
  bech32Address: string;
}

export interface useAbstraxionAccountProps {
  data: AbstraxionAccount;
  isConnected: boolean;
}

export const useAbstraxionAccount = (): useAbstraxionAccountProps => {
  const {
    isConnected,
    grantorAddress,
    abstraxionAccount,
    isConnecting,
    setGrantorAddress,
    setAbstraxionAccount,
    setIsConnected,
    setIsConnecting,
  } = useContext(AbstraxionContext) as AbstraxionContextProps;

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
        const grantorAccount = localStorage.getItem(
          "xion-authz-grantor-account",
        );
        if (grantorAccount) {
          setGrantorAddress(grantorAccount);
          setIsConnected(true);
        }
      } else {
        // Wipe grantor even if it exists, clean context
        localStorage.removeItem("xion-authz-grantor-account");
        setAbstraxionAccount(undefined);
        setGrantorAddress("");
      }
      setIsConnecting(false);
    }

    if (!isConnecting && !abstraxionAccount && !grantorAddress) {
      configureAccount();
    }
  }, [isConnected, abstraxionAccount, grantorAddress]);

  return {
    data: {
      bech32Address: grantorAddress,
    },
    isConnected: isConnected,
  };
};
