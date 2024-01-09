import { ReactNode, createContext, useState } from "react";

export interface AbstraxionContextProps {
  isConnected: boolean;
  isConnecting: boolean;
  setIsConnecting: React.Dispatch<React.SetStateAction<boolean>>;
  setIsConnected: React.Dispatch<React.SetStateAction<boolean>>;
  connectionType: "stytch" | "graz" | "none";
  setConnectionType: React.Dispatch<
    React.SetStateAction<"stytch" | "graz" | "none">
  >;
  abstractAccount: any; // TODO: Properly define interface here
  setAbstractAccount: React.Dispatch<any>;
  abstraxionError: string;
  setAbstraxionError: React.Dispatch<React.SetStateAction<string>>;
}

export const AbstraxionContext = createContext<AbstraxionContextProps>(
  {} as AbstraxionContextProps,
);

export const AbstraxionContextProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [connectionType, setConnectionType] = useState<
    "stytch" | "graz" | "none"
  >("none");
  const [abstractAccount, setAbstractAccount] = useState<any | undefined>(
    undefined,
  );
  const [abstraxionError, setAbstraxionError] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  return (
    <AbstraxionContext.Provider
      value={{
        isConnected,
        setIsConnected,
        isConnecting,
        setIsConnecting,
        connectionType,
        setConnectionType,
        abstractAccount,
        setAbstractAccount,
        abstraxionError,
        setAbstraxionError,
      }}
    >
      {children}
    </AbstraxionContext.Provider>
  );
};
