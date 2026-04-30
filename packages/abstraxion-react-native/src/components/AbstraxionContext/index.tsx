import type { Dispatch, ReactNode, SetStateAction } from "react";
import { createContext, useCallback, useEffect, useRef, useState } from "react";
import {
  AccountStateGuards,
  createController,
  GasPrice,
  normalizeAbstraxionConfig,
  RedirectController,
  SignerController,
  testnetChainInfo,
} from "@burnt-labs/abstraxion-js";
import type {
  AbstraxionConfig as AbstraxionJsConfig,
  AccountState,
  AuthenticationConfig,
  ConnectorConnectionResult,
  ContractGrantDescription,
  Controller,
  GranteeSignerClient,
  NormalizedAbstraxionConfig,
  SignArbSecp256k1HdWallet,
  SpendLimit,
} from "@burnt-labs/abstraxion-js";
import {
  ReactNativeRedirectStrategy,
  ReactNativeStorageStrategy,
} from "../../strategies";

export type {
  ContractGrantDescription,
  SpendLimit,
} from "@burnt-labs/abstraxion-js";

export interface AbstraxionContextProps {
  isConnected: boolean;
  setIsConnected: Dispatch<SetStateAction<boolean>>;
  isConnecting: boolean;
  setIsConnecting: Dispatch<SetStateAction<boolean>>;
  isInitializing: boolean;
  isDisconnected: boolean;
  isReturningFromAuth: boolean;
  isLoggingIn: boolean;
  abstraxionError: string;
  setAbstraxionError: Dispatch<SetStateAction<string>>;
  abstraxionAccount: SignArbSecp256k1HdWallet | undefined;
  setAbstraxionAccount: Dispatch<
    SetStateAction<SignArbSecp256k1HdWallet | undefined>
  >;
  granterAddress: string;
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  setGranterAddress: Dispatch<SetStateAction<string>>;
  contracts?: ContractGrantDescription[];
  dashboardUrl?: string;
  setDashboardUrl: Dispatch<SetStateAction<string>>;
  chainId: string;
  rpcUrl: string;
  restUrl: string;
  stake?: boolean;
  bank?: SpendLimit[];
  treasury?: string;
  indexerUrl?: string;
  gasPrice: GasPrice;
  signingClient?: GranteeSignerClient;
  authMode: "signer" | "redirect" | "embedded" | "popup";
  authentication?: AuthenticationConfig;
  connectionInfo?: ConnectorConnectionResult;
  controller?: Controller;
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
  authentication?: AuthenticationConfig;
}

const noopBooleanDispatch = (() => undefined) as Dispatch<
  SetStateAction<boolean>
>;
const noopStringDispatch = (() => undefined) as Dispatch<
  SetStateAction<string>
>;
const noopAccountDispatch = (() => undefined) as Dispatch<
  SetStateAction<SignArbSecp256k1HdWallet | undefined>
>;

const defaultContextValue: AbstraxionContextProps = {
  isConnected: false,
  setIsConnected: noopBooleanDispatch,
  isConnecting: false,
  setIsConnecting: noopBooleanDispatch,
  isInitializing: true,
  isDisconnected: false,
  isReturningFromAuth: false,
  isLoggingIn: false,
  abstraxionError: "",
  setAbstraxionError: noopStringDispatch,
  abstraxionAccount: undefined,
  setAbstraxionAccount: noopAccountDispatch,
  granterAddress: "",
  showModal: false,
  setShowModal: noopBooleanDispatch,
  setGranterAddress: noopStringDispatch,
  contracts: undefined,
  dashboardUrl: "",
  setDashboardUrl: noopStringDispatch,
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
  authentication: AuthenticationConfig | undefined,
  callbackUrl: string | undefined,
): AuthenticationConfig {
  if (!authentication) {
    return callbackUrl
      ? { type: "redirect", callbackUrl }
      : { type: "redirect" };
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

function normalizeReactNativeConfig(
  config: AbstraxionConfig,
): NormalizedAbstraxionConfig {
  const {
    callbackUrl,
    indexerUrl: _indexerUrl,
    chainId,
    authentication,
    ...rest
  } = config;

  return normalizeAbstraxionConfig({
    ...rest,
    chainId: chainId ?? testnetChainInfo.chainId,
    authentication: resolveReactNativeAuthentication(
      authentication,
      callbackUrl,
    ),
  });
}

export function AbstraxionProvider({
  children,
  config,
}: {
  children: ReactNode;
  config: AbstraxionConfig;
}): JSX.Element {
  const normalizedConfig = normalizeReactNativeConfig(config);
  const controllerRef = useRef<Controller | null>(null);
  const configRef = useRef<NormalizedAbstraxionConfig>(normalizedConfig);
  const strategiesRef = useRef<{
    storageStrategy: ReactNativeStorageStrategy;
    redirectStrategy: ReactNativeRedirectStrategy;
  } | null>(null);

  if (!strategiesRef.current) {
    strategiesRef.current = {
      storageStrategy: new ReactNativeStorageStrategy(),
      redirectStrategy: new ReactNativeRedirectStrategy(),
    };
  }

  const previousConfig = configRef.current;

  if (!controllerRef.current) {
    controllerRef.current = createController(
      normalizedConfig,
      strategiesRef.current,
    );
    configRef.current = normalizedConfig;
  } else {
    const isSignerMode =
      previousConfig.authentication?.type === "signer" &&
      normalizedConfig.authentication?.type === "signer";
    const hasSignerConfigChanged =
      isSignerMode &&
      previousConfig.authentication?.type === "signer" &&
      normalizedConfig.authentication?.type === "signer" &&
      previousConfig.authentication.getSignerConfig !==
        normalizedConfig.authentication.getSignerConfig;

    if (
      hasSignerConfigChanged &&
      controllerRef.current instanceof SignerController &&
      normalizedConfig.authentication?.type === "signer"
    ) {
      controllerRef.current.updateGetSignerConfig(
        normalizedConfig.authentication.getSignerConfig,
      );
    }

    configRef.current = normalizedConfig;
  }

  const controller = controllerRef.current;
  const [controllerState, setControllerState] = useState<AccountState>(
    controller.getState(),
  );
  const [manualError, setAbstraxionError] = useState("");
  const [manualAccount, setAbstraxionAccount] = useState<
    SignArbSecp256k1HdWallet | undefined
  >(undefined);
  const [manualGranterAddress, setGranterAddress] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [dashboardUrlOverride, setDashboardUrl] = useState("");

  const authMode: "signer" | "redirect" | "embedded" | "popup" =
    controller instanceof RedirectController
      ? "redirect"
      : controller instanceof SignerController
        ? "signer"
        : normalizedConfig.authentication?.type === "embedded"
          ? "embedded"
          : "popup";

  useEffect(() => {
    const unsubscribe = controller.subscribe(setControllerState);

    controller.initialize().catch((error) => {
      console.error(
        "[AbstraxionProvider] Controller initialization failed:",
        error,
      );
    });

    return () => {
      unsubscribe();
      controller.destroy();
    };
  }, [controller]);

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
    : manualAccount;
  const granterAddress = isConnected
    ? controllerState.account.granterAddress
    : manualGranterAddress;
  const signingClient = isConnected ? controllerState.signingClient : undefined;
  const abstraxionError = isError ? controllerState.error : manualError;
  const dashboardUrl = AccountStateGuards.isRedirecting(controllerState)
    ? controllerState.dashboardUrl
    : dashboardUrlOverride;

  const connectionInfo =
    isConnected &&
    controller instanceof SignerController &&
    controller.getConnectionInfo
      ? controller.getConnectionInfo()
      : undefined;

  const login = useCallback(async () => {
    setAbstraxionError("");
    await controller.connect();
  }, [controller]);

  const logout = useCallback(async () => {
    setAbstraxionError("");
    setAbstraxionAccount(undefined);
    setGranterAddress("");
    await controller.disconnect();
  }, [controller]);

  return (
    <AbstraxionContext.Provider
      value={{
        isConnected,
        setIsConnected: noopBooleanDispatch,
        isConnecting,
        setIsConnecting: noopBooleanDispatch,
        isInitializing,
        isDisconnected,
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
        contracts: normalizedConfig.contracts,
        dashboardUrl,
        setDashboardUrl,
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
        authentication: normalizedConfig.authentication,
        connectionInfo,
        controller,
      }}
    >
      {children}
    </AbstraxionContext.Provider>
  );
}
