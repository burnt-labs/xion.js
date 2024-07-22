import { createContext, ReactNode, useState } from "react";
import { getEnvStringOrThrow } from "@/utils";
import { ChainInfo } from "@burnt-labs/constants";

type ConnectionType = "stytch" | "graz" | "metamask" | "okx" | "none";

export interface AbstraxionContextProps {
  connectionType: ConnectionType;
  setConnectionType: React.Dispatch<React.SetStateAction<ConnectionType>>;
  abstractAccount: any; // TODO: Properly define interface here
  setAbstractAccount: React.Dispatch<any>;
  abstraxionError: string;
  setAbstraxionError: React.Dispatch<React.SetStateAction<string>>;
  apiUrl: string;
  chainInfo: ChainInfo;
  isMainnet: boolean;
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setAccountNeedsToMigrate: React.Dispatch<React.SetStateAction<boolean>>;
  accountNeedsToMigrate: boolean;
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
  const [isOpen, setIsOpen] = useState(false);

  const [accountNeedsToMigrate, setAccountNeedsToMigrate] = useState(false);

  const serializedChainInfo = getEnvStringOrThrow(
    "NEXT_PUBLIC_DEFAULT_CHAIN_INFO",
    process.env.NEXT_PUBLIC_DEFAULT_CHAIN_INFO,
  );
  const chainInfo = JSON.parse(serializedChainInfo);

  const oldApiUrl = getEnvStringOrThrow(
    "NEXT_PUBLIC_DEFAULT_API_URL",
    process.env.NEXT_PUBLIC_DEFAULT_API_URL,
  );

  const migratedApiUrl = getEnvStringOrThrow(
    "NEXT_PUBLIC_MIGRATED_API_URL",
    process.env.NEXT_PUBLIC_MIGRATED_API_URL,
  );

  const apiUrl = accountNeedsToMigrate ? oldApiUrl : migratedApiUrl;

  const isMainnet =
    getEnvStringOrThrow(
      "NEXT_PUBLIC_DEPLOYMENT_ENV",
      process.env.NEXT_PUBLIC_DEPLOYMENT_ENV,
    ) === "mainnet"
      ? true
      : false;
  return (
    <AbstraxionContext.Provider
      value={{
        accountNeedsToMigrate,
        setAccountNeedsToMigrate,
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
