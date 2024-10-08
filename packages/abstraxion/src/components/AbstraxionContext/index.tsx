import type { ReactNode } from "react";
import { createContext, useCallback, useEffect, useState } from "react";
import { testnetChainInfo } from "@burnt-labs/constants";
import { SignArbSecp256k1HdWallet } from "@burnt-labs/abstraxion-core";
import { abstraxionAuth } from "../Abstraxion";

export type SpendLimit = { denom: string; amount: string };

export type ContractGrantDescription =
  | string
  | {
      address: string;
      amounts: SpendLimit[];
    };

export interface AbstraxionContextProps {
  isConnected: boolean;
  setIsConnected: React.Dispatch<React.SetStateAction<boolean>>;
  isConnecting: boolean;
  setIsConnecting: React.Dispatch<React.SetStateAction<boolean>>;
  abstraxionError: string;
  setAbstraxionError: React.Dispatch<React.SetStateAction<string>>;
  abstraxionAccount: SignArbSecp256k1HdWallet | undefined;
  setAbstraxionAccount: React.Dispatch<SignArbSecp256k1HdWallet | undefined>;
  granterAddress: string;
  showModal: boolean;
  setShowModal: React.Dispatch<React.SetStateAction<boolean>>;
  setGranterAddress: React.Dispatch<React.SetStateAction<string>>;
  contracts?: ContractGrantDescription[];
  dashboardUrl?: string;
  setDashboardUrl: React.Dispatch<React.SetStateAction<string>>;
  rpcUrl: string;
  restUrl: string;
  stake?: boolean;
  bank?: SpendLimit[];
  treasury?: string;
  logout: () => void;
}

export const AbstraxionContext = createContext<AbstraxionContextProps>(
  {} as AbstraxionContextProps,
);

export function AbstraxionContextProvider({
  children,
  contracts,
  rpcUrl = testnetChainInfo.rpc,
  restUrl = testnetChainInfo.rest,
  stake = false,
  bank,
  callbackUrl,
  treasury,
}: {
  children: ReactNode;
  contracts?: ContractGrantDescription[];
  dashboardUrl?: string;
  rpcUrl?: string;
  restUrl?: string;
  stake?: boolean;
  bank?: SpendLimit[];
  callbackUrl?: string;
  treasury?: string;
}): JSX.Element {
  const [abstraxionError, setAbstraxionError] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [abstraxionAccount, setAbstraxionAccount] = useState<
    SignArbSecp256k1HdWallet | undefined
  >(undefined);
  const [granterAddress, setGranterAddress] = useState("");
  const [dashboardUrl, setDashboardUrl] = useState("");

  const configureInstance = useCallback(() => {
    abstraxionAuth.configureAbstraxionInstance(
      rpcUrl,
      restUrl || "",
      contracts,
      stake,
      bank,
      callbackUrl,
      treasury,
    );
  }, [rpcUrl, restUrl, contracts, stake, bank, callbackUrl, treasury]);

  useEffect(() => {
    configureInstance();
  }, [configureInstance]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("granted") === "true") {
      setShowModal(true);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = abstraxionAuth.subscribeToAuthStateChange(
      async (newState: boolean) => {
        if (newState !== isConnected) {
          setIsConnected(newState);
          if (newState) {
            const account = await abstraxionAuth.getLocalKeypair();
            const granterAddress = abstraxionAuth.getGranter();
            setAbstraxionAccount(account);
            setGranterAddress(granterAddress);
          }
        }
      },
    );

    return () => {
      unsubscribe?.();
    };
  }, [isConnected, abstraxionAuth]);

  const persistAuthenticateState = useCallback(async () => {
    await abstraxionAuth.authenticate();
  }, [abstraxionAuth]);

  useEffect(() => {
    if (!isConnecting && !abstraxionAccount && !granterAddress) {
      persistAuthenticateState();
    }
  }, [
    isConnecting,
    abstraxionAccount,
    granterAddress,
    persistAuthenticateState,
  ]);

  const logout = useCallback(() => {
    setIsConnected(false);
    setAbstraxionAccount(undefined);
    setGranterAddress("");
    abstraxionAuth?.logout();
  }, [abstraxionAuth]);

  return (
    <AbstraxionContext.Provider
      value={{
        isConnected,
        setIsConnected,
        isConnecting,
        setIsConnecting,
        abstraxionError,
        setAbstraxionError,
        abstraxionAccount,
        setAbstraxionAccount,
        granterAddress,
        showModal,
        setShowModal,
        setGranterAddress,
        contracts,
        dashboardUrl,
        setDashboardUrl,
        rpcUrl,
        restUrl,
        stake,
        bank,
        treasury,
        logout,
      }}
    >
      {children}
    </AbstraxionContext.Provider>
  );
}
