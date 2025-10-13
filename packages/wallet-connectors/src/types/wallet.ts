/**
 * Copy from: _extract_from/xion-dashboard-app/src/types/
 *
 * Types to copy:
 * - WalletType enum/union
 * - WalletConnection interface
 * - EthereumProvider interface
 * - Keplr/Leap/OKX wallet interfaces
 * - Any wallet-specific type definitions
 */

// Placeholder - copy types from dashboard

/**
 * Types for wallet-based smart account creation
 */

export type WalletType = "EthWallet" | "Secp256K1";

export interface WalletConnectionInfo {
  type: WalletType;
  address?: string; // Wallet address (for display)
  pubkey?: string; // Public key hex
  identifier: string; // What gets stored as authenticator
}
