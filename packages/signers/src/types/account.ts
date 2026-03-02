/**
 * Account-related type definitions
 * These are the domain types for XION smart accounts
 *
 * These types are the source of truth and are re-exported by account-abstraction-api
 * for API compatibility.
 */

/**
 * Supported authenticator types for XION smart accounts
 */
export type AuthenticatorType =
  | "EthWallet"
  | "Secp256K1"
  | "Ed25519"
  | "JWT"
  | "Passkey"
  | "Sr25519"
  | "ZKEmail";

/**
 * Authenticator type constants
 * Use these instead of string literals to avoid typos and ensure type safety
 */
export const AUTHENTICATOR_TYPE = Object.freeze({
  EthWallet: "EthWallet" as const, // Ethereum wallets (MetaMask, Rainbow, etc.)
  Secp256K1: "Secp256K1" as const, // Cosmos wallets (Keplr, Leap, OKX, etc.)
  Ed25519: "Ed25519" as const, // Ed25519 curve wallets (Solana, etc.)
  JWT: "JWT" as const, // Social logins (Google, Stytch, etc.)
  Passkey: "Passkey" as const, // WebAuthn/Passkey
  Sr25519: "Sr25519" as const, // Sr25519 curve (Polkadot, etc.)
  ZKEmail: "ZKEmail" as const, // Zero-knowledge email (DKIM) verification
});

/**
 * Individual authenticator information
 */
export interface AuthenticatorInfo {
  id: string;
  type: AuthenticatorType;
  authenticator: string;
  authenticatorIndex?: number;
  addedAt?: number;
  lastUsed?: number;
}

/**
 * Smart account representation
 */
export interface SmartAccount {
  id: string;
  authenticators: AuthenticatorInfo[];
  codeId?: number;
  createdAt?: string;
  transactionHash?: string;
}

/**
 * Contract information
 */
export interface ContractInfo {
  address: string;
  codeId: number;
  creator: string;
  admin?: string;
  label: string;
}
