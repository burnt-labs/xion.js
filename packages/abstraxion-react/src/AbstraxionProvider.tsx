import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import {
  AccountStateGuards,
  createAbstraxionRuntime,
  extractIndexerAuthToken,
  RedirectController,
  SignerController,
} from "@burnt-labs/abstraxion-js";
import type {
  AbstraxionConfig,
  AbstraxionRuntime,
  AuthenticationConfig,
  ContractGrantDescription,
  Controller,
  ConnectorConnectionResult,
  GranteeSignerClient,
  SignArbSecp256k1HdWallet,
  SpendLimit,
} from "@burnt-labs/abstraxion-js";

export type {
  ContractGrantDescription,
  SpendLimit,
} from "@burnt-labs/abstraxion-js";

export interface AbstraxionContextProps {
  // State from controller's state machine
  isConnected: boolean;
  isConnecting: boolean;
  isInitializing: boolean;
  /** True after an explicit user-initiated logout. Prevents the embed from re-triggering login. */
  isDisconnected: boolean;
  /** True while a requireAuth signing request is pending and the iframe needs to be visible. */
  isAwaitingApproval: boolean;
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
  authMode: "signer" | "redirect" | "embedded" | "popup";
  authentication?: AuthenticationConfig;

  /**
   * Connection info for direct signing (signer mode only).
   * Used by useAbstraxionSigningClient({ requireAuth: true }) and (today)
   * still surfaced for backwards-compatible escape-hatch usage.
   */
  connectionInfo?: ConnectorConnectionResult;

  /** The active controller — escape hatch for advanced flows. */
  controller?: Controller;

  /**
   * Active framework-agnostic runtime. Hooks call into this instead of
   * narrowing controllers themselves; keeps the React layer thin.
   */
  runtime?: AbstraxionRuntime;

  // Actions
  logout: () => Promise<void>;
  login: () => Promise<void>;
}

/**
 * Default context value used before provider mounts
 * All functions throw errors to catch improper usage
 */
const defaultContextValue: AbstraxionContextProps = {
  isConnected: false,
  isConnecting: false,
  isInitializing: true,
  isDisconnected: false,
  isAwaitingApproval: false,
  isReturningFromAuth: false,
  isLoggingIn: false,
  abstraxionError: "",
  abstraxionAccount: undefined,
  granterAddress: "",
  signingClient: undefined,

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

  authMode: "redirect",
  authentication: undefined,
  connectionInfo: undefined,
  controller: undefined,
  runtime: undefined,

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
  // Construct the runtime once. Strategies default to browser inside the
  // runtime — no need to pass them explicitly here.
  // autoInitialize is delayed so the first useSyncExternalStore snapshot is
  // captured before any synchronous "INITIALIZE → CONNECTED" transition.
  const runtimeRef = useRef<AbstraxionRuntime | null>(null);
  if (!runtimeRef.current) {
    runtimeRef.current = createAbstraxionRuntime(config, {
      autoInitialize: false,
    });
  }
  const runtime = runtimeRef.current;
  const controller = runtime.controller;
  const normalizedConfig = runtime.config;
  const authMode = runtime.authMode;

  // Update dynamic getSignerConfig when consumers swap in a new authenticated
  // function (Turnkey, Privy, etc. become ready after first render). Run as an
  // effect so the controller mutation happens post-commit.
  const incomingSignerConfig =
    config.authentication?.type === "signer"
      ? config.authentication.getSignerConfig
      : undefined;
  useEffect(() => {
    if (incomingSignerConfig) {
      runtime.updateGetSignerConfig(incomingSignerConfig);
    }
  }, [runtime, incomingSignerConfig]);

  const indexer =
    normalizedConfig.authentication?.type === "signer"
      ? normalizedConfig.authentication.indexer
      : undefined;
  const treasuryIndexer =
    normalizedConfig.authentication?.type === "signer"
      ? normalizedConfig.authentication.treasuryIndexer
      : undefined;

  const controllerState = useSyncExternalStore(
    runtime.subscribe,
    runtime.getState,
    runtime.getState,
  );

  const isAwaitingApproval = useSyncExternalStore(
    runtime.subscribeApproval,
    runtime.getApprovalState,
    runtime.getApprovalState,
  );

  // Initialize once and clean up on unmount.
  useEffect(() => {
    runtime.initialize().catch((error) => {
      console.error(
        "[AbstraxionProvider] Controller initialization failed:",
        error,
      );
    });
    return () => {
      runtime.destroy();
    };
  }, [runtime]);

  const isInitializing = AccountStateGuards.isInitializing(controllerState);
  const isConnecting =
    AccountStateGuards.isConnecting(controllerState) ||
    AccountStateGuards.isConfiguringPermissions(controllerState);
  const isConnected = AccountStateGuards.isConnected(controllerState);
  const isDisconnected = AccountStateGuards.isDisconnected(controllerState);
  const isError = AccountStateGuards.isError(controllerState);
  const isLoggingIn = isConnecting && !isInitializing;

  // Redirect mode: surface the "we're back from the dashboard" state so the
  // host can render an interstitial instead of flicker-rendering the
  // disconnected view while the orchestrator finishes restoring.
  const isReturningFromAuth =
    authMode === "redirect" &&
    isConnecting &&
    controller instanceof RedirectController &&
    controller.isReturningFromRedirect();

  const abstraxionAccount = isConnected
    ? controllerState.account.keypair
    : undefined;
  const granterAddress = isConnected
    ? controllerState.account.granterAddress
    : "";
  const signingClient = isConnected ? controllerState.signingClient : undefined;
  const abstraxionError = isError ? controllerState.error : "";

  const connectionInfo =
    isConnected && controller instanceof SignerController
      ? controller.getConnectionInfo?.()
      : undefined;

  const login = useCallback(() => runtime.login(), [runtime]);
  const logout = useCallback(() => runtime.logout(), [runtime]);

  // Memoize the provider value so descendants don't re-render on unrelated
  // state ticks.
  const contextValue = useMemo<AbstraxionContextProps>(
    () => ({
      isConnected,
      isConnecting,
      isInitializing,
      isDisconnected,
      isAwaitingApproval,
      isReturningFromAuth,
      isLoggingIn,
      abstraxionError,
      abstraxionAccount,
      granterAddress,
      signingClient,

      chainId: normalizedConfig.chainId,
      rpcUrl: normalizedConfig.rpcUrl,
      restUrl: normalizedConfig.restUrl,
      gasPrice: normalizedConfig.gasPrice,
      contracts: normalizedConfig.contracts,
      stake: normalizedConfig.stake ?? false,
      bank: normalizedConfig.bank,
      treasury: normalizedConfig.treasury,
      feeGranter: normalizedConfig.feeGranter,
      indexerUrl: indexer?.url,
      indexerAuthToken: extractIndexerAuthToken(indexer),
      treasuryIndexerUrl: treasuryIndexer?.url,

      authMode,
      authentication: normalizedConfig.authentication,
      connectionInfo,
      controller,
      runtime,

      login,
      logout,
    }),
    [
      isConnected,
      isConnecting,
      isInitializing,
      isDisconnected,
      isAwaitingApproval,
      isReturningFromAuth,
      isLoggingIn,
      abstraxionError,
      abstraxionAccount,
      granterAddress,
      signingClient,
      normalizedConfig,
      indexer,
      treasuryIndexer,
      authMode,
      connectionInfo,
      controller,
      runtime,
      login,
      logout,
    ],
  );

  return (
    <AbstraxionContext.Provider value={contextValue}>
      {children}
    </AbstraxionContext.Provider>
  );
}
