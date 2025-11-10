import type { ReactNode } from "react";
import { createContext, useCallback, useEffect, useState, useRef } from "react";
import { SignArbSecp256k1HdWallet, GranteeSignerClient } from "@burnt-labs/abstraxion-core";
import type { AccountState } from '@burnt-labs/account-management';
import { AccountStateGuards } from '@burnt-labs/account-management';
import type { Controller } from "../../controllers";
import { createController } from "../../utils/controllerFactory";
import { RedirectController, SignerController } from "../../controllers";
import type { AbstraxionConfig, AuthenticationConfig } from "../../types";
import { normalizeAbstraxionConfig } from "../../utils/normalizeAbstraxionConfig";

export type SpendLimit = { denom: string; amount: string };

export type ContractGrantDescription =
  | string
  | {
      address: string;
      amounts: SpendLimit[];
    };

export interface AbstraxionContextProps {
  // State from controller's state machine
  isConnected: boolean;
  isConnecting: boolean;
  isInitializing: boolean;
  isReturningFromAuth: boolean;
  isLoggingIn: boolean;
  abstraxionError: string;
  abstraxionAccount: SignArbSecp256k1HdWallet | undefined;
  granterAddress: string;
  signingClient?: GranteeSignerClient;
  
  // Config
  chainId: string;
  rpcUrl: string;
  restUrl: string;
  gasPrice: string;
  contracts?: ContractGrantDescription[];
  stake?: boolean;
  bank?: SpendLimit[];
  treasury?: string;
  feeGranter?: string;
  indexerUrl?: string;
  indexerAuthToken?: string;
  treasuryIndexerUrl?: string;
  
  // Authentication
  authMode: "signer" | "redirect";
  authentication?: AuthenticationConfig;
  
  // Actions
  logout: () => Promise<void>;
  login: () => Promise<void>;
}

export const AbstraxionContext = createContext<AbstraxionContextProps>(
  {} as AbstraxionContextProps,
);

export function AbstraxionProvider({
  children,
  config,
}: {
  children: ReactNode;
  config: AbstraxionConfig;
}): JSX.Element {
  // Normalize config synchronously - fills in defaults based on chainId
  const normalizedConfig = normalizeAbstraxionConfig(config);
  
  // Use refs to persist controller and config across renders:
  // - controllerRef: Stores controller instance (created once, reused)
  // - configRef: Stores previous config to detect getSignerConfig function reference changes
  // When external auth providers (e.g., Turnkey) become ready after initial render,
  // they provide a new getSignerConfig function that must be updated in the controller
  const controllerRef = useRef<Controller | null>(null);
  const configRef = useRef<AbstraxionConfig>(normalizedConfig);
  
  // Capture previous config BEFORE updating configRef (for comparison)
  const previousConfig = configRef.current;
  
  // Extract values from normalized config
  const {
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
  } = normalizedConfig;

  // Get indexer and treasuryIndexer from signer auth if available, otherwise undefined
  const indexer = authentication?.type === 'signer' ? authentication.indexer : undefined;
  const treasuryIndexer = authentication?.type === 'signer' ? authentication.treasuryIndexer : undefined;

  // Determine authentication mode - defaults to redirect unless set in config
  const authMode = authentication?.type || 'redirect';


  
  if (!controllerRef.current) {
    // First render: Create controller with normalized config
    controllerRef.current = createController(normalizedConfig);
    configRef.current = normalizedConfig;
  } else {
    // Subsequent renders: Update controller's getSignerConfig if function reference changed
    // This handles the case where external auth providers (e.g., Turnkey) become ready
    // after initial render and provide a new authenticated getSignerConfig function
    const isSignerMode = previousConfig.authentication?.type === 'signer' &&
                         authentication?.type === 'signer';
    const isSignerController = controllerRef.current instanceof SignerController;
    const hasSignerConfigChanged = previousConfig.authentication?.type === 'signer' &&
                                   authentication?.type === 'signer' &&
                                   previousConfig.authentication.getSignerConfig !== 
                                   authentication.getSignerConfig;
    
    if (isSignerMode && isSignerController && hasSignerConfigChanged) {
      // TypeScript: We've verified it's a SignerController above
      (controllerRef.current as SignerController).updateGetSignerConfig(authentication.getSignerConfig);
    }
    
    // Update configRef for next render's comparison
    configRef.current = normalizedConfig;
  }

  // Always start with controller's initializing state this ensures UI immediately shows loading state and doesn't assume readiness
  const controller = controllerRef.current;
  const [controllerState, setControllerState] = useState<AccountState>(controller.getState());

  // TODO: Potentially put in a useEffect with empty dependency array to check if we're returning from auth redirect and if so, transition to connecting state
  // To keep it clean this is all handled in the controller for now, this means there is a short INIT window for redirect mode

  // Controller handles all state transitions including detecting redirect callbacks
  useEffect(() => {
    const unsubscribe = controller.subscribe((newState) => {
      setControllerState(newState);
    });

    // Initialize controller (restores session, checks redirect callbacks, etc.)
    controller.initialize().catch((error) => {
      console.error('[AbstraxionContext] Controller initialization error:', error);
    });

    return () => {
      unsubscribe(); // Cleanup subscription
      controller.destroy();
    };
  }, [controller]);

  // Map state machine state to context props - ALL loading states come from state machine
  const isInitializing = AccountStateGuards.isInitializing(controllerState);
  const isConnecting = AccountStateGuards.isConnecting(controllerState) || 
                       AccountStateGuards.isConfiguringPermissions(controllerState);
  const isConnected = AccountStateGuards.isConnected(controllerState);
  const isError = AccountStateGuards.isError(controllerState);
  
  // Derive isLoggingIn from connecting state (user actively logging in)
  // This is true when connecting but not initializing (i.e., user-initiated connection)
  const isLoggingIn = isConnecting && !isInitializing;
  
  // Derive isReturningFromAuth from state machine + controller check
  // True when: in redirect mode, state is connecting, and URL has granted=true
  const isReturningFromAuth = authMode === 'redirect' && 
    isConnecting && 
    controller instanceof RedirectController && 
    controller.isReturningFromRedirect();
  
  // set the return values from the controller state
  const abstraxionAccount = isConnected ? controllerState.account.keypair : undefined;
  const granterAddress = isConnected ? controllerState.account.granterAddress : '';
  const signingClient = isConnected ? controllerState.signingClient : undefined;
  const abstraxionError = isError ? controllerState.error : '';

  const login = useCallback(async () => {
    console.log('[AbstraxionContext] login() called');
    // Login function - delegates to controller who handles errors
    await controller.connect();
  }, [controller]);

  const logout = useCallback(async () => {
    console.log('[AbstraxionContext] logout() called');
    // Logout function - delegates to controller who handles errors
    await controller.disconnect();
  }, [controller]);

  return (
    <AbstraxionContext.Provider
      value={{
        // State from controller's state machine
        isConnected,
        isConnecting,
        isInitializing,
        isReturningFromAuth,
        isLoggingIn,
        abstraxionError,
        abstraxionAccount,
        granterAddress,
        signingClient,
        
        // Config
        chainId,
        rpcUrl,
        restUrl,
        gasPrice,
        contracts,
        stake,
        bank,
        treasury,
        feeGranter,
        indexerUrl: indexer?.url,
        indexerAuthToken: indexer?.authToken,
        treasuryIndexerUrl: treasuryIndexer?.url,
        
        // Authentication
        authMode,
        authentication,
        
        // Actions
        login,
        logout,
      }}
    >
      {children}
    </AbstraxionContext.Provider>
  );
}

