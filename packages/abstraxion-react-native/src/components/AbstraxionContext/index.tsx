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
  isInitializing: boolean;
  isReturningFromAuth: boolean;
  isLoggingIn: boolean;
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
  const [isInitializing, setIsInitializing] = useState(true); // Start with true, prevents mounting/hydration flash/issues
  const [isReturningFromAuth, setIsReturningFromAuth] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
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
          if (newState) {
            // Only set connecting state if we don't already have account info
            if (!abstraxionAccount || !granterAddress) {
              setIsConnecting(true);
              const account = await abstraxionAuth.getLocalKeypair();
              const granterAddress = await abstraxionAuth.getGranter();
              setAbstraxionAccount(account);
              setGranterAddress(granterAddress);
              setIsConnected(newState);
              setIsConnecting(false);
            } else {
              setIsConnected(newState);
            }
            // Clear login state regardless of account info
            setIsLoggingIn(false);
          } else {
            setIsConnected(newState);
            setAbstraxionAccount(undefined);
            setGranterAddress("");
            // Ensure to clear any active states
            setIsLoggingIn(false);
            setIsConnecting(false);
          }
        }
      },
    );

    return () => {
      unsubscribe?.();
    };
  }, [isConnected, abstraxionAuth]);

  const persistAuthenticateState = useCallback(async () => {
    // Quick check: if we can immediately determine auth state, do so - lowers load time on refresh (never goes into connecting state/flow)
    const hasLocalKeypair = await abstraxionAuth.getLocalKeypair();
    const hasGranter = await abstraxionAuth.getGranter();

    if (hasLocalKeypair && hasGranter) {
      setAbstraxionAccount(hasLocalKeypair);
      setGranterAddress(hasGranter);
      setIsConnected(true);
      setIsInitializing(false);
      return;
    }

    // Fallback to full authentication if quick check fails
    try {
      await abstraxionAuth.authenticate();
    } finally {
      // Always end initialization after auth check completes, even if authenticate() throws
      setIsInitializing(false);
    }
  }, [abstraxionAuth]);

  useEffect(() => {
    const initializeAuth = async () => {
      // Skip initialization if we're in Auth callback flow
      if (isReturningFromAuth) {
        return;
      }

      if (!isConnecting && !abstraxionAccount && !granterAddress) {
        await persistAuthenticateState();
      }
    };

    initializeAuth();
  }, [isReturningFromAuth]); // Re-run when Auth detection completes

  async function login() {
    // User actively logging in, so initialization phase is over
    setIsInitializing(false);

    // Only login state for people actually clicking Login, not Auth callbacks
    if (!isReturningFromAuth) {
      setIsLoggingIn(true);
    }

    try {
      await abstraxionAuth.login();
    } catch (error) {
      throw error; // Re-throw to allow handling by the caller
    } finally {
      // Keep isLoggingIn true until auth state change sets isConnecting (only for manual login)
    }
  }

  const logout = useCallback(() => {
    setIsConnected(false);
    setAbstraxionAccount(undefined);
    setGranterAddress("");
    setIsInitializing(false);
    setIsConnecting(false);
    setIsReturningFromAuth(false);
    abstraxionAuth?.logout();
  }, [abstraxionAuth]);

  return (
    <AbstraxionContext.Provider
      value={{
        isConnected,
        setIsConnected,
        isConnecting,
        setIsConnecting,
        isInitializing,
        isReturningFromAuth,
        isLoggingIn,
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
        indexerUrl,
        login,
        logout,
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
