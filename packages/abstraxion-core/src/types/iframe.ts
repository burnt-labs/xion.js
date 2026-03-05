/**
 * Iframe Communication Types
 * Types for SDK <-> Dashboard iframe communication protocol
 *
 * These types define the message protocol for the embedded iframe authentication flow.
 * They are specific to the MessageChannel communication between the SDK and dashboard iframe.
 */

import type { AuthenticatorType } from "@burnt-labs/signers";

/**
 * Message types for SDK <-> Iframe communication
 */
export enum IframeMessageType {
  IFRAME_READY = "IFRAME_READY",
  CONNECT = "CONNECT",
  DISCONNECT = "DISCONNECT",
  GET_ADDRESS = "GET_ADDRESS",
  SIGN_TRANSACTION = "SIGN_TRANSACTION",
  SIGN_AND_BROADCAST = "SIGN_AND_BROADCAST",
  ADD_AUTHENTICATOR = "ADD_AUTHENTICATOR",
  REMOVE_AUTHENTICATOR = "REMOVE_AUTHENTICATOR",
  REQUEST_GRANT = "REQUEST_GRANT",
  MODAL_STATE_CHANGE = "MODAL_STATE_CHANGE",
}

/**
 * Target identifier for messages
 */
export enum MessageTarget {
  XION_IFRAME = "xion_iframe",
}

/**
 * Generic message structure for iframe communication
 */
export interface IframeMessage<T = unknown> {
  type: IframeMessageType;
  target?: MessageTarget;
  payload?: T;
  requestId?: string;
}

/**
 * Response wrapper for MessageChannel communication
 */
export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Grant parameters for CONNECT message
 */
export interface GrantParams {
  treasuryAddress: string;
  grantee: string;
  contracts?: string[];
  bank?: { denom: string; spend_limit: string }[];
  stake?: boolean;
}

/**
 * Connect payload
 */
export interface ConnectPayload {
  grantParams?: GrantParams;
}

/**
 * Connect response with user's XION address
 */
export interface ConnectResponse {
  address: string;
  balance?: string;
}

/**
 * Transaction data for signing
 * This is a simplified representation for iframe communication
 */
export interface TransactionData {
  messages: Array<{
    typeUrl: string;
    value: unknown;
  }>;
  fee: {
    amount: Array<{
      denom: string;
      amount: string;
    }>;
    gas: string;
    granter?: string;
    payer?: string;
  };
  memo?: string;
}

/**
 * Signed transaction structure
 * Represents a fully signed transaction ready for broadcast
 */
export interface SignedTransaction {
  bodyBytes: Uint8Array;
  authInfoBytes: Uint8Array;
  signatures: Uint8Array[];
}

/**
 * Sign transaction request payload
 */
export interface SignTransactionPayload {
  transaction: TransactionData;
}

/**
 * Sign transaction response
 */
export interface SignTransactionResponse {
  signedTx: SignedTransaction;
}

/**
 * Sign and broadcast response
 */
export interface SignAndBroadcastResponse {
  transactionHash: string;
  height?: number;
  code?: number;
  rawLog?: string;
}

/**
 * Get address response
 */
export interface GetAddressResponse {
  address: string | null;
}

/**
 * Authenticator data structure for iframe communication
 * This is a simplified DTO for transferring authenticator info across the iframe boundary.
 *
 * Note: For full authenticator information with metadata, use AuthenticatorInfo from @burnt-labs/signers
 */
export interface AuthenticatorData {
  id: string;
  type: string;
  authenticator: string;
  authenticatorIndex: number;
}

/**
 * Add authenticator payload
 *
 * Note: The 'type' field uses AuthenticatorType from @burnt-labs/signers.
 * The dashboard's ConnectionMethod provides a superset of authentication methods
 * including social auth options (email, google, apple, discord, twitter).
 */
export interface AddAuthenticatorPayload {
  type?: AuthenticatorType | string; // Allow string for dashboard-specific auth methods
  oAuthToken?: string;
}

/**
 * Add authenticator response
 */
export interface AddAuthenticatorResponse {
  authenticator: AuthenticatorData;
}

/**
 * Remove authenticator payload
 */
export interface RemoveAuthenticatorPayload {
  authenticatorId: number;
}

/**
 * Remove authenticator response
 */
export interface RemoveAuthenticatorResponse {
  success: boolean;
}

/**
 * Request grant payload
 */
export interface RequestGrantPayload {
  treasuryAddress: string;
  grantee: string;
}

/**
 * Request grant response
 */
export interface RequestGrantResponse {
  success: boolean;
}

/**
 * Events emitted by the iframe SDK
 */
export interface IframeSDKEvents {
  /** Fired when user successfully authenticates */
  authenticated: { address: string };
  /** Fired when user disconnects */
  disconnected: Record<string, never>;
  /** Fired when an error occurs */
  error: { error: string; code?: string };
  /** Fired when iframe is ready */
  ready: Record<string, never>;
  /** Fired when an authenticator is added */
  authenticatorAdded: { authenticator: AuthenticatorData };
  /** Fired when an authenticator is removed */
  authenticatorRemoved: { authenticatorId: number };
  /** Fired when a transaction is broadcast */
  transactionBroadcast: SignAndBroadcastResponse;
  /** Fired when treasury grant is successful */
  grantApproved: { treasuryAddress: string };
}
