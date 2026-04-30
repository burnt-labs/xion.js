export { AbstraxionProvider } from "./AbstraxionProvider";
export { AbstraxionContext } from "./AbstraxionProvider";
export type { AbstraxionContextProps } from "./AbstraxionProvider";
export type {
  AbstraxionConfig,
  NormalizedAbstraxionConfig,
  IndexerConfig,
  TreasuryIndexerConfig,
} from "@burnt-labs/abstraxion-js";

// Authentication types
export type {
  AuthenticationConfig,
  RedirectAuthentication,
  PopupAuthentication,
  AutoAuthentication,
  SignerAuthentication,
  IframeAuthentication,
  EmbeddedAuthentication,
  SignResult,
  ManageAuthResult,
  SigningClient,
} from "@burnt-labs/abstraxion-js";

// Auto-detection utility for devs who want custom mode resolution
export { isMobileOrStandalone } from "@burnt-labs/abstraxion-js";

export type { OfflineDirectSigner } from "@burnt-labs/abstraxion-js";
export {
  useAbstraxionAccount,
  useAbstraxionSigningClient,
  useAbstraxionClient,
  useManageAuthenticators,
} from "./hooks";

// Hook types
export type { UseManageAuthenticatorsReturn } from "./hooks";
export type {
  UseAbstraxionSigningClientOptions,
  UseAbstraxionSigningClientReturn,
} from "./hooks/useAbstraxionSigningClient";

export type {
  ContractGrantDescription,
  SpendLimit,
} from "@burnt-labs/abstraxion-js";
export type {
  AbstraxionAccount,
  AbstraxionAccountState,
} from "./hooks/useAbstraxionAccount";
export type {
  GranteeSignerClient,
  GrantsResponse,
  Grant,
  TreasuryGrantConfig,
  TransactionOptions,
} from "@burnt-labs/abstraxion-js";

// Re-export IframeMessageType and MessageTarget (enums - both type and value)
export { IframeMessageType, MessageTarget } from "@burnt-labs/abstraxion-js";

// Re-export connector types for convenience (consumers need these when implementing connectors)
export type {
  Connector,
  ConnectorMetadata,
  ConnectorConnectionResult,
  ConnectorConfig,
  SignerConfig,
} from "@burnt-labs/abstraxion-js";
export { ConnectorType } from "@burnt-labs/abstraxion-js";

// Re-export AUTHENTICATOR_TYPE for convenience (consumers often need it when using signer mode)
export { AUTHENTICATOR_TYPE } from "@burnt-labs/abstraxion-js";

// Re-export AAClient for direct signing (consumers need this when using requireAuth: true)
export { AAClient } from "@burnt-labs/abstraxion-js";

// RequireSigningClient — unified client for popup / redirect / iframe direct-signing modes
export { RequireSigningClient } from "@burnt-labs/abstraxion-js";

// IframeController for inline iframe mode (consumers need instanceof check for setContainerElement)
export { IframeController } from "@burnt-labs/abstraxion-js";

// AbstraxionEmbed — drop-in component for embedded mode (no manual controller wiring needed)
export { AbstraxionEmbed } from "./components/AbstraxionEmbed";
export type { AbstraxionEmbedProps } from "./components/AbstraxionEmbed";
