/**
 * Account-management specific type extensions
 * These extend the base types from @burnt-labs/signers with additional fields
 * needed for account management operations
 */

import type {
  AuthenticatorInfo as BaseAuthenticatorInfo,
  SmartAccount as BaseSmartAccount,
} from "@burnt-labs/signers";

/**
 * Authenticator with required authenticatorIndex
 * Extends base AuthenticatorInfo with required index field
 */
export interface Authenticator
  extends Omit<BaseAuthenticatorInfo, "authenticatorIndex"> {
  authenticatorIndex: number; // Required in account-management context
}

/**
 * Basic smart account (re-export base type)
 */
export type SmartAccount = BaseSmartAccount;

/**
 * Smart account with required code ID
 * Extends base SmartAccount with required codeId field
 */
export interface SmartAccountWithCodeId
  extends Omit<BaseSmartAccount, "codeId"> {
  codeId: number; // Required in account-management context
  authenticators: Authenticator[]; // Use our stricter Authenticator type
}

/**
 * Smart account with current authenticator selection
 * Used for operations that need to know which authenticator is active
 */
export interface SelectedSmartAccount extends SmartAccountWithCodeId {
  currentAuthenticatorIndex: number;
}
