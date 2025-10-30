import "./styles.css";

export {
  Abstraxion,
  AbstraxionProvider,
  abstraxionAuth,
} from "./components/Abstraxion";
export type {
  AbstraxionConfig,
  IndexerConfig,
  LocalConfig,
  TreasuryIndexerConfig,
} from "./components/Abstraxion";

// New authentication types
export type {
  AuthenticationConfig,
  RedirectAuthentication,
  BrowserWalletAuthentication,
  SignerAuthentication,
  SignerConfig,
  WalletDefinition,
  WalletSelectionProps,
} from "./authentication/types";

// Wallet presets
export {
  BUILT_IN_WALLETS,
  WALLET_PRESETS,
} from "./authentication/wallets";

// Wallet utilities
export {
  detectAvailableWallets,
  autoConnectWallet,
  getWalletFromWindow,
} from "./authentication/utils";

export type { OfflineDirectSigner } from "@cosmjs/proto-signing";
export {
  useAbstraxionAccount,
  useAbstraxionSigningClient,
  useAbstraxionClient,
  useModal,
  useBrowserWallet,
} from "./hooks";

export type { ContractGrantDescription } from "./components/AbstraxionContext";
export type {
  AbstraxionAccount,
  AbstraxionAccountState,
} from "./hooks/useAbstraxionAccount";
export type { BrowserWalletState } from "./hooks/useBrowserWallet";
export type {
  GranteeSignerClient,
  GrantsResponse,
  Grant,
  TreasuryGrantConfig,
  SpendLimit,
} from "@burnt-labs/abstraxion-core";

// Signer mode types
export type {
  SignerConnectionInfo,
  WalletConnectionInfo,
  ConnectionInfo,
} from "./hooks/useWalletAuth";
