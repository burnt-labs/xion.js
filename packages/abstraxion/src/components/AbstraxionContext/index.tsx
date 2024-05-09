import type { ReactNode } from "react";
import { createContext, useEffect, useState } from "react";
import { testnetChainInfo } from "@burnt-labs/constants";
import {
  AbstraxionAuth,
  SignArbSecp256k1HdWallet,
} from "@burnt-labs/abstraxion-core";

export type SpendLimit = { denom: string; amount: string };

export type ContractGrantDescription =
  | string
  | {
      address: string;
      amounts: SpendLimit[];
    };

export interface AbstraxionContextProps {
  abstraxionAuth?: AbstraxionAuth;
  setAbstraxionAuth: React.Dispatch<
    React.SetStateAction<AbstraxionAuth | undefined>
  >;
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
  logout?: () => void;
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
}: {
  children: ReactNode;
  contracts?: ContractGrantDescription[];
  dashboardUrl?: string;
  rpcUrl?: string;
  restUrl?: string;
  stake?: boolean;
  bank?: SpendLimit[];
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

  const [abstraxionAuth, setAbstraxionAuth] = useState<
    AbstraxionAuth | undefined
  >(undefined);

  useEffect(() => {
    async function initializeAbstraxionAuth() {
      try {
        const abstraxionAuth = new AbstraxionAuth(
          rpcUrl,
          restUrl || "",
          contracts,
          stake,
          bank,
        );

        setAbstraxionAuth(abstraxionAuth);
      } catch (error) {
        console.warn("Failed to intialize abstraxion-core: ", error);
      }
    }

    if (!abstraxionAuth) {
      initializeAbstraxionAuth();
    }
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("granted") === "true") {
      setShowModal(true);
    }
  }, []);

  const logout = () => {
    setIsConnected(false);
    setAbstraxionAccount(undefined);
    setGranterAddress("");
    abstraxionAuth?.logout();
  };

  return (
    <AbstraxionContext.Provider
      value={{
        abstraxionAuth,
        setAbstraxionAuth,
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
        logout,
      }}
    >
      {children}
    </AbstraxionContext.Provider>
  );
}
