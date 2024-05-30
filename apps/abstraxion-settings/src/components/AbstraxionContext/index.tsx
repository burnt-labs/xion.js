import { createContext, useState } from "react";
import { ChainInfo } from "@burnt-labs/constants";

import { getEnvStringOrThrow } from "../../utils";

type ConnectionType = "stytch" | "graz" | "metamask" | "okx" | "none";
type Dispatch<A> = (value: A) => void;
type SetStateAction<S> = S | ((prevState: S) => S);

export interface AbstraxionContextProps {
  connectionType: ConnectionType;
  setConnectionType: Dispatch<SetStateAction<ConnectionType>>;
  abstractAccount: any; // TODO: Properly define interface here
  setAbstractAccount: Dispatch<any>;
  abstraxionError: string;
  setAbstraxionError: Dispatch<SetStateAction<string>>;
  apiUrl: string;
  chainInfo: ChainInfo;
  isMainnet: boolean;
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

export const AbstraxionContext = createContext<AbstraxionContextProps>(
  {} as AbstraxionContextProps,
);

export const AbstraxionContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [connectionType, setConnectionType] = useState<ConnectionType>("none");
  const [abstractAccount, setAbstractAccount] = useState<any | undefined>(
    undefined,
  );
  const [abstraxionError, setAbstraxionError] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const serializedChainInfo = getEnvStringOrThrow(
    "VITE_DEFAULT_CHAIN_INFO",
    import.meta.env.VITE_DEFAULT_CHAIN_INFO,
  );
  const chainInfo = JSON.parse(serializedChainInfo);
  const apiUrl = getEnvStringOrThrow(
    "VITE_DEFAULT_API_URL",
    import.meta.env.VITE_DEFAULT_API_URL,
  );
  const isMainnet =
    getEnvStringOrThrow(
      "VITE_DEPLOYMENT_ENV",
      import.meta.env.VITE_DEPLOYMENT_ENV,
    ) === "mainnet"
      ? true
      : false;

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
        isMainnet,
        isOpen,
        setIsOpen,
      }}
    >
      {children}
    </AbstraxionContext.Provider>
  );
};
