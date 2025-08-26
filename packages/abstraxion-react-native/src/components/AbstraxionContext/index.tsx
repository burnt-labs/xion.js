import { createContext, useCallback, useEffect, useState } from "react";
import { testnetChainInfo, xionGasValues } from "@burnt-labs/constants";
import { GasPrice } from "@cosmjs/stargate";
import {
  AbstraxionAuth,
  SignArbSecp256k1HdWallet,
} from "@burnt-labs/abstraxion-core";
import {
  ReactNativeRedirectStrategy,
  ReactNativeStorageStrategy,
} from "../../strategies";

export const abstraxionAuth = new AbstraxionAuth(
  new ReactNativeStorageStrategy(),
  new ReactNativeRedirectStrategy(),
);

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
  setGranterAddress: React.Dispatch<React.SetStateAction<string>>;
  contracts?: ContractGrantDescription[];
  dashboardUrl?: string;
  setDashboardUrl: React.Dispatch<React.SetStateAction<string>>;
  rpcUrl: string;
  stake?: boolean;
  bank?: SpendLimit[];
  treasury?: string;
  indexerUrl?: string;
  gasPrice: GasPrice;
  logout: () => void;
  login: () => Promise<void>;
}

export interface AbstraxionConfig {
  contracts?: ContractGrantDescription[];
  rpcUrl?: string;
  stake?: boolean;
  bank?: SpendLimit[];
  callbackUrl?: string;
  treasury?: string;
  indexerUrl?: string;
  gasPrice?: string;
}

export function AbstraxionProvider({
  children,
  config: {
    contracts,
    rpcUrl = testnetChainInfo.rpc,
    stake = false,
    bank,
    callbackUrl,
    treasury,
    indexerUrl,
    gasPrice,
  },
}: {
  children: React.ReactNode;
  config: AbstraxionConfig;
}): JSX.Element {
  const [abstraxionError, setAbstraxionError] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
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
      indexerUrl,
    );
  }, [rpcUrl, contracts, stake, bank, callbackUrl, treasury, indexerUrl]);

  useEffect(() => {
    configureInstance();
  }, [configureInstance]);

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
        setGranterAddress,
        contracts,
        dashboardUrl,
        setDashboardUrl,
        rpcUrl,
        stake,
        bank,
        treasury,
        indexerUrl,
        logout,
        login,
        gasPrice: gasPrice ? GasPrice.fromString(gasPrice) : gasPriceDefault,
      }}
    >
      {children}
    </AbstraxionContext.Provider>
  );
}

export const AbstraxionContext = createContext<AbstraxionContextProps>(
  {} as AbstraxionContextProps,
);
