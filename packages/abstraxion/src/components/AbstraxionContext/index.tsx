import type { ReactNode } from "react";
import { useEffect, createContext, useState } from "react";
import type { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { testnetChainInfo } from "@burnt-labs/constants";

export type ContractGrantDescription =
  | string
  | {
      address: string;
      amounts: { denom: string; amount: string }[];
    };

export interface AbstraxionContextProps {
  isConnected: boolean;
  setIsConnected: React.Dispatch<React.SetStateAction<boolean>>;
  isConnecting: boolean;
  setIsConnecting: React.Dispatch<React.SetStateAction<boolean>>;
  abstraxionError: string;
  setAbstraxionError: React.Dispatch<React.SetStateAction<string>>;
  abstraxionAccount: DirectSecp256k1HdWallet | undefined;
  setAbstraxionAccount: React.Dispatch<DirectSecp256k1HdWallet | undefined>;
  granterAddress: string;
  showModal: boolean;
  setShowModal: React.Dispatch<React.SetStateAction<boolean>>;
  setGranterAddress: React.Dispatch<React.SetStateAction<string>>;
  contracts?: ContractGrantDescription[];
  dashboardUrl?: string;
  rpcUrl?: string;
}

export const AbstraxionContext = createContext<AbstraxionContextProps>(
  {} as AbstraxionContextProps,
);

export function AbstraxionContextProvider({
  children,
  contracts,
  dashboardUrl = "https://dashboard.burnt.com",
  rpcUrl = testnetChainInfo.rpc,
}: {
  children: ReactNode;
  contracts?: ContractGrantDescription[];
  dashboardUrl?: string;
  rpcUrl?: string;
}): JSX.Element {
  const [abstraxionError, setAbstraxionError] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [abstraxionAccount, setAbstraxionAccount] = useState<
    DirectSecp256k1HdWallet | undefined
  >(undefined);
  const [granterAddress, setGranterAddress] = useState("");

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("granted") === "true") {
      setShowModal(true);
    }
  }, []);

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
        rpcUrl,
      }}
    >
      {children}
    </AbstraxionContext.Provider>
  );
}
