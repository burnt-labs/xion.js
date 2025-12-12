import type { ReactNode } from "react";
import { createContext, useCallback, useEffect, useState, useRef } from "react";
import {
  SignArbSecp256k1HdWallet,
  GranteeSignerClient,
} from "@burnt-labs/abstraxion-core";
import type { AccountState } from "@burnt-labs/account-management";
import {
  AccountStateGuards,
  extractIndexerAuthToken,
} from "@burnt-labs/account-management";
import type { Controller } from "./controllers";
import {
  createController,
  RedirectController,
  SignerController,
} from "./controllers";
import type {
  AbstraxionConfig,
  AuthenticationConfig,
  NormalizedAbstraxionConfig,
} from "./types";
import { normalizeAbstraxionConfig } from "./utils/normalizeAbstraxionConfig";

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

/**
 * Default context value used before provider mounts
 * All functions throw errors to catch improper usage
 */
const defaultContextValue: AbstraxionContextProps = {
  // State - all false/empty until provider mounts
  isConnected: false,
  isConnecting: false,
  isInitializing: true,
  isReturningFromAuth: false,
  isLoggingIn: false,
  abstraxionError: "",
  abstraxionAccount: undefined,
  granterAddress: "",
  signingClient: undefined,

  // Config - empty defaults (will be overridden by provider)
  chainId: "",
  rpcUrl: "",
  restUrl: "",
  gasPrice: "",
  contracts: undefined,
  stake: false,
  bank: undefined,
  treasury: undefined,
  feeGranter: undefined,
  indexerUrl: undefined,
  indexerAuthToken: undefined,
  treasuryIndexerUrl: undefined,

  // Authentication
  authMode: "redirect",
  authentication: undefined,

  // Actions - throw errors if called before provider mounts
  logout: async () => {
    throw new Error(
      "AbstraxionContext: logout() called before provider mounted. Wrap your component tree with <AbstraxionProvider>.",
    );
  },
  login: async () => {
    throw new Error(
      "AbstraxionContext: login() called before provider mounted. Wrap your component tree with <AbstraxionProvider>.",
    );
  },
};

export const AbstraxionContext =
  createContext<AbstraxionContextProps>(defaultContextValue);

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
  const configRef = useRef<NormalizedAbstraxionConfig>(normalizedConfig);

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
  const indexer =
    authentication?.type === "signer" ? authentication.indexer : undefined;
  const treasuryIndexer =
    authentication?.type === "signer"
      ? authentication.treasuryIndexer
      : undefined;

  // Determine authentication mode - defaults to redirect unless set in config
  const authMode = authentication?.type || "redirect";

  if (!controllerRef.current) {
    // First render: Create controller with normalized config
    controllerRef.current = createController(normalizedConfig);
    configRef.current = normalizedConfig;
  } else {
    // Subsequent renders: Update controller's getSignerConfig if function reference changed
    // This handles the case where external auth providers (e.g., Turnkey) become ready
    // after initial render and provide a new authenticated getSignerConfig function
    const isSignerMode =
      previousConfig.authentication?.type === "signer" &&
      authentication?.type === "signer";
    const isSignerController =
      controllerRef.current instanceof SignerController;
    const hasSignerConfigChanged =
      previousConfig.authentication?.type === "signer" &&
      authentication?.type === "signer" &&
      previousConfig.authentication.getSignerConfig !==
        authentication.getSignerConfig;

    if (isSignerMode && isSignerController && hasSignerConfigChanged) {
      // TypeScript: We've verified it's a SignerController above
      (controllerRef.current as SignerController).updateGetSignerConfig(
        authentication.getSignerConfig,
      );
    }

    // Update configRef for next render's comparison
    configRef.current = normalizedConfig;
  }

  // Always start with controller's initializing state this ensures UI immediately shows loading state and doesn't assume readiness
  const controller = controllerRef.current;
  const [controllerState, setControllerState] = useState<AccountState>(
    controller.getState(),
  );

  // TODO: Potentially put in a useEffect with empty dependency array to check if we're returning from auth redirect and if so, transition to connecting state
  // To keep it clean this is all handled in the controller for now, this means there is a short INIT window for redirect mode

  // Controller handles all state transitions including detecting redirect callbacks
  useEffect(() => {
    const unsubscribe = controller.subscribe((newState) => {
      setControllerState(newState);
    });

    // Initialize controller (restores session, checks redirect callbacks, etc.)
    controller.initialize().catch(() => {
      // Initialization errors are handled by controller's state machine
      // Error state will be reflected in isError/abstraxionError context values
    });

    return () => {
      unsubscribe(); // Cleanup subscription
      controller.destroy();
    };
  }, [controller]);

  // Map state machine state to context props - ALL loading states come from state machine
  const isInitializing = AccountStateGuards.isInitializing(controllerState);
  const isConnecting =
    AccountStateGuards.isConnecting(controllerState) ||
    AccountStateGuards.isConfiguringPermissions(controllerState);
  const isConnected = AccountStateGuards.isConnected(controllerState);
  const isError = AccountStateGuards.isError(controllerState);

  // Derive isLoggingIn from connecting state (user actively logging in)
  // This is true when connecting but not initializing (i.e., user-initiated connection)
  const isLoggingIn = isConnecting && !isInitializing;

  // Derive isReturningFromAuth from state machine + controller check
  // True when: in redirect mode, state is connecting, and URL has granted=true
  const isReturningFromAuth =
    authMode === "redirect" &&
    isConnecting &&
    controller instanceof RedirectController &&
    controller.isReturningFromRedirect();

  // set the return values from the controller state
  const abstraxionAccount = isConnected
    ? controllerState.account.keypair
    : undefined;
  const granterAddress = isConnected
    ? controllerState.account.granterAddress
    : "";
  const signingClient = isConnected ? controllerState.signingClient : undefined;
  const abstraxionError = isError ? controllerState.error : "";

  const login = useCallback(async () => {
    // Login function - delegates to controller who handles errors
    await controller.connect();
  }, [controller]);

  const logout = useCallback(async () => {
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
        indexerAuthToken: extractIndexerAuthToken(indexer),
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
