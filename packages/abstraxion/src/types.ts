import type { AuthenticatorType } from "@burnt-labs/account-management";
import type { ContractGrantDescription, SpendLimit } from "./components/AbstraxionContext";
import type { SmartAccountContractConfig } from "@burnt-labs/account-management";
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
  /** Dashboard URL (optional, will be fetched from RPC if not provided) */
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
   * Auto-connect behavior:
   * - false (default): Manual login required
   * - true: Auto-connect when signer is ready
   */
  autoConnect?: boolean;
  
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
 * If type is not specified, defaults to Numia for backward compatibility
 */
export interface IndexerConfig {
  /** Indexer type - 'numia' (default) or 'subquery' */
  type?: 'numia' | 'subquery';
  /** Indexer URL */
  url: string;
  /** Authentication token (required for Numia, not used for Subquery) */
  authToken?: string;
}

/**
 * Treasury indexer configuration for fetching grant configurations (DaoDao)
 */
export interface TreasuryIndexerConfig {
  url: string;
}

/**
 * Main Abstraxion configuration
 */
export interface AbstraxionConfig {
  /** Chain ID (e.g., 'xion-testnet-1', 'xion-mainnet-1') - REQUIRED */
  chainId: string;

  /** RPC URL for blockchain connection - REQUIRED */
  rpcUrl: string;

  /** REST API endpoint for queries - REQUIRED */
  restUrl: string;

  /** Gas price (e.g., '0.001uxion') - REQUIRED */
  gasPrice: string;

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

