/**
 * Internal hook for wallet authentication in direct mode
 * Handles in-app wallet connections without dashboard redirect
 *
 * Based on dashboard implementation:
 * - src/hooks/useWalletAccountCreation.ts
 * - src/hooks/useWalletAccountPrepare.ts
 * - src/components/AbstraxionWallets/index.tsx
 *
 * TODO: Add local mode support (build transactions without AA API)
 */

import { useState, useCallback, useMemo } from "react";
import { Buffer } from "buffer";
import { createCompositeAccountStrategy } from "@burnt-labs/account-management";
import type { AccountIndexerConfig } from "@burnt-labs/account-management";
import type {
  AuthenticationConfig,
  WalletDefinition,
} from "../authentication/types";
import type { IndexerConfig, LocalConfig } from "../components/Abstraxion";
import {
  createEthWalletAccount,
  createSecp256k1Account,
} from "@burnt-labs/abstraxion-core";
import { checkAccountExists } from "@burnt-labs/account-management";
import { AUTHENTICATOR_TYPE, type AuthenticatorType } from "@burnt-labs/signers";

/**
 * Wallet type for smart account authenticators
 */
export type WalletType = "EthWallet" | "Secp256K1";

/**
 * Information about a connected browser wallet (direct mode)
 */
export interface WalletConnectionInfo {
  type: WalletType;
  address?: string; // Wallet address (for display)
  pubkey?: string; // Public key hex
  identifier: string; // What gets stored as authenticator
  walletName?: 'keplr' | 'leap' | 'okx' | 'metamask'; // Which wallet was used
  authenticatorIndex?: number; // Index of the authenticator in the smart account
}

/**
 * Information about a connected session signer (signer mode)
 */
export interface SignerConnectionInfo {
  type: 'SignerEth' | 'SignerPasskey' | 'SignerJWT' | 'SignerSecp256K1'; // Type based on authenticatorType
  authenticatorType: AuthenticatorType; // Authenticator type from config
  identifier: string; // Authenticator identifier (address, credential, JWT, etc.)
  authenticatorIndex?: number; // Index of the authenticator in the smart account
  signMessage: (message: string) => Promise<string>; // Signing function
  // Legacy field for backward compatibility (only for EthWallet)
  ethereumAddress?: string; // Deprecated: use identifier instead
}

/**
 * Union type for all connection info types
 */
export type ConnectionInfo = WalletConnectionInfo | SignerConnectionInfo;

/**
 * Gets Ethereum wallet address from MetaMask
 */
async function getEthWalletAddress(): Promise<string> {
  if (!window.ethereum) {
    throw new Error("MetaMask wallet not found. Please install MetaMask and try again.");
  }

  const accounts = (await window.ethereum.request({
    method: "eth_requestAccounts",
  })) as string[];

  if (!accounts || accounts.length === 0) {
    throw new Error("No MetaMask accounts found. Please unlock your wallet and try again.");
  }

  return accounts[0];
}

/**
 * Signs a message with Ethereum wallet (MetaMask)
 */
async function signWithEthWallet(message: string, userAddress: string): Promise<string> {
  if (!window.ethereum) {
    throw new Error("MetaMask wallet not found.");
  }

  const signature = (await window.ethereum.request({
    method: "personal_sign",
    params: [message, userAddress],
  })) as string;

  if (!signature) {
    throw new Error("Failed to get signature from wallet.");
  }

  return signature;
}

export interface WalletAuthState {
  smartAccountAddress: string | null;
  walletAddress: string | null;
  walletInfo: WalletConnectionInfo | null;
  codeId: number | null;
  isConnecting: boolean;
  error: string | null;

  // Generic wallet connection method
  connectWallet: (walletConfig: WalletDefinition, chainId?: string) => Promise<void>;

  // MetaMask connection (called by generic connectWallet for ethereum wallets)
  connectMetaMask: () => Promise<void>;


  disconnect: () => void;
}

interface UseWalletAuthProps {
  authentication?: AuthenticationConfig
  indexer?: IndexerConfig;
  localConfig?: LocalConfig;
  rpcUrl: string;
  onSuccess?: (smartAccountAddress: string, walletInfo: WalletConnectionInfo) => void;
  onError?: (error: string) => void;
}

/**
 * Hook for managing wallet authentication
 */
export function useWalletAuth({
  authentication,
  indexer,
  localConfig,
  rpcUrl,
  onSuccess,
  onError,
}: UseWalletAuthProps): WalletAuthState {
  const [smartAccountAddress, setSmartAccountAddress] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletInfo, setWalletInfo] = useState<WalletConnectionInfo | null>(null);
  const [codeId, setCodeId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get AA API URL from authentication config
  const aaApiUrl = authentication?.type === 'browser' ? authentication.aaApiUrl : undefined;

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
   * Connect MetaMask
   * Matches dashboard's createAccountWithMetaMask
   */
  const connectMetaMask = useCallback(async () => {

    // TODO: Add local mode so that people can push the transactions themselves
    if (!aaApiUrl) {
      throw new Error('AA API URL is required for browser wallet authentication');
    }

    try {
      setIsConnecting(true);
      setError(null);

      // 1. Get Ethereum address
      const ethAddress = await getEthWalletAddress();
      setWalletAddress(ethAddress);

      // 2. Check if account already exists using shared utility
      // We know the type is EthWallet since we're connecting MetaMask
      const accountCheck = await checkAccountExists(
        accountStrategy,
        ethAddress.toLowerCase(),
        AUTHENTICATOR_TYPE.EthWallet,
        '[useWalletAuth]'
      );

      if (accountCheck.exists && accountCheck.smartAccountAddress) {
        // Account exists - set up connection info
        setSmartAccountAddress(accountCheck.smartAccountAddress);
        setCodeId(accountCheck.codeId || null);

        const walletConnectionInfo: WalletConnectionInfo = {
          type: AUTHENTICATOR_TYPE.EthWallet,
          address: ethAddress,
          identifier: ethAddress,
          walletName: 'metamask',
          authenticatorIndex: accountCheck.authenticatorIndex,
        };
        setWalletInfo(walletConnectionInfo);

        onSuccess?.(accountCheck.smartAccountAddress, walletConnectionInfo);
        return;
      }

      // 3. Account doesn't exist - create it using shared utility
      const signFn = async (hexMessage: string) => {
        // signWithEthWallet already handles the signing, but it expects plain text
        // The shared utility will convert to hex, so we need to convert hex back to text
        const plainText = Buffer.from(hexMessage.replace('0x', ''), 'hex').toString('utf8');
        return await signWithEthWallet(plainText, ethAddress);
      };

      if (!localConfig) {
        throw new Error('LocalConfig is required for account creation');
      }

      const result = await createEthWalletAccount(
        aaApiUrl,
        ethAddress,
        signFn,
        {
          checksum: localConfig.checksum,
          feeGranter: localConfig.feeGranter,
          addressPrefix: localConfig.addressPrefix,
        },
        '[useWalletAuth]'
      );

      // 4. Store results
      setSmartAccountAddress(result.account_address);
      setCodeId(result.code_id);

      const walletConnectionInfo: WalletConnectionInfo = {
        type: AUTHENTICATOR_TYPE.EthWallet,
        address: ethAddress,
        identifier: ethAddress,
        walletName: 'metamask',
        authenticatorIndex: 0,
      };
      setWalletInfo(walletConnectionInfo);

      onSuccess?.(result.account_address, walletConnectionInfo);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to connect MetaMask';
      setError(errorMessage);
      onError?.(errorMessage);
      console.error('MetaMask connection error:', err);
    } finally {
      setIsConnecting(false);
    }
  }, [accountStrategy, aaApiUrl, onSuccess, onError]);

  /**
   * Generic wallet connection method
   * Works with any wallet by accessing window object and using appropriate signing method
   */
  const connectWallet = useCallback(async (
    walletConfig: WalletDefinition,
    chainId?: string
  ) => {
    try {
      setIsConnecting(true);
      setError(null);

      // Access wallet from window using windowKey (supports dot notation)
      const keys = walletConfig.windowKey.split('.');
      let wallet: any = window;
      for (const key of keys) {
        wallet = wallet?.[key];
        if (!wallet) {
          throw new Error(`${walletConfig.name} wallet not found. Please install ${walletConfig.name} and try again.`);
        }
      }

      // Handle based on signing method
      if (walletConfig.signingMethod === 'ethereum') {
        // Ethereum wallet (MetaMask, etc.)
        await connectMetaMask();
      } else if (walletConfig.signingMethod === 'cosmos') {
        // Cosmos ecosystem wallets (use secp256k1 signatures)
        if (!chainId) {
          throw new Error('Chain ID required for Cosmos wallets');
        }

        // Get public key using wallet.getKey() method (standard for Cosmos wallets)
        const key = await wallet.getKey(chainId);
        if (!key || !key.pubKey) {
          throw new Error(`Could not get public key from ${walletConfig.name}`);
        }

        // Convert pubkey to hex
        const pubkeyHex = Array.from(key.pubKey as Uint8Array)
          .map((b: number) => b.toString(16).padStart(2, '0'))
          .join('');

        const cosmosWalletAddress = key.bech32Address;
        setWalletAddress(cosmosWalletAddress);

        // Convert hex pubkey to base64 for authenticator identifier
        const pubkeyBase64 = Buffer.from(pubkeyHex, 'hex').toString('base64');

        // Check if account exists
        // We know the type is Secp256K1 since we're connecting a Cosmos wallet
        const accountCheck = await checkAccountExists(
          accountStrategy,
          pubkeyBase64,
          AUTHENTICATOR_TYPE.Secp256K1,
          '[useWalletAuth]'
        );

        if (accountCheck.exists && accountCheck.smartAccountAddress) {
          // Account exists - restore session
          setSmartAccountAddress(accountCheck.smartAccountAddress);
          setCodeId(accountCheck.codeId || null);

          const walletConnectionInfo: WalletConnectionInfo = {
            type: AUTHENTICATOR_TYPE.Secp256K1,
            address: cosmosWalletAddress,
            pubkey: pubkeyHex,
            identifier: pubkeyBase64,
            walletName: walletConfig.name.toLowerCase() as any,
            authenticatorIndex: accountCheck.authenticatorIndex,
          };
          setWalletInfo(walletConnectionInfo);

          onSuccess?.(accountCheck.smartAccountAddress, walletConnectionInfo);
          return;
        }

        // Create new account
        const signFn = async (message: string) => {
          const response = await wallet.signArbitrary(chainId, cosmosWalletAddress, message);
          if (!response || !response.signature) {
            throw new Error(`Failed to get signature from ${walletConfig.name}`);
          }
          // Return signature as base64 string (the util expects this format)
          return typeof response.signature === 'string'
            ? response.signature
            : Buffer.from(response.signature as Uint8Array).toString('base64');
        };

        if (!localConfig) {
          throw new Error('LocalConfig is required for account creation');
        }

        const result = await createSecp256k1Account(
          aaApiUrl!,
          pubkeyHex,
          signFn,
          {
            checksum: localConfig.checksum,
            feeGranter: localConfig.feeGranter,
            addressPrefix: localConfig.addressPrefix,
          },
          '[useWalletAuth]'
        );

        setSmartAccountAddress(result.account_address);
        setCodeId(result.code_id);

        const walletConnectionInfo: WalletConnectionInfo = {
          type: AUTHENTICATOR_TYPE.Secp256K1,
          address: cosmosWalletAddress,
          pubkey: pubkeyHex,
          identifier: pubkeyBase64,
          walletName: walletConfig.name.toLowerCase() as any,
          authenticatorIndex: 0,
        };
        setWalletInfo(walletConnectionInfo);

        onSuccess?.(result.account_address, walletConnectionInfo);
      } else {
        throw new Error(`Unsupported signing method: ${walletConfig.signingMethod}`);
      }
    } catch (err: any) {
      const errorMessage = err.message || `Failed to connect ${walletConfig.name}`;
      setError(errorMessage);
      onError?.(errorMessage);
      console.error(`${walletConfig.name} connection error:`, err);
    } finally {
      setIsConnecting(false);
    }
  }, [connectMetaMask, accountStrategy, aaApiUrl, onSuccess, onError]);

  /**
   * Disconnect wallet
   */
  const disconnect = useCallback(() => {
    setSmartAccountAddress(null);
    setWalletAddress(null);
    setWalletInfo(null);
    setCodeId(null);
    setError(null);
  }, []);

  return {
    smartAccountAddress,
    walletAddress,
    walletInfo,
    codeId,
    isConnecting,
    error,
    connectWallet,
    connectMetaMask,
    disconnect,
  };
}
