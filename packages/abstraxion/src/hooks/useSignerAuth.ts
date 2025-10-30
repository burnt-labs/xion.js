/**
 * Hook for signer mode authentication
 * Handles session signer integration (Turnkey, Privy, Web3Auth, etc.)
 */

import { useState, useCallback, useMemo } from "react";
import { createCompositeAccountStrategy } from "@burnt-labs/account-management";
import type { AccountIndexerConfig } from "@burnt-labs/account-management";
import type { SignerAuthentication } from "../authentication/types";
import type { IndexerConfig, LocalConfig } from "../components/Abstraxion";
import type { SignerConnectionInfo } from "./useWalletAuth";
import {
  checkAccountExists,
  createEthWalletAccount,
} from "../utils/aaApi";

export interface SignerAuthState {
  smartAccountAddress: string | null;
  signerInfo: SignerConnectionInfo | null;
  codeId: number | null;
  isConnecting: boolean;
  error: string | null;

  // Connect using the signer
  connectSigner: () => Promise<void>;

  disconnect: () => void;
}

interface UseSignerAuthProps {
  authentication: SignerAuthentication;
  indexer?: IndexerConfig;
  localConfig?: LocalConfig;
  rpcUrl: string;
  onSuccess?: (smartAccountAddress: string, signerInfo: SignerConnectionInfo) => void;
  onError?: (error: string) => void;
}

/**
 * Hook for managing signer authentication
 */
export function useSignerAuth({
  authentication,
  indexer,
  localConfig,
  rpcUrl,
  onSuccess,
  onError,
}: UseSignerAuthProps): SignerAuthState {
  const [smartAccountAddress, setSmartAccountAddress] = useState<string | null>(null);
  const [signerInfo, setSignerInfo] = useState<SignerConnectionInfo | null>(null);
  const [codeId, setCodeId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const aaApiUrl = authentication.aaApiUrl;

  // Create composite account strategy with proper fallback chain
  const accountStrategy = useMemo(
    () => createCompositeAccountStrategy({
      indexer: indexer ? {
        ...indexer,
        url: indexer.url,
        authToken: indexer.authToken,
      } as AccountIndexerConfig : undefined,
      rpc: localConfig ? {
        rpcUrl,
        checksum: localConfig.checksum,
        creator: localConfig.feeGranter,
        prefix: localConfig.addressPrefix,
        codeId: localConfig.codeId,
      } : undefined,
    }),
    [indexer, localConfig, rpcUrl]
  );

  /**
   * Connect using the session signer
   */
  const connectSigner = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);

      // 1. Get signer config from developer's function
      const signerConfig = await authentication.getSignerConfig();
      const ethereumAddress = signerConfig.ethereumAddress;

      // 2. Use lowercase address as authenticator (consistent with EthWallet)
      const authenticator = ethereumAddress.toLowerCase();

      // 3. Check if account already exists using shared utility
      const accountCheck = await checkAccountExists(
        accountStrategy,
        authenticator,
        '[useSignerAuth]'
      );

      if (accountCheck.exists && accountCheck.smartAccountAddress) {
        // Account exists - restore session
        const connectionInfo: SignerConnectionInfo = {
          type: 'SignerEth',
          ethereumAddress,
          identifier: authenticator,
          authenticatorIndex: accountCheck.authenticatorIndex,
          signMessage: signerConfig.signMessage,
        };
        setSignerInfo(connectionInfo);
        setSmartAccountAddress(accountCheck.smartAccountAddress);
        setCodeId(accountCheck.codeId || null);

        onSuccess?.(accountCheck.smartAccountAddress, connectionInfo);
        return;
      }

      // 4. Account doesn't exist - create it using shared utility
      const result = await createEthWalletAccount(
        aaApiUrl,
        ethereumAddress,
        signerConfig.signMessage,
        '[useSignerAuth]'
      );

      // 5. Store results
      setSmartAccountAddress(result.account_address);
      setCodeId(result.code_id);

      const connectionInfo: SignerConnectionInfo = {
        type: 'SignerEth',
        ethereumAddress,
        identifier: authenticator,
        authenticatorIndex: 0, // New account, first authenticator
        signMessage: signerConfig.signMessage,
      };
      setSignerInfo(connectionInfo);

      onSuccess?.(result.account_address, connectionInfo);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to connect signer';
      setError(errorMessage);
      onError?.(errorMessage);
      console.error('[useSignerAuth] Error:', err);
    } finally {
      setIsConnecting(false);
    }
  }, [authentication, accountStrategy, aaApiUrl, onSuccess, onError]);

  /**
   * Disconnect signer
   */
  const disconnect = useCallback(() => {
    setSmartAccountAddress(null);
    setSignerInfo(null);
    setCodeId(null);
    setError(null);
  }, []);

  return {
    smartAccountAddress,
    signerInfo,
    codeId,
    isConnecting,
    error,
    connectSigner,
    disconnect,
  };
}
