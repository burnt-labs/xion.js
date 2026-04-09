export { AbstraxionProvider } from "./AbstraxionProvider";
export { AbstraxionContext } from "./AbstraxionProvider";
export type { AbstraxionContextProps } from "./AbstraxionProvider";
export type {
  AbstraxionConfig,
  NormalizedAbstraxionConfig,
  IndexerConfig,
  TreasuryIndexerConfig,
} from "./types";

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
  AddAuthResult,
  SigningClient,
} from "./types";

// Auto-detection utility for devs who want custom mode resolution
export { isMobileOrStandalone } from "./utils/resolveAutoAuth";

export type { OfflineDirectSigner } from "@cosmjs/proto-signing";
export {
  useAbstraxionAccount,
  useAbstraxionSigningClient,
  useAbstraxionClient,
  useAddAuthenticators,
} from "./hooks";

// Hook types
export type { UseAddAuthenticatorsReturn } from "./hooks";
export type {
  UseAbstraxionSigningClientOptions,
  UseAbstraxionSigningClientReturn,
} from "./hooks/useAbstraxionSigningClient";

export type {
  ContractGrantDescription,
  SpendLimit,
} from "./AbstraxionProvider";
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
} from "@burnt-labs/abstraxion-core";

// Re-export IframeMessageType and MessageTarget (enums - both type and value)
export { IframeMessageType, MessageTarget } from "@burnt-labs/abstraxion-core";

// Re-export connector types for convenience (consumers need these when implementing connectors)
export type {
  Connector,
  ConnectorMetadata,
  ConnectorConnectionResult,
  ConnectorConfig,
  SignerConfig,
} from "@burnt-labs/abstraxion-core";
export { ConnectorType } from "@burnt-labs/abstraxion-core";

// Re-export AUTHENTICATOR_TYPE for convenience (consumers often need it when using signer mode)
export { AUTHENTICATOR_TYPE } from "@burnt-labs/signers";

// Re-export AAClient for direct signing (consumers need this when using requireAuth: true)
export { AAClient } from "@burnt-labs/signers";

// PopupSigningClient for direct signing in popup mode
export { PopupSigningClient } from "./controllers/PopupSigningClient";

// RedirectSigningClient for direct signing in redirect mode
export { RedirectSigningClient } from "./controllers/RedirectSigningClient";

// IframeSigningClient for direct signing in iframe mode
export { IframeSigningClient } from "./controllers/IframeSigningClient";

// IframeController for inline iframe mode (consumers need instanceof check for setContainerElement)
export { IframeController } from "./controllers/IframeController";

// AbstraxionEmbed — drop-in component for embedded mode (no manual controller wiring needed)
export { AbstraxionEmbed } from "./components/AbstraxionEmbed";
export type { AbstraxionEmbedProps } from "./components/AbstraxionEmbed";
