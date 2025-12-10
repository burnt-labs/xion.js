/**
 * AA API v2 types
 * Manually defined types matching the AA-API contract
 *
 * Generated at: 2025-12-10T18:34:35.485Z
 * Source: https://aa-api.xion-testnet-2.burnt.com
 * Schema version: 1.0.0
 */

// Response types
export type AddressResponse = {
  address: string;
  authenticator_type?: string;
};

export type CheckResponse = {
  address: string;
  codeId: number;
  authenticatorType: string;
};

export type CreateAccountResponseV2 = {
  account_address: string;
  code_id: number;
  transaction_hash: string;
};

// Request types
export type CreateEthWalletRequest = {
  address: string;
  signature: string;
};

export type CreateSecp256k1Request = {
  pubkey: string;
  signature: string;
};

export type CreateJWTRequest = {
  jwt: string;
  auth_payload: string;
};

// Account type
export type AccountType = "ethwallet" | "secp256k1" | "jwt";

// Error response
export type ErrorResponse = {
  error: {
    message: string;
    errors?: Array<{ message: string }>;
  };
};
