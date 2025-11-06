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
import { createEthWalletAccount } from "@burnt-labs/abstraxion-core";
import { checkAccountExists } from "@burnt-labs/account-management";
import { AUTHENTICATOR_TYPE } from "@burnt-labs/signers";

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
      const authenticator = signerConfig.authenticator;
      const authenticatorType = signerConfig.authenticatorType;

      // 2. Normalize authenticator identifier (lowercase for addresses)
      const normalizedAuthenticator = authenticatorType === AUTHENTICATOR_TYPE.EthWallet 
        ? authenticator.toLowerCase() 
        : authenticator;

      // 3. Check if account already exists using shared utility
      // Type is always known from signerConfig.authenticatorType
      const accountCheck = await checkAccountExists(
        accountStrategy,
        normalizedAuthenticator,
        authenticatorType,
        '[useSignerAuth]'
      );

      if (accountCheck.exists && accountCheck.smartAccountAddress) {
        // Account exists - restore session
        // Map authenticatorType to connection info type
        const connectionType = authenticatorType === AUTHENTICATOR_TYPE.EthWallet ? 'SignerEth' :
                               authenticatorType === AUTHENTICATOR_TYPE.Passkey ? 'SignerPasskey' :
                               authenticatorType === AUTHENTICATOR_TYPE.JWT ? 'SignerJWT' :
                               'SignerSecp256K1' as const;
        
        const connectionInfo: SignerConnectionInfo = {
          type: connectionType,
          authenticatorType,
          identifier: normalizedAuthenticator,
          authenticatorIndex: accountCheck.authenticatorIndex,
          signMessage: signerConfig.signMessage,
          // Legacy field for backward compatibility (only for EthWallet)
          ...(authenticatorType === AUTHENTICATOR_TYPE.EthWallet && { ethereumAddress: normalizedAuthenticator }),
        };
        setSignerInfo(connectionInfo);
        setSmartAccountAddress(accountCheck.smartAccountAddress);
        setCodeId(accountCheck.codeId || null);

        onSuccess?.(accountCheck.smartAccountAddress, connectionInfo);
        return;
      }

      // 4. Account doesn't exist - create it using shared utility
      // TODO: Support other authenticator types (Passkey, JWT, etc.) in account creation
      // For now, only EthWallet is supported
      if (authenticatorType !== AUTHENTICATOR_TYPE.EthWallet) {
        throw new Error(`Account creation for ${authenticatorType} authenticator type is not yet supported`);
      }

      if (!localConfig) {
        throw new Error('LocalConfig is required for account creation');
      }

      const result = await createEthWalletAccount(
        aaApiUrl,
        normalizedAuthenticator,
        signerConfig.signMessage,
        {
          checksum: localConfig.checksum,
          feeGranter: localConfig.feeGranter,
          addressPrefix: localConfig.addressPrefix,
        },
        '[useSignerAuth]'
      );

      // 5. Store results
      setSmartAccountAddress(result.account_address);
      setCodeId(result.code_id);

      const connectionType = authenticatorType === AUTHENTICATOR_TYPE.EthWallet ? 'SignerEth' :
                           authenticatorType === AUTHENTICATOR_TYPE.Passkey ? 'SignerPasskey' :
                           authenticatorType === AUTHENTICATOR_TYPE.JWT ? 'SignerJWT' :
                           'SignerSecp256K1' as const;

      const connectionInfo: SignerConnectionInfo = {
        type: connectionType,
        authenticatorType,
        identifier: normalizedAuthenticator,
        authenticatorIndex: 0, // New account, first authenticator
        signMessage: signerConfig.signMessage,
        // Legacy field for backward compatibility (only for EthWallet)
        ...(authenticatorType === AUTHENTICATOR_TYPE.EthWallet && { ethereumAddress: normalizedAuthenticator }),
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
