/**
 * Types for connection orchestrator
 */

import type { ConnectorConnectionResult, SignerConfig } from '@burnt-labs/abstraxion-core';
import type { SignArbSecp256k1HdWallet, GranteeSignerClient } from '@burnt-labs/abstraxion-core';
import type { AuthenticatorType } from '../authenticators';

/**
 * Smart account contract configuration
 * Required for creating new smart accounts in signer mode
 */
export interface SmartAccountContractConfig {
  /** Contract code ID for smart account creation */
  codeId: number;
  
  /** Contract checksum as hex string */
  checksum: string;
  
  /** Address prefix (e.g., "xion") */
  addressPrefix: string;
}

/**
 * Session management interface
 * Abstracts session keypair and granter storage/retrieval
 */
export interface SessionManager {
  /** Get stored session keypair */
  getLocalKeypair(): Promise<SignArbSecp256k1HdWallet | undefined>;
  
  /** Generate and store a new session keypair */
  generateAndStoreTempAccount(): Promise<SignArbSecp256k1HdWallet>;
  
  /** Get stored granter address */
  getGranter(): Promise<string | undefined>;
  
  /** Set granter address */
  setGranter(granter: string): Promise<void>;
  
  /** Verify grants exist on-chain (authenticate) */
  authenticate(): Promise<void>;
  
  /** Clean up session (logout) */
  logout(): Promise<void>;
  
  /** Redirect to dashboard (optional, for redirect flow) */
  redirectToDashboard?(): Promise<void>;
  
  /** Complete login after redirect callback (optional, for redirect flow)
   * Returns { keypair, granter } when login completes successfully, or undefined when redirecting
   */
  completeLogin?(): Promise<{ keypair: SignArbSecp256k1HdWallet; granter: string } | undefined>;
  
  /** Get signing client (optional, for redirect flow) */
  getSigner?(): Promise<GranteeSignerClient>;
  
  /** Subscribe to auth state changes (optional, for redirect flow) */
  subscribeToAuthStateChange?(callback: (isLoggedIn: boolean) => void): () => void;
}

/**
 * Grant creation configuration
 */
export interface GrantConfig {
  /** Treasury contract address (if using treasury-based grants) */
  treasury?: string;
  
  /** Manual contract grant descriptions */
  contracts?: Array<string | { address: string; amounts: Array<{ denom: string; amount: string }> }>;
  
  /** Bank spend limits */
  bank?: Array<{ denom: string; amount: string }>;
  
  /** Enable staking permissions */
  stake?: boolean;
  
  /** Fee granter address */
  feeGranter?: string;
  
  /** DaoDao indexer URL for treasury queries */
  daodaoIndexerUrl?: string;
}

/**
 * Account creation configuration
 * Required for creating new smart accounts when they don't exist
 * Aligned with the grouped config structure used in signer mode
 */
export interface AccountCreationConfig {
  /** AA API URL for account creation */
  aaApiUrl: string;
  
  /** Smart account contract configuration */
  smartAccountContract: SmartAccountContractConfig;
  
  /** Fee granter address (creator) */
  feeGranter: string;
}

/**
 * Connection result
 */
export interface ConnectionResult {
  /** Smart account address (granter) */
  smartAccountAddress: string;
  
  /** Connection info from connector */
  connectionInfo: ConnectorConnectionResult;
  
  /** Session keypair (grantee) */
  sessionKeypair: SignArbSecp256k1HdWallet;
  
  /** Grantee address */
  granteeAddress: string;
  
  /** Signing client (if grants were created) */
  signingClient?: GranteeSignerClient;
}

/**
 * Session restoration result
 */
export interface SessionRestorationResult {
  /** Whether session was restored */
  restored: boolean;
  
  /** Session keypair (if restored) */
  keypair?: SignArbSecp256k1HdWallet;
  
  /** Granter address (if restored) */
  granterAddress?: string;
  
  /** Signing client (if restored) */
  signingClient?: GranteeSignerClient;
}
