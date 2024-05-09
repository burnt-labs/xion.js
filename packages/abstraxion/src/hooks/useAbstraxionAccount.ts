import { useContext, useEffect } from "react";
import { AbstraxionContext } from "@/src/components/AbstraxionContext";
import { abstraxionAuth } from "../components/Abstraxion";

export interface AbstraxionAccount {
  bech32Address: string;
}

export interface AbstraxionAccountState {
  data: AbstraxionAccount;
  isConnected: boolean;
  isConnecting: boolean;
}

export const useAbstraxionAccount = (): AbstraxionAccountState => {
  const {
    isConnected,
    granterAddress,
    abstraxionAccount,
    isConnecting,
    setIsConnected,
    setAbstraxionAccount,
    setGranterAddress,
  } = useContext(AbstraxionContext);

  useEffect(() => {
    const unsubscribe = abstraxionAuth.subscribeToAuthStateChange(
      async (newState: boolean) => {
        setIsConnected(newState);
        if (Boolean(newState) === true) {
          const account = await abstraxionAuth.getLocalKeypair();
          const granterAddress = abstraxionAuth.getGranter();
          setAbstraxionAccount(account);
          setGranterAddress(granterAddress);
        }
      },
    );

    return () => {
      unsubscribe?.();
    };
  }, [abstraxionAuth]);

  useEffect(() => {
    async function persistAuthenticateState() {
      await abstraxionAuth.authenticate();
    }

    if (!isConnecting && !abstraxionAccount && !granterAddress) {
      persistAuthenticateState();
    }
  }, [isConnected, abstraxionAccount, granterAddress, abstraxionAuth]);

  return {
    data: {
      bech32Address: granterAddress,
    },
    isConnected,
    isConnecting,
  };
};
