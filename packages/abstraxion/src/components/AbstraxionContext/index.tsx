import type { ReactNode } from "react";
import { createContext, useCallback, useEffect, useState } from "react";
import { SignArbSecp256k1HdWallet } from "@burnt-labs/abstraxion-core";
import { abstraxionAuth } from "../Abstraxion";
import { useWalletAuth, type WalletAuthState } from "../../hooks/useWalletAuth";
import { useGrantsFlow } from "../../hooks/useGrantsFlow";
import type { WalletAuthConfig } from "../Abstraxion";

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
  chainId: string;
  rpcUrl: string;
  restUrl: string;
  gasPrice: string;
  contracts?: ContractGrantDescription[];
  dashboardUrl?: string;
  setDashboardUrl: React.Dispatch<React.SetStateAction<string>>;
  stake?: boolean;
  bank?: SpendLimit[];
  treasury?: string;
  feeGranter?: string;
  indexerUrl?: string;
  logout: () => void;
  login: () => Promise<void>;

  // Wallet authentication state
  walletAuthMode: 'redirect' | 'direct' | 'local';
  walletAuthState: WalletAuthState | null;
}

export const AbstraxionContext = createContext<AbstraxionContextProps>(
  {} as AbstraxionContextProps,
);

export function AbstraxionContextProvider({
  children,
  chainId,
  rpcUrl,
  restUrl,
  gasPrice,
  contracts,
  stake = false,
  bank,
  callbackUrl,
  treasury,
  feeGranter,
  indexerUrl,
  walletAuth,
}: {
  children: ReactNode;
  chainId: string;
  rpcUrl: string;
  restUrl: string;
  gasPrice: string;
  contracts?: ContractGrantDescription[];
  dashboardUrl?: string;
  stake?: boolean;
  bank?: SpendLimit[];
  callbackUrl?: string;
  treasury?: string;
  feeGranter?: string;
  indexerUrl?: string;
  walletAuth?: WalletAuthConfig;
}): JSX.Element {
  // Initialize all loading states as false for consistent hydration, then detect OAuth in useEffect
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true); // Start with true, prevents mounting/hydration flash/issues
  const [isReturningFromAuth, setIsReturningFromAuth] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [abstraxionError, setAbstraxionError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [abstraxionAccount, setAbstraxionAccount] = useState<
    SignArbSecp256k1HdWallet | undefined
  >(undefined);
  const [granterAddress, setGranterAddress] = useState("");
  const [dashboardUrl, setDashboardUrl] = useState("");

  // Determine wallet auth mode
  const walletAuthMode = walletAuth?.mode || 'redirect';

  // Initialize grants flow for direct mode (only when treasury is configured)
  const { isCreatingGrants, createGrants } = useGrantsFlow({
    rpcUrl,
    restUrl,
    gasPrice,
    contracts,
    bank,
    stake,
    treasury,
    feeGranter,
  });

  // Initialize wallet auth hook only for direct/local modes
  const walletAuthState = useWalletAuth({
    config: walletAuth || {},
    rpcUrl,
    onSuccess: async (smartAccountAddress, walletInfo) => {
      // Direct mode connection successful

      // If treasury is configured, create grants
      if (treasury && walletAuthMode === 'direct') {
        try {
          await createGrants(smartAccountAddress, walletInfo, chainId);

          // Set granter address (already stored by createGrants)
          setGranterAddress(smartAccountAddress);

          // Get and set the temp keypair as abstraxionAccount
          const tempKeypair = await abstraxionAuth.getLocalKeypair();
          setAbstraxionAccount(tempKeypair);

          setIsConnected(true);
          setShowModal(false);
        } catch (error) {
          console.error('Failed to create grants:', error);
          setAbstraxionError(`Failed to create grants: ${error instanceof Error ? error.message : 'Unknown error'}`);
          setIsConnecting(false);
        }
      } else {
        // No treasury configured, just set as connected without grants
        setGranterAddress(smartAccountAddress);

        // Store wallet info in localStorage (matching dashboard behavior)
        localStorage.setItem("loginAuthenticator", walletInfo.identifier);

        // Map wallet type to connection type (keplr/leap both use "shuttle")
        const connType = walletInfo.type === 'EthWallet' ? 'metamask' : 'shuttle';
        localStorage.setItem("loginType", connType);

        // Get the OfflineSigner from the connected wallet
        if (walletInfo.type === 'Secp256K1' && walletInfo.walletName) {
          try {
            const wallet = walletInfo.walletName === 'keplr' ? (window as any).keplr :
                          walletInfo.walletName === 'leap' ? (window as any).leap :
                          walletInfo.walletName === 'okx' ? (window as any).okxwallet?.keplr :
                          null;

            if (wallet) {
              const offlineSigner = await wallet.getOfflineSigner(chainId);
              setAbstraxionAccount(offlineSigner as any);
            }
          } catch (error) {
            console.error('Failed to get offline signer:', error);
          }
        }

        setIsConnected(true);
        setShowModal(false);
      }
    },
    onError: (error) => {
      setAbstraxionError(error);
      setIsConnecting(false);
    },
  });

  const configureInstance = useCallback(() => {
    // Only configure abstraxionAuth for redirect mode
    if (walletAuthMode === 'redirect') {
      abstraxionAuth.configureAbstraxionInstance(
        rpcUrl,
        contracts,
        stake,
        bank,
        callbackUrl,
        treasury,
        indexerUrl,
      );
    }
  }, [rpcUrl, contracts, stake, bank, callbackUrl, treasury, indexerUrl, walletAuthMode]);

  useEffect(() => {
    configureInstance();
  }, [configureInstance]);

  // Detect Auth callback after hydration
  useEffect(() => {
    // Only handle granted redirect in redirect mode
    if (walletAuthMode === 'redirect') {
      const searchParams = new URLSearchParams(window.location.search);
      const isAuth = searchParams.get("granted") === "true";

      if (isAuth) {
        setIsReturningFromAuth(true);
        setIsConnecting(true);
        setIsInitializing(false); // We have a first real state so Init not needed anymore
        setShowModal(true);
      }
    }
    // No real state to set yet, so Init stays true if not isAuth
  }, [walletAuthMode]);

  useEffect(() => {
    // Only subscribe to auth state changes in redirect mode
    if (walletAuthMode !== 'redirect') {
      return;
    }

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
  }, [isConnected, abstraxionAuth, walletAuthMode]);

  const persistAuthenticateState = useCallback(async () => {
    // Only authenticate with OAuth in redirect mode
    if (walletAuthMode !== 'redirect') {
      return;
    }

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
  }, [abstraxionAuth, walletAuthMode]);

  // Restore session for redirect mode
  useEffect(() => {
    const initializeAuth = async () => {
      // Only run in redirect mode - IMPORTANT: check walletAuthMode first before other conditions
      if (walletAuthMode !== 'redirect') {
        return;
      }

      // Skip initialization if we're in Auth callback flow
      if (isReturningFromAuth) {
        return;
      }

      if (!isConnecting && !abstraxionAccount && !granterAddress) {
        await persistAuthenticateState();
      }
    };

    initializeAuth();
  }, [
    isReturningFromAuth,
    isConnecting,
    abstraxionAccount,
    granterAddress,
    persistAuthenticateState,
    walletAuthMode,
  ]);

  // Restore session for direct mode on mount
  useEffect(() => {
    // Only run in direct/local modes
    if (walletAuthMode === 'redirect') {
      return;
    }

    // Skip if already connected or connecting
    if (isConnected || isConnecting) {
      return;
    }

    async function restoreDirectModeSession() {
      try {
        // Check if session keypair exists
        const storedKeypair = await abstraxionAuth.getLocalKeypair();
        const storedGranter = localStorage.getItem('xion-authz-granter-account');

        // No session to restore - this is normal on first visit
        if (!storedKeypair || !storedGranter) {
          return;
        }

        // Verify grants still exist on-chain via authenticate
        await abstraxionAuth.authenticate();

        // If we get here, grants are valid
        setAbstraxionAccount(storedKeypair);
        setGranterAddress(storedGranter);
        setIsConnected(true);
      } catch (error) {
        // Session expired or invalid - clear it silently
        localStorage.removeItem('xion-authz-granter-account');
        localStorage.removeItem('xion-authz-temp-account');
        localStorage.removeItem('loginType');
        localStorage.removeItem('loginAuthenticator');
      }
    }

    restoreDirectModeSession();
  }, [walletAuthMode, isConnected, isConnecting, abstraxionAuth]);

  async function login() {
    // User actively logging in, so initialization phase is over
    setIsInitializing(false);

    // Only login state for people actually clicking Login, not Auth callbacks
    if (!isReturningFromAuth) {
      setIsLoggingIn(true);
    }

    try {
      setIsConnecting(true);

      // Check wallet auth mode
      if (walletAuthMode === 'redirect') {
        // Existing OAuth flow via dashboard redirect
        await abstraxionAuth.login();
      } else if (walletAuth?.customSigner) {
        // Custom signer mode (Turnkey, Privy, etc.) - use the custom signer directly
        console.log('[Abstraxion] Using custom signer for login');

        // Call connectWithCustomSigner which will:
        // 1. Get public key from custom signer
        // 2. Call AA API to create smart account
        // 3. Trigger onSuccess callback
        await walletAuthState.connectWithCustomSigner();

        setIsConnecting(false);
      } else {
        // Direct or local mode without custom signer - handle wallet selection based on strategy
        const strategy = walletAuth?.walletSelectionStrategy || 'auto';

        // Default wallets for auto mode (MetaMask + Keplr)
        const defaultWallets: import('../Abstraxion').GenericWalletConfig[] = [
          { name: 'MetaMask', windowKey: 'ethereum', signingMethod: 'ethereum' },
          { name: 'Keplr', windowKey: 'keplr', signingMethod: 'cosmos' },
        ];

        const wallets = walletAuth?.wallets || defaultWallets;

        if (strategy === 'auto') {
          // Auto mode: try wallets in order until one connects
          setIsConnecting(true);
          for (const walletConfig of wallets) {
            try {
              await walletAuthState.connectWallet(walletConfig, chainId);
              // If we get here, connection succeeded
              break;
            } catch (error) {
              // Try next wallet
              continue;
            }
          }
          setIsConnecting(false);
        } else if (strategy === 'custom' && walletAuth?.onWalletSelectionRequired) {
          // Custom mode: call user's callback with connection methods
          walletAuth.onWalletSelectionRequired({
            connectWallet: (walletConfig, chainId) => walletAuthState.connectWallet(walletConfig, chainId),
            isConnecting: walletAuthState.isConnecting,
            error: walletAuthState.error,
          });
          setIsConnecting(false);
        } else {
          // No valid strategy - this should not happen
          setAbstraxionError('No wallet selection strategy configured');
          setIsConnecting(false);
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error; // Re-throw to allow handling by the caller
    } finally {
      // Keep isLoggingIn true until auth state change sets isConnecting (only for manual login)
      if (walletAuthMode === 'redirect') {
        setIsConnecting(false);
      }
    }
  }
  useEffect(() => {
    // Only handle login callback in redirect mode
    if (walletAuthMode === 'redirect') {
      if (isReturningFromAuth) {
        // For Auth callback, we need to complete the login flow
        const completeAuthLogin = async () => {
          try {
            await abstraxionAuth.login();
          } catch (error) {
            // On error, clear the connecting state
            setIsConnecting(false);
          } finally {
            // Always clear auth return state after login attempt
            setIsReturningFromAuth(false);
          }
        };
        completeAuthLogin();
      } else {
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get("granted") === "true") {
          login().catch((error) => {
            console.error("Failed to finish login:", error);
          });
        }
      }
    }
  }, [walletAuthMode, isReturningFromAuth]);

  const logout = useCallback(() => {
    setIsConnected(false);
    setAbstraxionAccount(undefined);
    setGranterAddress("");
    setIsInitializing(false);
    setIsConnecting(false);
    setIsReturningFromAuth(false);

    // Clear wallet auth state if in direct mode
    if (walletAuthMode !== 'redirect') {
      walletAuthState.disconnect();
    }

    abstraxionAuth?.logout();
  }, [abstraxionAuth, walletAuthMode, walletAuthState]);

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
        chainId,
        rpcUrl,
        restUrl,
        gasPrice,
        contracts,
        dashboardUrl,
        setDashboardUrl,
        stake,
        bank,
        treasury,
        feeGranter,
        indexerUrl,
        login,
        logout,
        walletAuthMode,
        walletAuthState,
      }}
    >
      {children}
    </AbstraxionContext.Provider>
  );
}
