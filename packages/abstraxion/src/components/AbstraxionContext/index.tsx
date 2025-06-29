import type { ReactNode } from "react";
import { createContext, useCallback, useEffect, useState } from "react";
import { testnetChainInfo, xionGasValues } from "@burnt-labs/constants";
import { GasPrice } from "@cosmjs/stargate";
import { SignArbSecp256k1HdWallet } from "@burnt-labs/abstraxion-core";
import { abstraxionAuth } from "../Abstraxion";

export type SpendLimit = { denom: string; amount: string };

export type ContractGrantDescription =
  | string
  | {
      address: string;
      amounts: SpendLimit[];
    };

export interface AbstraxionContextProps {
  isConnected: boolean;
  setIsConnected: React.Dispatch<React.SetStateAction<boolean>>;
  isConnecting: boolean;
  setIsConnecting: React.Dispatch<React.SetStateAction<boolean>>;
  abstraxionError: string;
  setAbstraxionError: React.Dispatch<React.SetStateAction<string>>;
  abstraxionAccount: SignArbSecp256k1HdWallet | undefined;
  setAbstraxionAccount: React.Dispatch<SignArbSecp256k1HdWallet | undefined>;
  granterAddress: string;
  showModal: boolean;
  setShowModal: React.Dispatch<React.SetStateAction<boolean>>;
  setGranterAddress: React.Dispatch<React.SetStateAction<string>>;
  contracts?: ContractGrantDescription[];
  dashboardUrl?: string;
  setDashboardUrl: React.Dispatch<React.SetStateAction<string>>;
  rpcUrl: string;
  stake?: boolean;
  bank?: SpendLimit[];
  treasury?: string;
  gasPrice: GasPrice;
  logout: () => void;
  login: () => Promise<void>;
}

export const AbstraxionContext = createContext<AbstraxionContextProps>(
  {} as AbstraxionContextProps,
);

export function AbstraxionContextProvider({
  children,
  contracts,
  rpcUrl = testnetChainInfo.rpc,
  stake = false,
  bank,
  callbackUrl,
  treasury,
  gasPrice,
}: {
  children: ReactNode;
  contracts?: ContractGrantDescription[];
  dashboardUrl?: string;
  rpcUrl?: string;
  stake?: boolean;
  bank?: SpendLimit[];
  callbackUrl?: string;
  treasury?: string;
  gasPrice?: string;
}): JSX.Element {
  const [abstraxionError, setAbstraxionError] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [abstraxionAccount, setAbstraxionAccount] = useState<
    SignArbSecp256k1HdWallet | undefined
  >(undefined);
  const [granterAddress, setGranterAddress] = useState("");
  const [dashboardUrl, setDashboardUrl] = useState("");
  let gasPriceDefault: GasPrice;
  const { gasPrice: gasPriceConstant } = xionGasValues;
  if (rpcUrl.includes("mainnet")) {
    gasPriceDefault = GasPrice.fromString(gasPriceConstant);
  } else {
    gasPriceDefault = GasPrice.fromString("0.001uxion");
  }

  const configureInstance = useCallback(() => {
    abstraxionAuth.configureAbstraxionInstance(
      rpcUrl,
      contracts,
      stake,
      bank,
      callbackUrl,
      treasury,
    );
  }, [rpcUrl, contracts, stake, bank, callbackUrl, treasury]);

  useEffect(() => {
    configureInstance();
  }, [configureInstance]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("granted") === "true") {
      setShowModal(true);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = abstraxionAuth.subscribeToAuthStateChange(
      async (newState: boolean) => {
        if (newState !== isConnected) {
          setIsConnected(newState);
          if (newState) {
            const account = await abstraxionAuth.getLocalKeypair();
            const granterAddress = await abstraxionAuth.getGranter();
            setAbstraxionAccount(account);
            setGranterAddress(granterAddress);
          }
        }
      },
    );

    return () => {
      unsubscribe?.();
    };
  }, [isConnected, abstraxionAuth]);

  const persistAuthenticateState = useCallback(async () => {
    await abstraxionAuth.authenticate();
  }, [abstraxionAuth]);

  useEffect(() => {
    if (!isConnecting && !abstraxionAccount && !granterAddress) {
      persistAuthenticateState();
    }
  }, [
    isConnecting,
    abstraxionAccount,
    granterAddress,
    persistAuthenticateState,
  ]);

  async function login() {
    try {
      setIsConnecting(true);
      await abstraxionAuth.login();
    } catch (error) {
      console.log(error);
      throw error; // Re-throw to allow handling by the caller
    } finally {
      setIsConnecting(false);
    }
  }

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("granted") === "true") {
      login().catch((error) => {
        console.error("Failed to finish login:", error);
      });
    }
  }, []);

  const logout = useCallback(() => {
    setIsConnected(false);
    setAbstraxionAccount(undefined);
    setGranterAddress("");
    abstraxionAuth?.logout();
  }, [abstraxionAuth]);

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
        setDashboardUrl,
        rpcUrl,
        stake,
        bank,
        treasury,
        login,
        logout,
        gasPrice: gasPrice ? GasPrice.fromString(gasPrice) : gasPriceDefault,
      }}
    >
      {children}
    </AbstraxionContext.Provider>
  );
}
