import { ReactNode, createContext, useState } from "react";
import { testnetChainInfo } from "@burnt-labs/constants";

export interface AbstraxionContextProps {
  connectionType: "stytch" | "graz" | "none";
  setConnectionType: React.Dispatch<
    React.SetStateAction<"stytch" | "graz" | "none">
  >;
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
  const [connectionType, setConnectionType] = useState<
    "stytch" | "graz" | "none"
  >("none");
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
