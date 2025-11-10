/**
 * Types for connection orchestrator
 */

import type { ConnectorConnectionResult } from "@burnt-labs/abstraxion-core";
import type {
  SignArbSecp256k1HdWallet,
  GranteeSignerClient,
} from "@burnt-labs/abstraxion-core";
import type { AccountInfo } from "../state/accountState";
import type {
  SmartAccountContractConfig,
  AccountCreationConfig,
  GrantConfig,
} from "../types";

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
  completeLogin?(): Promise<
    { keypair: SignArbSecp256k1HdWallet; granter: string } | undefined
  >;

  /** Get signing client (optional, for redirect flow) */
  getSigner?(): Promise<GranteeSignerClient>;

  /** Subscribe to auth state changes (optional, for redirect flow) */
  subscribeToAuthStateChange?(
    callback: (isLoggedIn: boolean) => void,
  ): () => void;
}

/**
 * Connection result
 * Return type from orchestrator connection operations
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
 * Uses AccountInfo when restored successfully to avoid duplication
 */
export type SessionRestorationResult =
  | { restored: false }
  | ({ restored: true } & AccountInfo & {
        signingClient?: GranteeSignerClient;
      });

/**
 * Type guard to check if session restoration was successful
 */
export function isSessionRestored(result: SessionRestorationResult): result is {
  restored: true;
} & AccountInfo & {
    signingClient?: GranteeSignerClient;
  } {
  return result.restored === true;
}

/**
 * Extract AccountInfo from a restored session result
 * Throws if session was not restored
 */
export function getAccountInfoFromRestored(
  result: SessionRestorationResult,
): AccountInfo {
  if (!isSessionRestored(result)) {
    throw new Error("Session was not restored");
  }
  return {
    keypair: result.keypair,
    granterAddress: result.granterAddress,
    granteeAddress: result.granteeAddress,
  };
}

// Re-export config types for convenience
export type { SmartAccountContractConfig, AccountCreationConfig, GrantConfig };
