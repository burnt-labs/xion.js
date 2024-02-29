import { ReactNode, createContext, useState } from "react";
import { getEnvStringOrThrow } from "@/utils";
import { ChainInfo } from "@burnt-labs/constants";

type ConnectionType = "stytch" | "graz" | "metamask" | "none";

export interface AbstraxionContextProps {
  connectionType: ConnectionType;
  setConnectionType: React.Dispatch<React.SetStateAction<ConnectionType>>;
  abstractAccount: any; // TODO: Properly define interface here
  setAbstractAccount: React.Dispatch<any>;
  abstraxionError: string;
  setAbstraxionError: React.Dispatch<React.SetStateAction<string>>;
  apiUrl: string;
  chainInfo: ChainInfo;
}

export const AbstraxionContext = createContext<AbstraxionContextProps>(
  {} as AbstraxionContextProps,
);

export const AbstraxionContextProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [connectionType, setConnectionType] = useState<ConnectionType>("none");
  const [abstractAccount, setAbstractAccount] = useState<any | undefined>(
    undefined,
  );
  const [abstraxionError, setAbstraxionError] = useState("");

  const serializedChainInfo = getEnvStringOrThrow(
    "NEXT_PUBLIC_DEFAULT_CHAIN_INFO",
    process.env.NEXT_PUBLIC_DEFAULT_CHAIN_INFO,
  );
  const chainInfo = JSON.parse(serializedChainInfo);
  const apiUrl = getEnvStringOrThrow(
    "NEXT_PUBLIC_DEFAULT_API_URL",
    process.env.NEXT_PUBLIC_DEFAULT_API_URL,
  );

  return (
    <AbstraxionContext.Provider
      value={{
        connectionType,
        setConnectionType,
        abstractAccount,
        setAbstractAccount,
        abstraxionError,
        setAbstraxionError,
        apiUrl,
        chainInfo,
      }}
    >
      {children}
    </AbstraxionContext.Provider>
  );
};
