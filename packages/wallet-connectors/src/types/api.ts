/**
 * Copy from: _extract_from/xion-dashboard-app/src/types/
 *
 * Types to copy:
 * - AA API request types (PrepareRequest, CreateRequest, etc.)
 * - AA API response types (PrepareResponse, CreateResponse, etc.)
 * - Error response types
 * - Any API-specific type definitions
 */

// Placeholder - copy types from dashboard

export interface PrepareSignatureRequest {
  wallet_type: WalletType;
  address?: string; // Required for EthWallet
  pubkey?: string; // Required for Secp256K1
}

export interface PrepareSignatureResponse {
  message_to_sign: string;
  predicted_address: string;
  salt: string;
  wallet_type: string;
  metadata: {
    action: string;
    wallet_type: string;
    address?: string;
    pubkey?: string;
    timestamp: number;
  };
}

export interface CreateWalletAccountRequest {
  salt: string;
  wallet_type: WalletType;
  address?: string; // Required for EthWallet
  pubkey?: string; // Required for Secp256K1
  signature: string;
  message: string; // JSON stringified metadata
}

export interface CreateWalletAccountResponse {
  account_address: string;
  code_id: number;
  transaction_hash: string;
}
