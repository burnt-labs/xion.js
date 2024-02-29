import { ReactNode, createContext, useState } from "react";
import { getEnvStringOrThrow } from "@/utils";

type ConnectionType = "stytch" | "graz" | "metamask" | "none";

export interface AbstraxionContextProps {
  connectionType: ConnectionType;
  setConnectionType: React.Dispatch<React.SetStateAction<ConnectionType>>;
  abstractAccount: any; // TODO: Properly define interface here
  setAbstractAccount: React.Dispatch<any>;
  abstraxionError: string;
  setAbstraxionError: React.Dispatch<React.SetStateAction<string>>;
  rpcUrl?: string;
  apiUrl?: string;
}

export const AbstraxionContext = createContext<AbstraxionContextProps>(
  {} as AbstraxionContextProps,
);

export const AbstraxionContextProvider = ({
  children,
  rpcUrl = getEnvStringOrThrow(
    "NEXT_PUBLIC_DEFAULT_RPC_URL",
    process.env.NEXT_PUBLIC_DEFAULT_RPC_URL,
  ),
  apiUrl = getEnvStringOrThrow(
    "NEXT_PUBLIC_DEFAULT_API_URL",
    process.env.NEXT_PUBLIC_DEFAULT_API_URL,
  ),
}: {
  children: ReactNode;
  rpcUrl?: string;
  apiUrl?: string;
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
        apiUrl,
      }}
    >
      {children}
    </AbstraxionContext.Provider>
  );
};
