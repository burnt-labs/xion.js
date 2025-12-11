import { useContext } from "react";
import { AbstraxionContext } from "@/src/components/AbstraxionContext";

export interface AbstraxionAccount {
  bech32Address: string;
}

export interface AbstraxionAccountState {
  data: AbstraxionAccount;
  isConnected: boolean;
  isConnecting: boolean;
  isInitializing: boolean;
  isLoading: boolean;
  isReturningFromAuth: boolean;
  isLoggingIn: boolean;
  isError: boolean;
  error: string;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAbstraxionAccount = (): AbstraxionAccountState => {
  const {
    granterAddress,
    isConnected,
    isConnecting,
    isInitializing,
    isReturningFromAuth,
    isLoggingIn,
    abstraxionError,
    login,
    logout,
  } = useContext(AbstraxionContext);

  // isLoading is true if the account is initializing, connecting, or in transition state (isConnecting is true when the user is in login or in callback)
  const isLoading = isInitializing || isConnecting;

  // isError is true when there's an error message
  const isError = !!abstraxionError;

  return {
    data: {
      bech32Address: granterAddress,
    },
    login,
    logout,
    isConnected: isConnected,
    isLoading,
    isInitializing,
    isLoggingIn,
    isConnecting,
    isReturningFromAuth,
    isError,
    error: abstraxionError,
  };
};
