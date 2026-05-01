import { useState, useEffect, useCallback } from "react";
import {
  AUTHENTICATOR_TYPE,
  type SignerConfig,
} from "@burnt-labs/abstraxion-react";

export enum MetamaskAuthState {
  Unauthenticated = "Unauthenticated",
  Authenticating = "Authenticating",
  Authenticated = "Authenticated",
  Error = "Error",
}

export interface UseMetamaskReturn {
  getSignerConfig: () => Promise<SignerConfig>;
  isReady: boolean;
  ethereumAddress: string | undefined;
  authState: MetamaskAuthState;
  connect: () => Promise<void>;
  disconnect: () => void;
  error: string | undefined;
}

/**
 * Provides a `getSignerConfig` for Abstraxion signer mode, backed by an
 * injected MetaMask provider via `personal_sign` (EIP-191).
 *
 * Mirrors `useTurnkeyViem` in shape — both return a `getSignerConfig` you
 * pass to `AbstraxionConfig.authentication.getSignerConfig`. Each call to
 * the returned `signMessage` triggers a MetaMask popup, so `requireAuth`
 * direct signing in this mode does prompt the user (unlike Turnkey, which
 * signs silently).
 */
export function useMetamask(): UseMetamaskReturn {
  const [authState, setAuthState] = useState<MetamaskAuthState>(
    MetamaskAuthState.Unauthenticated,
  );
  const [ethereumAddress, setEthereumAddress] = useState<string | undefined>(
    undefined,
  );
  const [error, setError] = useState<string | undefined>(undefined);

  const isMetaMaskAvailable =
    typeof window !== "undefined" &&
    !!(window as any).ethereum &&
    !!((window as any).ethereum as any).isMetaMask;

  useEffect(() => {
    if (!isMetaMaskAvailable) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setAuthState(MetamaskAuthState.Unauthenticated);
        setEthereumAddress(undefined);
        setError(undefined);
      } else {
        setEthereumAddress(accounts[0].toLowerCase());
        setAuthState(MetamaskAuthState.Authenticated);
      }
    };

    const ethereum = (window as any).ethereum;
    ethereum?.on?.("accountsChanged", handleAccountsChanged);

    return () => {
      ethereum?.removeListener?.("accountsChanged", handleAccountsChanged);
    };
  }, [isMetaMaskAvailable]);

  useEffect(() => {
    if (!isMetaMaskAvailable) return;

    const checkConnection = async () => {
      try {
        const accounts = (await (window as any).ethereum.request({
          method: "eth_accounts",
        })) as string[];

        if (accounts.length > 0) {
          setEthereumAddress(accounts[0].toLowerCase());
          setAuthState(MetamaskAuthState.Authenticated);
        }
      } catch (err) {
        console.error("Failed to check MetaMask connection:", err);
      }
    };

    checkConnection();
  }, [isMetaMaskAvailable]);

  const connect = useCallback(async () => {
    if (!isMetaMaskAvailable) {
      setError("MetaMask not installed. Please install the MetaMask extension.");
      setAuthState(MetamaskAuthState.Error);
      throw new Error("MetaMask not installed");
    }

    setAuthState(MetamaskAuthState.Authenticating);
    setError(undefined);

    try {
      const accounts = (await (window as any).ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found in MetaMask");
      }

      setEthereumAddress(accounts[0].toLowerCase());
      setAuthState(MetamaskAuthState.Authenticated);
    } catch (err: any) {
      const message =
        err.code === 4001
          ? "Connection rejected by user"
          : err.message || "Failed to connect to MetaMask";
      setError(message);
      setAuthState(MetamaskAuthState.Error);
      throw err;
    }
  }, [isMetaMaskAvailable]);

  const disconnect = useCallback(() => {
    setAuthState(MetamaskAuthState.Unauthenticated);
    setEthereumAddress(undefined);
    setError(undefined);
  }, []);

  const getSignerConfig = useCallback(async (): Promise<SignerConfig> => {
    if (!isMetaMaskAvailable) {
      throw new Error("MetaMask not installed");
    }
    if (authState !== MetamaskAuthState.Authenticated || !ethereumAddress) {
      throw new Error("MetaMask not connected. Please connect first.");
    }

    return {
      authenticatorType: AUTHENTICATOR_TYPE.EthWallet,
      authenticator: ethereumAddress,
      signMessage: async (hexMessage: string) => {
        if (!hexMessage.startsWith("0x")) {
          throw new Error(
            `Invalid message format: expected 0x-prefixed hex, got ${hexMessage.slice(0, 24)}…`,
          );
        }
        const ethereum = (window as any).ethereum;
        if (!ethereum) throw new Error("MetaMask not available");

        const signature = (await ethereum.request({
          method: "personal_sign",
          params: [hexMessage, ethereumAddress],
        })) as string;
        if (!signature) throw new Error("Failed to get signature from MetaMask");
        return signature.startsWith("0x") ? signature : `0x${signature}`;
      },
    };
  }, [isMetaMaskAvailable, authState, ethereumAddress]);

  return {
    getSignerConfig,
    isReady: authState === MetamaskAuthState.Authenticated,
    ethereumAddress,
    authState,
    connect,
    disconnect,
    error,
  };
}
