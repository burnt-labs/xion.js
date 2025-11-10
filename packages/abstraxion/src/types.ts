import type { ContractGrantDescription, SpendLimit } from "./components/AbstraxionContext";
import type { SmartAccountContractConfig, UserIndexerConfig } from "@burnt-labs/account-management";
import type { SignerConfig } from "@burnt-labs/abstraxion-core";

// ============================================================================
// Authentication Types
// ============================================================================

/**
 * Redirect authentication (dashboard OAuth flow)
 * This is the default if no authentication config is provided
 */
export interface RedirectAuthentication {
  type: "redirect";
  /** 
   * Dashboard URL (optional, only needed for custom networks not in the constants map).
   * For standard networks (xion-mainnet-1, xion-testnet-1), the dashboard URL is automatically
   * fetched from RPC based on the network ID. Only provide this if you're using a custom
   * network or a custom dashboard deployment.
   */
  dashboardUrl?: string;
  callbackUrl?: string;
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
 * Authentication configuration - defines how users authenticate
 * Type-safe union ensures only compatible options can be combined
 */
export type AuthenticationConfig =
  | RedirectAuthentication
  | SignerAuthentication;

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
export interface NormalizedAbstraxionConfig extends Omit<AbstraxionConfig, 'rpcUrl' | 'restUrl' | 'gasPrice'> {
  /** RPC URL - always present after normalization */
  rpcUrl: string;
  /** REST URL - always present after normalization */
  restUrl: string;
  /** Gas price - always present after normalization */
  gasPrice: string;
}

