import { useContext, useEffect } from "react";
import { AbstraxionContext } from "@/src/components/AbstraxionContext";

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
    abstraxionAuth,
    isConnected,
    granterAddress,
    abstraxionAccount,
    isConnecting,
    setIsConnected,
    setIsConnecting,
    setAbstraxionAccount,
    setGranterAddress,
  } = useContext(AbstraxionContext);

  useEffect(() => {
    const unsubscribe = abstraxionAuth?.subscribeToAuthStateChange(
      async (newState: boolean) => {
        if (Boolean(newState) === true) {
          const account = await abstraxionAuth.getLocalKeypair();
          const granterAddress = abstraxionAuth.getGranter();
          setAbstraxionAccount(account);
          setGranterAddress(granterAddress);
        }
        setIsConnected(newState);
      },
    );

    return () => {
      unsubscribe?.();
    };
  }, [abstraxionAuth]);

  useEffect(() => {
    async function persistAuthenticateState() {
      setIsConnecting(true);
      await abstraxionAuth?.authenticate();
      setIsConnecting(false);
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
