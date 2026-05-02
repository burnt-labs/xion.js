import type { ReactNode } from "react";
import { createContext, useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import {
  AccountStateGuards,
  createAbstraxionRuntime,
  GasPrice,
  testnetChainInfo,
} from "@burnt-labs/abstraxion-js";
import type {
  AbstraxionConfig as AbstraxionJsConfig,
  AbstraxionRuntime,
  AccountState,
  ConnectorConnectionResult,
  ContractGrantDescription,
  Controller,
  EmbeddedAuthentication,
  GranteeSignerClient,
  RedirectAuthentication,
  SignArbSecp256k1HdWallet,
  SignerAuthentication,
  SpendLimit,
} from "@burnt-labs/abstraxion-js";
import { ReactNativeRedirectStrategy } from "../../strategies/ReactNativeRedirectStrategy";
import { ReactNativeStorageStrategy } from "../../strategies/ReactNativeStorageStrategy";
import { RNWebViewIframeTransport } from "../../strategies/RNWebViewIframeTransport";

export type {
  ContractGrantDescription,
  SpendLimit,
} from "@burnt-labs/abstraxion-js";

/**
 * Authentication modes supported in React Native.
 *
 * - `redirect` — Expo WebBrowser + deep link callback (primary mode)
 * - `signer` — Injected signing function (Turnkey, Privy, etc.)
 * - `embedded` — Dashboard inside a `<react-native-webview>` `<WebView>` (Phase 9b)
 *
 * `popup` and `auto` are still web-only:
 * - `popup` requires `window.open` + same-origin `postMessage`.
 * - `auto` resolves to `popup` on desktop and would silently fall through here.
 */
export type ReactNativeAuthenticationConfig =
  | RedirectAuthentication
  | SignerAuthentication
  | EmbeddedAuthentication;

export interface AbstraxionContextProps {
  isConnected: boolean;
  isConnecting: boolean;
  isInitializing: boolean;
  isDisconnected: boolean;
  isAwaitingApproval: boolean;
  isReturningFromAuth: boolean;
  isLoggingIn: boolean;
  abstraxionError: string;
  abstraxionAccount: SignArbSecp256k1HdWallet | undefined;
  granterAddress: string;
  contracts?: ContractGrantDescription[];
  chainId: string;
  rpcUrl: string;
  restUrl: string;
  stake?: boolean;
  bank?: SpendLimit[];
  treasury?: string;
  indexerUrl?: string;
  gasPrice: GasPrice;
  signingClient?: GranteeSignerClient;
  authMode: "signer" | "redirect" | "embedded";
  authentication?: ReactNativeAuthenticationConfig;
  connectionInfo?: ConnectorConnectionResult;
  controller?: Controller;
  runtime?: AbstraxionRuntime;
  logout: () => Promise<void>;
  login: () => Promise<void>;
}

export interface AbstraxionConfig extends Omit<
  AbstraxionJsConfig,
  "chainId" | "authentication"
> {
  chainId?: string;
  callbackUrl?: string;
  indexerUrl?: string;
  /**
   * React Native supports `redirect` (Expo WebBrowser + deep link), `signer`
   * (injected signing function), and (since Phase 9b) `embedded` (in-app
   * `<WebView>`). `popup` and `auto` are web-only.
   */
  authentication?: ReactNativeAuthenticationConfig;
}

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
  contracts: undefined,
  chainId: testnetChainInfo.chainId,
  rpcUrl: testnetChainInfo.rpc,
  restUrl: testnetChainInfo.rest,
  stake: false,
  bank: undefined,
  treasury: undefined,
  indexerUrl: undefined,
  gasPrice: GasPrice.fromString("0.001uxion"),
  signingClient: undefined,
  authMode: "redirect",
  authentication: undefined,
  connectionInfo: undefined,
  controller: undefined,
  runtime: undefined,
  logout: () => {
    return Promise.reject(
      new Error("AbstraxionContext: logout() called before provider mounted."),
    );
  },
  login: () => {
    return Promise.reject(
      new Error("AbstraxionContext: login() called before provider mounted."),
    );
  },
};

export const AbstraxionContext =
  createContext<AbstraxionContextProps>(defaultContextValue);

function resolveReactNativeAuthentication(
  authentication: ReactNativeAuthenticationConfig | undefined,
  callbackUrl: string | undefined,
): ReactNativeAuthenticationConfig {
  if (!authentication) {
    return callbackUrl
      ? { type: "redirect", callbackUrl }
      : { type: "redirect" };
  }

  // Defensive runtime guard for non-TS callers using `as any`.
  if (
    authentication.type !== "redirect" &&
    authentication.type !== "signer" &&
    authentication.type !== "embedded"
  ) {
    throw new Error(
      `[abstraxion-react-native] Authentication mode "${
        (authentication as { type: string }).type
      }" is not supported on React Native. ` +
        `Use { type: "redirect" } (Expo WebBrowser), { type: "signer" } (injected signing), ` +
        `or { type: "embedded" } (react-native-webview). popup and auto are web-only.`,
    );
  }

  if (
    authentication.type === "redirect" &&
    callbackUrl &&
    !authentication.callbackUrl
  ) {
    return {
      ...authentication,
      callbackUrl,
    };
  }

  return authentication;
}

export function AbstraxionProvider({
  children,
  config,
}: {
  children: ReactNode;
  config: AbstraxionConfig;
}): JSX.Element {
  const resolvedConfig = useMemo<AbstraxionJsConfig>(() => {
    const { callbackUrl, indexerUrl: _indexerUrl, chainId, authentication, ...rest } = config;
    return {
      ...rest,
      chainId: chainId ?? testnetChainInfo.chainId,
      authentication: resolveReactNativeAuthentication(authentication, callbackUrl),
    };
  }, [config]);

  // Singleton runtime — controllers are heavy; recreating breaks redirect
  // callback detection across remounts.
  const runtimeRef = useRef<AbstraxionRuntime | null>(null);
  if (!runtimeRef.current) {
    runtimeRef.current = createAbstraxionRuntime(resolvedConfig, {
      autoInitialize: false,
      strategies: {
        storageStrategy: new ReactNativeStorageStrategy(),
        redirectStrategy: new ReactNativeRedirectStrategy(),
        // Always supply the RN transport — only used when authentication.type === "embedded".
        iframeTransportStrategy:
          resolvedConfig.authentication?.type === "embedded"
            ? new RNWebViewIframeTransport()
            : undefined,
      },
    });
  }
  const runtime = runtimeRef.current;
  const controller = runtime.controller;
  const normalizedConfig = runtime.config;
  const authMode: "signer" | "redirect" | "embedded" =
    runtime.authMode === "embedded"
      ? "embedded"
      : runtime.authMode === "signer"
        ? "signer"
        : "redirect";

  // Update dynamic getSignerConfig if the consumer swaps it in (Turnkey/Privy
  // patterns where the authenticated function arrives after first render).
  // Run as an effect so the controller mutation happens post-commit.
  const incomingSignerConfig =
    config.authentication?.type === "signer"
      ? config.authentication.getSignerConfig
      : undefined;
  useEffect(() => {
    if (incomingSignerConfig) {
      runtime.updateGetSignerConfig(incomingSignerConfig);
    }
  }, [runtime, incomingSignerConfig]);

  const controllerState = useSyncExternalStore<AccountState>(
    runtime.subscribe,
    runtime.getState,
    runtime.getState,
  );

  const isAwaitingApproval = useSyncExternalStore(
    runtime.subscribeApproval,
    runtime.getApprovalState,
    runtime.getApprovalState,
  );

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
    AccountStateGuards.isConfiguringPermissions(controllerState) ||
    AccountStateGuards.isRedirecting(controllerState);
  const isConnected = AccountStateGuards.isConnected(controllerState);
  const isDisconnected = AccountStateGuards.isDisconnected(controllerState);
  const isError = AccountStateGuards.isError(controllerState);
  const isLoggingIn = isConnecting && !isInitializing;
  const isReturningFromAuth =
    authMode === "redirect" && AccountStateGuards.isConnecting(controllerState);

  const abstraxionAccount = isConnected
    ? controllerState.account.keypair
    : undefined;
  const granterAddress = isConnected
    ? controllerState.account.granterAddress
    : "";
  const signingClient = isConnected ? controllerState.signingClient : undefined;
  const abstraxionError = isError ? controllerState.error : "";

  const connectionInfo =
    isConnected && controller && typeof (controller as Controller).getConnectionInfo === "function"
      ? (controller as Controller).getConnectionInfo?.()
      : undefined;

  const login = useCallback(() => runtime.login(), [runtime]);
  const logout = useCallback(() => runtime.logout(), [runtime]);

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
      contracts: normalizedConfig.contracts,
      chainId: normalizedConfig.chainId,
      rpcUrl: normalizedConfig.rpcUrl,
      restUrl: normalizedConfig.restUrl,
      stake: normalizedConfig.stake,
      bank: normalizedConfig.bank,
      treasury: normalizedConfig.treasury,
      indexerUrl: config.indexerUrl,
      login,
      logout,
      gasPrice: GasPrice.fromString(normalizedConfig.gasPrice),
      signingClient,
      authMode,
      authentication:
        normalizedConfig.authentication as ReactNativeAuthenticationConfig,
      connectionInfo,
      controller,
      runtime,
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
      normalizedConfig,
      config.indexerUrl,
      authMode,
      signingClient,
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
