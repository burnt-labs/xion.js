/**
 * Types for AA API v2 interactions
 * These types define the request and response structures for the Account Abstraction API v2
 */

import type { AUTHENTICATOR_TYPE } from "../crypto/salt";

/**
 * Response from AA API v2 /account/address endpoint
 */
export interface AddressResponse {
  address: string;
  authenticator_type?: string;
}

/**
 * Response from AA API v2 /account/check endpoint
 */
export interface CheckResponse {
  address: string;
  codeId: number;
  authenticatorType: string;
}

/**
 * Request for AA API v2 /accounts/create endpoint (EthWallet)
 */
export interface CreateEthWalletRequest {
  address: string;
  signature: string;
}

/**
 * Request for AA API v2 /accounts/create endpoint (Secp256k1)
 */
export interface CreateSecp256k1Request {
  pubkey: string;
  signature: string;
}

/**
 * Request for AA API v2 /accounts/create endpoint (JWT)
 */
export interface CreateJWTRequest {
  jwt: string;
  auth_payload: string; // session_token or session_jwt
}

/**
 * Response from AA API v2 /accounts/create endpoint
 */
export interface CreateAccountResponse {
  account_address: string;
  code_id: number;
  transaction_hash: string;
}

/**
 * Account authenticator type for API endpoints
 * Derived from AuthenticatorType, filtered to API-supported types and converted to lowercase
 */
export type AccountType = Lowercase<
  | typeof AUTHENTICATOR_TYPE.EthWallet
  | typeof AUTHENTICATOR_TYPE.Secp256K1
  | typeof AUTHENTICATOR_TYPE.JWT
>;

