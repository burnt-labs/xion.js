import type { ReactNode } from "react";
import { createContext, useCallback, useEffect, useState } from "react";
import { SignArbSecp256k1HdWallet } from "@burnt-labs/abstraxion-core";
// Removed Dialog dependency - UI rendering is now handled by consuming apps
import { abstraxionAuth } from "../Abstraxion";
import { useWalletAuth, type WalletAuthState } from "../../hooks/useWalletAuth";
import { useSignerAuth, type SignerAuthState } from "../../hooks/useSignerAuth";
import { useGrantsFlow } from "../../hooks/useGrantsFlow";
import type {
  AuthenticationConfig,
  SignerAuthentication,
} from "../../authentication/types";
import { BUILT_IN_WALLETS } from "../../authentication/wallets";
import type { IndexerConfig, LocalConfig, TreasuryIndexerConfig } from "../Abstraxion";

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
  logout: () => Promise<void>;
  login: () => Promise<void>;

  // Authentication mode
  authMode: "browser" | "signer" | "redirect";
  walletAuthState: WalletAuthState | null;
  signerAuthState: SignerAuthState | null;

  // Wallet selection state for browser mode (apps should render their own UI)
  showWalletSelectionModal: boolean;
  setShowWalletSelectionModal: React.Dispatch<React.SetStateAction<boolean>>;
  walletSelectionError: string | null;
  setWalletSelectionError: React.Dispatch<React.SetStateAction<string | null>>;
  handleWalletConnect: (walletId: string) => Promise<void>;
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
  treasury,
  feeGranter,
  authentication,
  indexer,
  treasuryIndexer,
  localConfig,
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
  treasury?: string;
  feeGranter?: string;
  authentication?: AuthenticationConfig;
  indexer?: IndexerConfig;
  treasuryIndexer?: TreasuryIndexerConfig;
  localConfig?: LocalConfig;
}): JSX.Element {
  // Initialize all loading states as false for consistent hydration, then detect OAuth in useEffect
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true); // Start with true, prevents mounting/hydration flash/issues

  // Log isConnecting state changes for debugging
  useEffect(() => {
    console.log(`[AbstraxionContext] 🔄 isConnecting changed to: ${isConnecting}`);
  }, [isConnecting]);
  const [isReturningFromAuth, setIsReturningFromAuth] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [abstraxionError, setAbstraxionError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [abstraxionAccount, setAbstraxionAccount] = useState<
    SignArbSecp256k1HdWallet | undefined
  >(undefined);
  const [granterAddress, setGranterAddress] = useState("");
  const [dashboardUrl, setDashboardUrl] = useState("");

  // Wallet selection modal state (for renderWalletSelection)
  const [showWalletSelectionModal, setShowWalletSelectionModal] = useState(false);
  const [walletSelectionError, setWalletSelectionError] = useState<string | null>(null);

  // Determine authentication mode from config
  type authModeType = 'redirect' | 'browser' | 'signer';
  const authMode: authModeType = authentication?.type || 'redirect';

  // Initialize grants flow for direct mode (only when treasury is configured)
  const { createGrants } = useGrantsFlow({
    rpcUrl,
    restUrl,
    gasPrice,
    contracts,
    bank,
    stake,
    treasury,
    feeGranter,
    daodaoIndexerUrl: treasuryIndexer?.url,
  });

  // Initialize wallet auth hook only for signer/browser modes
  const walletAuthState = authMode === 'browser' ? useWalletAuth({
    authentication,
    indexer,
    localConfig,
    rpcUrl,
    onSuccess: async (smartAccountAddress, walletInfo) => {
      // Wallet connection successful

      // If treasury is configured, check/create grants for both signer and browser modes
      if (treasury && (authMode === 'browser')) {
        try {
          // Check if grants already exist in localStorage
          console.log('[AbstraxionContext] Checking if grants exist for smart account...');
          console.log('[AbstraxionContext] → Smart account address:', smartAccountAddress);

          const storedGranter = localStorage.getItem('xion-authz-granter-account');
          const storedTempAccount = localStorage.getItem('xion-authz-temp-account');

          console.log('[AbstraxionContext] → Stored granter address:', storedGranter || 'NONE');
          console.log('[AbstraxionContext] → Stored temp account exists:', !!storedTempAccount);

          // Try to extract grantee address from session key if it exists
          if (storedTempAccount) {
            try {
              const tempAccountData = JSON.parse(storedTempAccount);
              console.log('[AbstraxionContext] → Session key (grantee) address:', tempAccountData.bech32Address || 'NOT_FOUND');
              console.log('[AbstraxionContext] → Session key algo:', tempAccountData.algo || 'NOT_FOUND');
            } catch (e) {
              console.log('[AbstraxionContext] → Could not parse temp account data');
            }
          }

          let grantsExist = false;
          if (storedGranter === smartAccountAddress && storedTempAccount) {
            // Grants exist in localStorage for this smart account
            grantsExist = true;
            console.log('[AbstraxionContext] ✅ Grants already exist in localStorage - addresses match!');
          } else if (storedGranter !== smartAccountAddress) {
            console.log('[AbstraxionContext] ⚠️ Stored granter does NOT match current smart account');
          }

          if (!grantsExist) {
            // Create grants if they don't exist
            console.log('[AbstraxionContext] 🔑 Creating NEW grants for smart account...');
            await createGrants(smartAccountAddress, walletInfo, chainId);
            console.log('[AbstraxionContext] ✅ Grants created successfully');
          }

          // Set granter address (already stored by createGrants if new)
          setGranterAddress(smartAccountAddress);

          console.log('[AbstraxionContext] ✅ Setting connected state and clearing isConnecting');
          setIsConnected(true);
          setIsConnecting(false); // Clear connecting state BEFORE closing modals
          setShowModal(false);
          setShowWalletSelectionModal(false);
          console.log('[AbstraxionContext] ✅ Modals closed, connection complete');
        } catch (error) {
          console.error('[AbstraxionContext] ❌ Failed to setup grants:', error);

          // Clean up session keys since they don't have valid grants so that keys only exist if fully setup
          await cleanupSession();

          setAbstraxionError(`Failed to setup grants: ${error instanceof Error ? error.message : 'Unknown error'}`);
          console.log('[AbstraxionContext] ❌ Clearing isConnecting due to error');
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
  }) : null;

  // Initialize signer auth hook (for signer mode)
  const signerAuthState = authMode === 'signer' ? useSignerAuth({
    authentication: authentication as SignerAuthentication,
    indexer,
    localConfig,
    rpcUrl,
    onSuccess: async (smartAccountAddress, connectionInfo) => {
      console.log('[AbstraxionContext] Signer auth success');

      if (treasury) {
        try {
          const storedGranter = localStorage.getItem('xion-authz-granter-account');
          const storedTempAccount = localStorage.getItem('xion-authz-temp-account');

          let grantsExist = storedGranter === smartAccountAddress && storedTempAccount;

          if (!grantsExist) {
            console.log('[AbstraxionContext] Creating grants for signer mode...');
            await createGrants(smartAccountAddress, connectionInfo, chainId);
          }

          // Get the session keypair to set as abstraxionAccount
          const sessionKeypair = await abstraxionAuth.getLocalKeypair();
          if (sessionKeypair) {
            console.log('[AbstraxionContext] ✅ Setting abstraxionAccount from session keypair');
            setAbstraxionAccount(sessionKeypair);
          }

          setGranterAddress(smartAccountAddress);
          setIsConnected(true);
          setIsConnecting(false);
          setShowModal(false);
        } catch (error) {
          console.error('[AbstraxionContext] Failed to setup grants:', error);

          // Clean up session on error
          await cleanupSession();

          setAbstraxionError(`Failed to setup grants: ${error instanceof Error ? error.message : 'Unknown error'}`);
          setIsConnecting(false);
        }
      } else {
        // No treasury - create session keypair if it doesn't exist
        let sessionKeypair = await abstraxionAuth.getLocalKeypair();
        if (!sessionKeypair) {
          console.log('[AbstraxionContext] No session keypair found, creating one for signer mode...');
          sessionKeypair = await abstraxionAuth.generateAndStoreTempAccount();
        }

        if (sessionKeypair) {
          console.log('[AbstraxionContext] ✅ Setting abstraxionAccount from session keypair');
          setAbstraxionAccount(sessionKeypair);
        }
        
        setGranterAddress(smartAccountAddress);
        // Store granter address in localStorage (needed for reconnect)
        localStorage.setItem('xion-authz-granter-account', smartAccountAddress);
        localStorage.setItem("loginAuthenticator", connectionInfo.identifier);

        // Trigger auth state change now that both keypair and granter are stored
        await abstraxionAuth.authenticate();

        setIsConnected(true);
        setShowModal(false);
      }
    },
    onError: (error) => {
      setAbstraxionError(error);
      setIsConnecting(false);
    },
  }) : null;

  // Centralized cleanup function for session keys and login state
  const cleanupSession = useCallback(async () => {
    console.log('[AbstraxionContext] 🧹 Cleaning up session...');
    // Clear session keys and trigger auth state change
    await abstraxionAuth.logout();
    // Clear additional login state not handled by abstraxionAuth.logout()
    localStorage.removeItem('loginType');
    localStorage.removeItem('loginAuthenticator');
  }, []);

  // Auto-close wallet selection modal when connected
  useEffect(() => {
    if (isConnected && showWalletSelectionModal) {
      setShowWalletSelectionModal(false);
      setWalletSelectionError(null);
    }
  }, [isConnected, showWalletSelectionModal]);

  // Handle wallet connection from custom UI
  const handleWalletConnect = useCallback(async (walletId: string) => {
    if (authentication?.type !== 'browser') {
      setWalletSelectionError('Browser wallet authentication not configured');
      return;
    }

    if (!authentication.wallets) {
      setWalletSelectionError('No wallets configured');
      return;
    }

    const walletConfig = authentication.wallets.find(w => w.id === walletId);
    if (!walletConfig) {
      setWalletSelectionError(`Wallet ${walletId} not found in configuration`);
      return;
    }

    if (!walletAuthState) {
      setWalletSelectionError('Wallet authentication not available');
      return;
    }

    try {
      console.log(`[AbstraxionContext] 🔌 Connecting to wallet: ${walletId} - setting isConnecting = true`);
      setWalletSelectionError(null);
      setIsConnecting(true);
      await walletAuthState.connectWallet(walletConfig, chainId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect wallet';
      setWalletSelectionError(errorMessage);
      console.error('[AbstraxionContext] ❌ Wallet connection error:', error);
      setIsConnecting(false); // Clear connecting state on error
    }
  }, [authentication, walletAuthState, chainId]);

  const configureInstance = useCallback(() => {
    // Configure abstraxionAuth for all modes
    // Browser/signer modes need this for authenticate() call after grant creation
    const callbackUrl = authentication?.type === 'redirect' ? authentication.callbackUrl : undefined;
    abstraxionAuth.configureAbstraxionInstance(
      rpcUrl,
      contracts,
      stake,
      bank,
      callbackUrl,
      treasury,
      indexer?.url,
      indexer?.authToken,
      treasuryIndexer?.url,
    );
  }, [rpcUrl, contracts, stake, bank, authentication, treasury, indexer, treasuryIndexer]);

  useEffect(() => {
    configureInstance();
  }, [configureInstance]);

  // Detect Auth callback after hydration
  useEffect(() => {
    // Only handle granted redirect in redirect mode
    if (authMode === 'redirect') {
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
  }, [authMode]);

  useEffect(() => {
    // Only subscribe to auth state changes in redirect mode
    if (authMode !== 'redirect') {
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
  }, [isConnected, abstraxionAuth, authMode]);

  const persistAuthenticateState = useCallback(async () => {
    // Only authenticate with OAuth in redirect mode
    if (authMode !== 'redirect') {
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
  }, [abstraxionAuth, authMode]);

  // Restore session for redirect mode
  useEffect(() => {
    const initializeAuth = async () => {
      // Only run in redirect mode - IMPORTANT: check authMode first before other conditions
      if (authMode !== 'redirect') {
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
    authMode,
  ]);

  // Restore session for signer/browser modes on mount
  useEffect(() => {
    // Only run in signer/browser modes
    if (authMode === 'redirect') {
      return;
    }

    // Skip if already connected or connecting
    if (isConnected || isConnecting) {
      return;
    }

    async function restoreDirectModeSession() {
      console.log('[AbstraxionContext] Checking for existing session keys in direct mode...');
      try {
        // Check if session keypair exists
        const storedKeypair = await abstraxionAuth.getLocalKeypair();
        const storedGranter = localStorage.getItem('xion-authz-granter-account');

        // No session to restore - this is normal on first visit
        if (!storedKeypair || !storedGranter) {
          console.log('[AbstraxionContext] No existing session found (first visit or logged out)');
          setIsInitializing(false);
          return;
        }

        console.log('[AbstraxionContext] Found stored session, verifying grants on-chain...');
        console.log('[AbstraxionContext] → Stored granter address:', storedGranter);

        // Verify grants still exist on-chain via authenticate
        await abstraxionAuth.authenticate();

        // If we get here, grants are valid
        console.log('[AbstraxionContext] ✅ Session restored successfully!');
        setAbstraxionAccount(storedKeypair);
        setGranterAddress(storedGranter);
        setIsConnected(true);
        setIsInitializing(false);
      } catch (error) {
        // Session expired or invalid - clear it silently
        console.log('[AbstraxionContext] ⚠️ Session expired or invalid, clearing stored session');
        await cleanupSession();
        setIsInitializing(false);
      }
    }

    restoreDirectModeSession();
  }, [authMode, isConnected, isConnecting, abstraxionAuth]);

  async function login() {
    // User actively logging in, so initialization phase is over
    setIsInitializing(false);

    // Only login state for people actually clicking Login, not Auth callbacks
    if (!isReturningFromAuth) {
      setIsLoggingIn(true);
    }

    try {
      console.log('[AbstraxionContext] 🚀 login() called');

      // Check authentication mode
      if (authMode === 'redirect') {
        // OAuth flow via dashboard redirect
        setIsConnecting(true);
        await abstraxionAuth.login();
      } else if (authMode === 'browser' && authentication?.type === 'browser') {
        // Browser wallet mode
        if (authentication.autoConnect) {
          // Auto-connect to first available wallet
          console.log('[AbstraxionContext] Auto-connecting to first available wallet');
          setIsConnecting(true);

          // Default to common Cosmos wallets if none specified
          const defaultWallets = [BUILT_IN_WALLETS.keplr, BUILT_IN_WALLETS.metamask];
          const wallets = authentication.wallets || defaultWallets;

          if (!walletAuthState) {
            setWalletSelectionError('Wallet authentication not available');
            return;
          }

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
        } else {
          // Manual wallet selection - show modal
          setIsConnecting(false);
          setShowWalletSelectionModal(true);
        }
      } else if (authMode === 'signer') {
        // Signer mode - call signerAuthState.connect()
        if (!signerAuthState) {
          console.error('[AbstraxionContext] Signer auth not initialized');
          return;
        }

        setIsConnecting(true);
        try {
          await signerAuthState.connectSigner();
        } catch (error: any) {
          console.error('[AbstraxionContext] Signer connection failed:', error);
          setAbstraxionError(error.message || 'Failed to connect signer');
          setIsConnecting(false);
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error; // Re-throw to allow handling by the caller
    } finally {
      // Keep isLoggingIn true until auth state change sets isConnecting (only for manual login)
      if (authMode === 'redirect') {
        setIsConnecting(false);
      }
    }
  }
  useEffect(() => {
    // Only handle login callback in redirect mode
    if (authMode === 'redirect') {
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
  }, [authMode, isReturningFromAuth]);

  const logout = useCallback(async () => {
    setIsConnected(false);
    setAbstraxionAccount(undefined);
    setGranterAddress("");
    setIsInitializing(false);
    setIsConnecting(false);
    setIsReturningFromAuth(false);

    // Clear wallet auth state if in direct mode
    if (authMode === 'browser' && walletAuthState) {
      walletAuthState.disconnect();
    } else if (authMode === 'signer' && signerAuthState) {
      signerAuthState.disconnect();
    }

    await cleanupSession();
  }, [authMode, walletAuthState, signerAuthState, cleanupSession]);

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
        indexerUrl: indexer?.url,
        login,
        logout,
        authMode,
        walletAuthState,
        signerAuthState,
        // Wallet selection state for browser mode
        showWalletSelectionModal,
        setShowWalletSelectionModal,
        walletSelectionError,
        setWalletSelectionError,
        handleWalletConnect,
      }}
    >
      {children}

      {/*
      See demo-app for an example implementation of the wallet selection modal
      */}
    </AbstraxionContext.Provider>
  );
}
