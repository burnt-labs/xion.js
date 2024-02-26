import { ReactNode, createContext, useState } from "react";
import { testnetChainInfo } from "@burnt-labs/constants";

type ConnectionType = "stytch" | "graz" | "metamask" | "none";

export interface AbstraxionContextProps {
  connectionType: ConnectionType;
  setConnectionType: React.Dispatch<React.SetStateAction<ConnectionType>>;
  abstractAccount: any; // TODO: Properly define interface here
  setAbstractAccount: React.Dispatch<any>;
  abstraxionError: string;
  setAbstraxionError: React.Dispatch<React.SetStateAction<string>>;
  rpcUrl?: string;
}

export const AbstraxionContext = createContext<AbstraxionContextProps>(
  {} as AbstraxionContextProps,
);

export const AbstraxionContextProvider = ({
  children,
  rpcUrl = testnetChainInfo.rpc,
}: {
  children: ReactNode;
  rpcUrl?: string;
}) => {
  const [connectionType, setConnectionType] = useState<ConnectionType>("none");
  const [abstractAccount, setAbstractAccount] = useState<any | undefined>(
    undefined,
  );
  const [abstraxionError, setAbstraxionError] = useState("");

  return (
    <AbstraxionContext.Provider
      value={{
        connectionType,
        setConnectionType,
        abstractAccount,
        setAbstractAccount,
        abstraxionError,
        setAbstraxionError,
        rpcUrl,
      }}
    >
      {children}
    </AbstraxionContext.Provider>
  );
};
