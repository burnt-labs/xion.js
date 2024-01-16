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
  contracts?: string[];
}

export const AbstraxionContext = createContext<AbstraxionContextProps>(
  {} as AbstraxionContextProps,
);

export const AbstraxionContextProvider = ({
  children,
  contracts,
}: {
  children: ReactNode;
  contracts?: string[];
}) => {
  const [abstraxionError, setAbstraxionError] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [abstraxionAccount, setAbstraxionAccount] = useState<
    DirectSecp256k1HdWallet | undefined
  >(undefined);

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
        contracts,
      }}
    >
      {children}
    </AbstraxionContext.Provider>
  );
};
