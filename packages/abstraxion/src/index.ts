export { AbstraxionProvider } from "./AbstraxionProvider";
export { AbstraxionContext } from "./AbstraxionProvider";
export type { AbstraxionContextProps } from "./AbstraxionProvider";
export type {
  AbstraxionConfig,
  NormalizedAbstraxionConfig,
  IndexerConfig,
  TreasuryIndexerConfig,
} from "./types";

// New authentication types
export type {
  AuthenticationConfig,
  RedirectAuthentication,
  SignerAuthentication,
} from "./types";

export type { OfflineDirectSigner } from "@cosmjs/proto-signing";
export {
  useAbstraxionAccount,
  useAbstraxionSigningClient,
  useAbstraxionClient,
} from "./hooks";

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
} from "@burnt-labs/abstraxion-core";

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
