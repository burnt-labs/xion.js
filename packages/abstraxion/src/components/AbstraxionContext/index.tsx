import { ReactNode, createContext, useState } from "react";
import type { DirectSecp256k1HdWallet } from "graz/dist/cosmjs";

export interface AbstraxionContextProps {
  isConnected: boolean;
  setIsConnected: React.Dispatch<React.SetStateAction<boolean>>;
  isConnecting: boolean;
  setIsConnecting: React.Dispatch<React.SetStateAction<boolean>>;
  abstraxionError: string;
  setAbstraxionError: React.Dispatch<React.SetStateAction<string>>;
  abstraxionAccount: DirectSecp256k1HdWallet | undefined;
  setAbstraxionAccount: React.Dispatch<DirectSecp256k1HdWallet | undefined>;
  grantorAddress: string;
  setGrantorAddress: React.Dispatch<React.SetStateAction<string>>;
  contracts?: string[];
  dashboardUrl?: string;
}

export const AbstraxionContext = createContext<AbstraxionContextProps>(
  {} as AbstraxionContextProps,
);

export const AbstraxionContextProvider = ({
  children,
  contracts,
  dashboardUrl,
}: {
  children: ReactNode;
  contracts?: string[];
  dashboardUrl?: string;
}) => {
  const [abstraxionError, setAbstraxionError] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [abstraxionAccount, setAbstraxionAccount] = useState<
    DirectSecp256k1HdWallet | undefined
  >(undefined);
  const [grantorAddress, setGrantorAddress] = useState("");

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
        grantorAddress,
        setGrantorAddress,
        contracts,
        dashboardUrl,
      }}
    >
      {children}
    </AbstraxionContext.Provider>
  );
};
