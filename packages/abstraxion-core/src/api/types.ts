/**
 * Types for AA API interactions
 */

/**
 * Response from AA API /prepare endpoint
 */
export interface PrepareResponse {
  message_to_sign: string;
  salt: string;
  metadata: any;
}

/**
 * Response from AA API /create endpoint
 */
export interface CreateAccountResponse {
  account_address: string;
  code_id: number;
  transaction_hash: string;
}

/**
 * Request for AA API /prepare endpoint
 */
export interface PrepareRequest {
  wallet_type: 'EthWallet' | 'Secp256K1';
  address?: string; // For EthWallet
  pubkey?: string;  // For Secp256K1
}

/**
 * Request for AA API /create endpoint
 */
export interface CreateAccountRequest {
  wallet_type: 'EthWallet' | 'Secp256K1';
  address?: string; // For EthWallet
  pubkey?: string;  // For Secp256K1
  signature: string;
  salt: string;
  message: string;
}

