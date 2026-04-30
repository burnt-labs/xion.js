/**
 * MetaMask integration hook for Abstraxion
 * Provides SignerConfig for abstraxion using MetaMask's personal_sign
 */

import { useState, useEffect, useCallback } from "react";
import type { SignerConfig } from "@burnt-labs/abstraxion-react";
import { AUTHENTICATOR_TYPE } from "@burnt-labs/abstraxion-react";

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
 * Hook for integrating MetaMask with Abstraxion
 * Provides the same interface as useTurnkeyViem but uses MetaMask
 */
export function useMetamask(): UseMetamaskReturn {
  const [authState, setAuthState] = useState<MetamaskAuthState>(
    MetamaskAuthState.Unauthenticated,
  );
  const [ethereumAddress, setEthereumAddress] = useState<string | undefined>(
    undefined,
  );
  const [error, setError] = useState<string | undefined>(undefined);

  // Check if MetaMask is available
  const isMetaMaskAvailable =
    typeof window !== "undefined" &&
    !!window.ethereum &&
    !!(window.ethereum as any).isMetaMask;

  // Handle account changes
  useEffect(() => {
    if (!isMetaMaskAvailable) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // User disconnected
        setAuthState(MetamaskAuthState.Unauthenticated);
        setEthereumAddress(undefined);
        setError(undefined);
      } else {
        // Account changed
        setEthereumAddress(accounts[0].toLowerCase());
        setAuthState(MetamaskAuthState.Authenticated);
      }
    };

    window.ethereum?.on?.("accountsChanged", handleAccountsChanged);

    return () => {
      window.ethereum?.removeListener?.(
        "accountsChanged",
        handleAccountsChanged,
      );
    };
  }, [isMetaMaskAvailable]);

  // Check for existing connection on mount
  useEffect(() => {
    if (!isMetaMaskAvailable) return;

    const checkConnection = async () => {
      try {
        const accounts = (await window.ethereum!.request({
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

  // Connect to MetaMask
  const connect = useCallback(async () => {
    if (!isMetaMaskAvailable) {
      setError("MetaMask not installed. Please install MetaMask extension.");
      setAuthState(MetamaskAuthState.Error);
      throw new Error("MetaMask not installed");
    }

    setAuthState(MetamaskAuthState.Authenticating);
    setError(undefined);

    try {
      const accounts = (await window.ethereum!.request({
        method: "eth_requestAccounts",
      })) as string[];

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found in MetaMask");
      }

      const address = accounts[0].toLowerCase();
      setEthereumAddress(address);
      setAuthState(MetamaskAuthState.Authenticated);
    } catch (err: any) {
      console.error("Failed to connect to MetaMask:", err);
      const errorMessage =
        err.code === 4001
          ? "Connection rejected by user"
          : err.message || "Failed to connect to MetaMask";
      setError(errorMessage);
      setAuthState(MetamaskAuthState.Error);
      throw err;
    }
  }, [isMetaMaskAvailable]);

  // Disconnect
  const disconnect = useCallback(() => {
    setAuthState(MetamaskAuthState.Unauthenticated);
    setEthereumAddress(undefined);
    setError(undefined);
  }, []);

  // Get signer config for Abstraxion
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
      // signMessage expects hex-encoded messages with 0x prefix
      // For account creation: hex-encoded UTF-8 bytes of bech32 address
      // For transactions: hex-encoded transaction bytes
      signMessage: async (hexMessage: string) => {
        if (!hexMessage.startsWith("0x")) {
          throw new Error(
            `Invalid message format: expected hex string with 0x prefix, got: ${hexMessage.substring(0, 50)}...`,
          );
        }

        if (!window.ethereum) {
          throw new Error("MetaMask not available");
        }

        // Use personal_sign (EIP-191)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const signature = (await (window.ethereum as any).request({
          method: "personal_sign",
          params: [hexMessage, ethereumAddress],
        })) as string;

        if (!signature) {
          throw new Error("Failed to get signature from MetaMask");
        }

        // Ensure signature is properly formatted (0x-prefixed)
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
