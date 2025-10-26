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

import { useState, useCallback } from "react";
import { Buffer } from "buffer";
import {
  NumiaAccountStrategy,
  EmptyAccountStrategy,
  CompositeAccountStrategy,
  RpcAccountStrategy,
  type Authenticator,
} from "@burnt-labs/account-management";
import type { WalletAuthConfig } from "../components/Abstraxion";

/**
 * Wallet type for smart account authenticators
 */
export type WalletType = "EthWallet" | "Secp256K1";

/**
 * Information about a connected wallet
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
  connectWallet: (walletConfig: import('../components/Abstraxion').GenericWalletConfig, chainId?: string) => Promise<void>;

  // MetaMask connection (called by generic connectWallet for ethereum wallets)
  connectMetaMask: () => Promise<void>;

  // Custom signer method (Turnkey, Privy, etc.)
  connectWithCustomSigner: () => Promise<void>;

  disconnect: () => void;
}

interface UseWalletAuthProps {
  config: WalletAuthConfig;
  rpcUrl: string;
  onSuccess?: (smartAccountAddress: string, walletInfo: WalletConnectionInfo) => void;
  onError?: (error: string) => void;
}

/**
 * Hook for managing wallet authentication
 */
export function useWalletAuth({
  config,
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

  // Default to testnet AA API URL (matching dashboard .env.testnet)
  const aaApiUrl = config.aaApiUrl;

  // Initialize composite account query strategy with proper fallback chain:
  // 1. Try Numia indexer API (fast, requires indexer to be available)
  // 2. Fallback to direct RPC query (slower but reliable, only needs RPC endpoint)
  // 3. Final fallback to empty (creates new account)
  const strategies = [];

  // Add indexer strategy if configured
  if (config.indexer) {
    console.log('[useWalletAuth] Using Numia indexer strategy:', config.indexer.url);
    strategies.push(new NumiaAccountStrategy(config.indexer.url, config.indexer.authToken));
  }

  // Add RPC strategy if config is available (recommended for production)
  if (config.localConfig) {
    console.log('[useWalletAuth] Using RPC fallback strategy with checksum:', config.localConfig.checksum.slice(0, 10) + '...');
    strategies.push(new RpcAccountStrategy({
      rpcUrl,
      checksum: config.localConfig.checksum,
      creator: config.localConfig.feeGranter,
      prefix: config.localConfig.addressPrefix,
      codeId: config.localConfig.codeId,
    }));
  }

  // Always add empty strategy as final fallback
  strategies.push(new EmptyAccountStrategy());

  const accountStrategy = new CompositeAccountStrategy(...strategies);

  /**
   * Check if account exists by querying the indexer
   * The authenticator is the identifier (base64 pubkey for Secp256k1, eth address for EthWallet)
   */
  const checkAccountExistsByAuthenticator = useCallback(async (
    authenticator: string,
  ): Promise<{ exists: boolean; accounts: any[] }> => {
    try {
      const accounts = await accountStrategy.fetchSmartAccounts(authenticator);

      return {
        exists: accounts.length > 0,
        accounts,
      };
    } catch (error) {
      console.warn('Error checking account exists:', error);
      return {
        exists: false,
        accounts: [],
      };
    }
  }, [accountStrategy]);

  /**
   * Call AA API /prepare endpoint
   * Matches dashboard's useWalletAccountPrepare.ts
   */
  const callPrepare = useCallback(async (
    request: { wallet_type: 'EthWallet' | 'Secp256K1'; address?: string; pubkey?: string }
  ): Promise<{ message_to_sign: string; salt: string; metadata: any }> => {
    const response = await fetch(`${aaApiUrl}/api/v1/wallet-accounts/prepare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to prepare signature');
    }

    return await response.json();
  }, [aaApiUrl]);

  /**
   * Call AA API /create endpoint
   * Matches dashboard's createWalletAccount function
   */
  const createWalletAccount = useCallback(async (
    request: {
      wallet_type: 'EthWallet' | 'Secp256K1';
      address?: string;
      pubkey?: string;
      signature: string;
      salt: string;
      message: string;
    }
  ): Promise<{ account_address: string; code_id: number; transaction_hash: string }> => {
    const response = await fetch(`${aaApiUrl}/api/v1/wallet-accounts/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to create account');
    }

    return await response.json();
  }, [aaApiUrl]);

  /**
   * Connect MetaMask
   * Matches dashboard's createAccountWithMetaMask
   */
  const connectMetaMask = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);

      // 1. Get Ethereum address
      const ethAddress = await getEthWalletAddress();
      setWalletAddress(ethAddress);

      // 2. Check if account already exists (authenticator is eth address for EthWallet)
      console.log(`[useWalletAuth] Checking if account exists for authenticator: ${ethAddress}`);
      const { exists, accounts } = await checkAccountExistsByAuthenticator(ethAddress);

      if (exists && accounts.length > 0) {
        // Account already exists, use the first one
        console.log(`[useWalletAuth] ✅ Found existing account on-chain: ${accounts[0].id}`);
        console.log(`[useWalletAuth] Account details:`, {
          smartAccount: accounts[0].id,
          codeId: accounts[0].codeId,
          authenticators: accounts[0].authenticators.length
        });
        const existingAccount = accounts[0];
        setSmartAccountAddress(existingAccount.id);
        setCodeId(existingAccount.codeId);

        // Find the authenticator that matches the current wallet (EthWallet uses address as identifier)
        const matchingAuthenticator = existingAccount.authenticators.find(
          (auth: Authenticator) => auth.authenticator.toLowerCase() === ethAddress.toLowerCase()
        );

        const authenticatorIndex = matchingAuthenticator?.authenticatorIndex ?? 0;

        const walletConnectionInfo: WalletConnectionInfo = {
          type: 'EthWallet',
          address: ethAddress,
          identifier: ethAddress,
          walletName: 'metamask',
          authenticatorIndex,
        };
        setWalletInfo(walletConnectionInfo);

        onSuccess?.(existingAccount.id, walletConnectionInfo);
        return;
      }

      // 3. Account doesn't exist, create it
      console.log(`[useWalletAuth] 🆕 No existing account found, creating new account via AA API`);

      // Call backend prepare endpoint
      console.log(`[useWalletAuth] → Calling AA API /prepare endpoint`);
      const { message_to_sign, salt, metadata } = await callPrepare({
        wallet_type: 'EthWallet',
        address: ethAddress,
      });

      // 4. Get user signature
      console.log(`[useWalletAuth] → Requesting signature from wallet`);
      const signature = await signWithEthWallet(message_to_sign, ethAddress);

      // 5. Create account
      console.log(`[useWalletAuth] → Calling AA API /create endpoint`);
      const result = await createWalletAccount({
        wallet_type: 'EthWallet',
        address: ethAddress,
        signature,
        salt,
        message: JSON.stringify(metadata),
      });

      console.log(`[useWalletAuth] ✅ Successfully created new account: ${result.account_address}`);

      // 6. Store results
      setSmartAccountAddress(result.account_address);
      setCodeId(result.code_id);

      const walletConnectionInfo: WalletConnectionInfo = {
        type: 'EthWallet',
        address: ethAddress,
        identifier: ethAddress,
        walletName: 'metamask',
        authenticatorIndex: 0, // New account, first authenticator is always 0
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
  }, [checkAccountExistsByAuthenticator, callPrepare, createWalletAccount, onSuccess, onError]);

  const connectWithCustomSigner = useCallback(async () => {
    if (!config.customSigner) {
      throw new Error('Custom signer not configured');
    }

    try {
      setIsConnecting(true);
      setError(null);

      const signer = config.customSigner;

      // Get credential based on signer type
      const credential = signer.type === 'EthWallet'
        ? await signer.getAddress?.()
        : await signer.getPubkey?.();

      if (!credential) {
        throw new Error('Failed to get credential from custom signer');
      }

      // Call prepare endpoint
      const prepareRequest = signer.type === 'EthWallet'
        ? { wallet_type: 'EthWallet' as const, address: credential }
        : { wallet_type: 'Secp256K1' as const, pubkey: credential };

      const { message_to_sign, salt, metadata } = await callPrepare(prepareRequest);

      // Sign with custom signer
      const signature = await signer.sign(message_to_sign);

      // Create account
      const createRequest = signer.type === 'EthWallet'
        ? {
            wallet_type: 'EthWallet' as const,
            address: credential,
            signature,
            salt,
            message: JSON.stringify(metadata),
          }
        : {
            wallet_type: 'Secp256K1' as const,
            pubkey: credential,
            signature,
            salt,
            message: JSON.stringify(metadata),
          };

      const result = await createWalletAccount(createRequest);

      // Store results
      setSmartAccountAddress(result.account_address);
      setCodeId(result.code_id);
      setWalletAddress(credential);

      const walletConnectionInfo: WalletConnectionInfo = {
        type: signer.type,
        address: credential,
        identifier: credential,
        ...(signer.type === 'Secp256K1' && { pubkey: credential }),
      };
      setWalletInfo(walletConnectionInfo);

      onSuccess?.(result.account_address, walletConnectionInfo);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to connect custom signer';
      setError(errorMessage);
      onError?.(errorMessage);
      console.error('Custom signer connection error:', err);
    } finally {
      setIsConnecting(false);
    }
  }, [config.customSigner, callPrepare, createWalletAccount, onSuccess, onError]);

  /**
   * Generic wallet connection method
   * Works with any wallet by accessing window object and using appropriate signing method
   */
  const connectWallet = useCallback(async (
    walletConfig: import('../components/Abstraxion').GenericWalletConfig,
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
        console.log(`[useWalletAuth] Checking if account exists for authenticator (pubkey base64): ${pubkeyBase64.substring(0, 20)}...`);
        const { exists, accounts } = await checkAccountExistsByAuthenticator(pubkeyBase64);

        if (exists && accounts.length > 0) {
          // Account exists
          console.log(`[useWalletAuth] ✅ Found existing account on-chain: ${accounts[0].id}`);
          console.log(`[useWalletAuth] Account details:`, {
            smartAccount: accounts[0].id,
            codeId: accounts[0].codeId,
            authenticators: accounts[0].authenticators.length
          });
          const existingAccount = accounts[0];
          setSmartAccountAddress(existingAccount.id);
          setCodeId(existingAccount.codeId);

          const matchingAuthenticator = existingAccount.authenticators.find(
            (auth: Authenticator) => auth.authenticator === pubkeyBase64
          );

          const authenticatorIndex = matchingAuthenticator?.authenticatorIndex ?? 0;

          const walletConnectionInfo: WalletConnectionInfo = {
            type: 'Secp256K1',
            address: cosmosWalletAddress,
            pubkey: pubkeyHex,
            identifier: pubkeyBase64,
            walletName: walletConfig.name.toLowerCase() as any, // Store wallet name for display
            authenticatorIndex,
          };
          setWalletInfo(walletConnectionInfo);

          onSuccess?.(existingAccount.id, walletConnectionInfo);
          return;
        }

        // Create new account
        console.log(`[useWalletAuth] 🆕 No existing account found, creating new account via AA API`);

        console.log(`[useWalletAuth] → Calling AA API /prepare endpoint`);
        const { message_to_sign, salt, metadata } = await callPrepare({
          wallet_type: 'Secp256K1',
          pubkey: pubkeyHex,
        });

        // Sign with wallet
        console.log(`[useWalletAuth] → Requesting signature from ${walletConfig.name} wallet`);
        const response = await wallet.signArbitrary(chainId, cosmosWalletAddress, message_to_sign);
        if (!response || !response.signature) {
          throw new Error(`Failed to get signature from ${walletConfig.name}`);
        }

        const signatureBase64 = typeof response.signature === 'string'
          ? response.signature
          : Buffer.from(response.signature as Uint8Array).toString('base64');

        const signatureBytes = Buffer.from(signatureBase64, 'base64');
        const signatureHex = signatureBytes.toString('hex');

        console.log(`[useWalletAuth] → Calling AA API /create endpoint`);
        const result = await createWalletAccount({
          wallet_type: 'Secp256K1',
          pubkey: pubkeyHex,
          signature: signatureHex,
          salt,
          message: JSON.stringify(metadata),
        });

        console.log(`[useWalletAuth] ✅ Successfully created new account: ${result.account_address}`);

        setSmartAccountAddress(result.account_address);
        setCodeId(result.code_id);

        const walletConnectionInfo: WalletConnectionInfo = {
          type: 'Secp256K1',
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
  }, [connectMetaMask, checkAccountExistsByAuthenticator, callPrepare, createWalletAccount, onSuccess, onError]);

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
    connectWithCustomSigner,
    disconnect,
  };
}
