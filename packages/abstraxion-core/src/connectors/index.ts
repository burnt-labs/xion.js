/**
 * Connector system exports
 *
 * Note: CosmosWalletConnector and EthereumWalletConnector have been removed.
 * See demo-app/src/app/direct-mode/connectors for example implementations.
 */

export * from "./types";
export * from "./ExternalSignerConnector";
export * from "./ConnectorRegistry";
// Re-export AUTHENTICATOR_TYPE to break circular dependency with test-utils
export { AUTHENTICATOR_TYPE, type AuthenticatorType } from "@burnt-labs/signers";
