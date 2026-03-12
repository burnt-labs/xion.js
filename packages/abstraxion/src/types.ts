import type {
  ContractGrantDescription,
  SpendLimit,
} from "./AbstraxionProvider";
import type {
  SmartAccountContractConfig,
  UserIndexerConfig,
} from "@burnt-labs/account-management";
import type { SignerConfig } from "@burnt-labs/abstraxion-core";

// ============================================================================
// Authentication Types
// ============================================================================

/**
 * Redirect authentication (dashboard OAuth flow)
 * This is the default if no authentication config is provided.
 * Navigates the current page to the auth app and returns with ?granted=true.
 */
export interface RedirectAuthentication {
  type: "redirect";
  /** Callback URL to return to after auth. Defaults to the current page URL. */
  callbackUrl?: string;
  /** Auth app base URL override. Defaults to the chain-specific value from network config. */
  authAppUrl?: string;
}

/**
 * Popup authentication (dashboard OAuth flow in a popup window)
 * The user stays on the dApp page. Auth happens in a separate popup tab which
 * postMessages CONNECT_SUCCESS back to the opener and closes itself.
 */
export interface PopupAuthentication {
  type: "popup";
  /** Auth app base URL override. Defaults to the chain-specific value from network config. */
  authAppUrl?: string;
}

/**
 * Signer authentication (session signers like Turnkey, Privy, Web3Auth, etc. or even direct wallets like MetaMask, Keplr, etc.)
 *
 * All signer-mode specific configuration is grouped here for clarity
 */
export interface SignerAuthentication {
  type: "signer";

  /** AA API URL for account creation */
  aaApiUrl: string;

  /**
   * Function that returns signer configuration
   * Called when user initiates connection
   * Should wait for external auth provider to be ready
   */
  getSignerConfig: () => Promise<SignerConfig>;

  /**
   * Smart account contract configuration
   * Required for creating new smart accounts when they don't exist
   */
  smartAccountContract: SmartAccountContractConfig;

  /**
   * Indexer configuration for querying existing smart accounts
   * Supports Numia or Subquery indexers for fast account discovery
   * Optional - falls back to RPC queries if not provided
   */
  indexer?: IndexerConfig;

  /**
   * Treasury indexer configuration for fetching grant configurations (DaoDao)
   * Uses DaoDao indexer for fast treasury queries
   * Optional - falls back to direct RPC queries if not provided
   */
  treasuryIndexer?: TreasuryIndexerConfig;
}

/**
 * Auto authentication — resolves to popup on desktop, redirect on mobile/PWA.
 * The resolution happens during config normalization so all downstream code
 * (controllers, hooks, provider) only ever sees "popup" or "redirect".
 */
export interface AutoAuthentication {
  type: "auto";
  /** Auth app base URL override (used by both popup and redirect paths). */
  authAppUrl?: string;
  /** Callback URL for the redirect fallback. Defaults to the current page URL. */
  callbackUrl?: string;
}

/**
 * Iframe authentication (inline embedded dashboard iframe)
 *
 * Renders the full dashboard app inside an inline iframe. The dApp controls
 * sizing and positioning via the containerElement's CSS.
 *
 * The iframe handles login, grant approval, and shows a minimal "Connected"
 * state after auth. Communication uses MessageChannelManager for request-response
 * (CONNECT, DISCONNECT) with targetOrigin enforcement. The only raw postMessage
 * is the push-direction DISCONNECTED event from the iframe.
 */
export interface EmbeddedAuthentication {
  type: "embedded";
  /** Dashboard URL for the embedded view. Defaults to chain-specific value from constants. */
  iframeUrl?: string;
  /**
   * DOM element to mount the embedded view in. The iframe fills 100% width/height
   * of this container — control sizing via the container's CSS.
   * Not needed when using the <AbstraxionEmbed> component.
   */
  containerElement?: HTMLElement;
}

/**
 * @deprecated Use `EmbeddedAuthentication` instead. Will be removed in a future version.
 */
export type IframeAuthentication = EmbeddedAuthentication;

/**
 * Authentication configuration - defines how users authenticate
 * Type-safe union ensures only compatible options can be combined
 */
export type AuthenticationConfig =
  | RedirectAuthentication
  | PopupAuthentication
  | AutoAuthentication
  | SignerAuthentication
  | EmbeddedAuthentication;

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Indexer configuration for querying existing accounts (Numia or Subquery)
 * Discriminated union supporting both indexer types
 * If type is not specified, defaults to Numia for backward compatibility
 *
 * Note: For Subquery indexers, codeId is derived from smartAccountContract.codeId
 * and does not need to be provided here.
 *
 * Re-exported from @burnt-labs/account-management for consistency across packages
 */
export type IndexerConfig = UserIndexerConfig;

/**
 * Treasury indexer configuration for fetching grant configurations (DaoDao)
 */
export interface TreasuryIndexerConfig {
  url: string;
}

/**
 * Main Abstraxion configuration
 *
 * Note: rpcUrl, restUrl, and gasPrice are optional and will be automatically filled in by normalizeAbstraxionConfig()
 * based on chainId. Only provide these if you're using a custom network or need to override defaults.
 */
export interface AbstraxionConfig {
  /** Chain ID (e.g., 'xion-testnet-1', 'xion-mainnet-1') - REQUIRED */
  chainId: string;

  /**
   * RPC URL for blockchain connection (optional, defaults to chainId-based value from constants).
   * Only provide if using a custom network or need to override the default.
   */
  rpcUrl?: string;

  /**
   * REST API endpoint for queries (optional, defaults to chainId-based value from constants).
   * Only provide if using a custom network or need to override the default.
   */
  restUrl?: string;

  /**
   * Gas price (e.g., '0.001uxion') - Optional, defaults to xionGasValues.gasPrice from constants.
   * Only provide if you need to override the default gas price.
   */
  gasPrice?: string;

  /** Treasury contract address for grant configurations */
  treasury?: string;

  /** Fee granter address that pays transaction fees for grant creation */
  feeGranter?: string;

  /** Contract grant configurations (if not using treasury) */
  contracts?: ContractGrantDescription[];

  /** Enable staking grants */
  stake?: boolean;

  /** Bank spend limits */
  bank?: SpendLimit[];

  /**
   * Authentication configuration
   * Defines how users authenticate (OAuth/redirect, signer, or browser wallet)
   * If omitted, defaults to redirect flow
   */
  authentication?: AuthenticationConfig;
}

/**
 * Normalized Abstraxion configuration
 * This type represents the config after normalization, where optional fields have been filled in
 */
export interface NormalizedAbstraxionConfig
  extends Omit<AbstraxionConfig, "rpcUrl" | "restUrl" | "gasPrice"> {
  /** RPC URL - always present after normalization */
  rpcUrl: string;
  /** REST URL - always present after normalization */
  restUrl: string;
  /** Gas price - always present after normalization */
  gasPrice: string;
}

// ============================================================================
// Signing Client Types
// ============================================================================

// Re-import concrete client types so we can build the union here.
// Consumers should use `SigningClient` instead of building the union themselves.
import type { GranteeSignerClient } from "@burnt-labs/abstraxion-core";
import type { AAClient } from "@burnt-labs/signers";
import type { PopupSigningClient } from "./controllers/PopupSigningClient";
import type { RedirectSigningClient } from "./controllers/RedirectSigningClient";
import type { IframeSigningClient } from "./controllers/IframeSigningClient";

/**
 * Union of all signing client types returned by `useAbstraxionSigningClient`.
 *
 * Import this instead of importing individual client types:
 * ```ts
 * import type { SigningClient } from "@burnt-labs/abstraxion";
 * ```
 *
 * Which concrete type you get depends on the authentication mode and `requireAuth`:
 * - `GranteeSignerClient` — session key signing (default, gasless)
 * - `AAClient` — direct signing in signer mode (external wallet)
 * - `PopupSigningClient` — direct signing in popup mode (dashboard popup)
 * - `RedirectSigningClient` — direct signing in redirect mode (dashboard redirect)
 * - `IframeSigningClient` — direct signing in iframe mode (dashboard iframe)
 */
export type SigningClient =
  | GranteeSignerClient
  | AAClient
  | PopupSigningClient
  | RedirectSigningClient
  | IframeSigningClient;

// ============================================================================
// Signing Result Types
// ============================================================================

/**
 * Result from a redirect-based signing flow.
 * Populated after returning from the dashboard signing redirect.
 */
export type SignResult =
  | { success: true; transactionHash: string }
  | { success: false; error: string };
