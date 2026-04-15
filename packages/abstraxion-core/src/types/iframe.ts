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
  /** Soft disconnect: SDK is detaching — dashboard can update its UI but session survives. */
  DISCONNECT = "DISCONNECT",
  /** Hard disconnect: SDK requests full session clear on the dashboard side. */
  HARD_DISCONNECT = "HARD_DISCONNECT",
  GET_ADDRESS = "GET_ADDRESS",
  SIGN_TRANSACTION = "SIGN_TRANSACTION",
  SIGN_AND_BROADCAST = "SIGN_AND_BROADCAST",
  MANAGE_AUTHENTICATORS = "MANAGE_AUTHENTICATORS",
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
 * Push-direction message types: Dashboard → SDK (postMessage, not MessageChannel)
 *
 * These are sent via window.postMessage from the dashboard to the SDK in popup,
 * redirect, and embedded iframe modes. They carry authentication/signing results
 * back to the SDK after the user completes (or cancels) an action in the dashboard.
 */
export enum DashboardMessageType {
  // Iframe push events
  IFRAME_READY = "IFRAME_READY",
  /** User clicked disconnect inside the dashboard iframe — full session clear. */
  HARD_DISCONNECT = "HARD_DISCONNECT",
  // Popup/redirect connect results
  CONNECT_SUCCESS = "CONNECT_SUCCESS",
  CONNECT_REJECTED = "CONNECT_REJECTED",
  // Popup/redirect transaction signing results
  SIGN_SUCCESS = "SIGN_SUCCESS",
  SIGN_REJECTED = "SIGN_REJECTED",
  SIGN_ERROR = "SIGN_ERROR",
  // Popup/redirect manage-authenticators results
  MANAGE_AUTHENTICATORS_SUCCESS = "MANAGE_AUTHENTICATORS_SUCCESS",
  MANAGE_AUTHENTICATORS_REJECTED = "MANAGE_AUTHENTICATORS_REJECTED",
  MANAGE_AUTHENTICATORS_ERROR = "MANAGE_AUTHENTICATORS_ERROR",
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
  signerAddress: string;
}

/**
 * Sign transaction response
 */
export interface SignTransactionResponse {
  signedTx: SignedTransaction;
}

/**
 * Result returned over MessageChannel after the dashboard signs and broadcasts a transaction.
 * Only the transaction hash is returned — query the chain RPC for the full DeliverTxResponse.
 */
export interface SignAndBroadcastResult {
  transactionHash: string;
}

/**
 * Payload carried by the `transactionBroadcast` iframe event.
 * This is a lightweight notification shape — it is NOT the full
 * CosmJS DeliverTxResponse returned by signAndBroadcastWithMetaAccount.
 */
export interface TransactionBroadcastEvent {
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
 * Manage authenticators payload
 *
 * Note: The 'type' field uses AuthenticatorType from @burnt-labs/signers.
 * The dashboard's ConnectionMethod provides a superset of authentication methods
 * including social auth options (email, google, apple, discord, twitter).
 */
export interface ManageAuthenticatorsPayload {
  type?: AuthenticatorType | string; // Allow string for dashboard-specific auth methods
  oAuthToken?: string;
}

/**
 * Manage authenticators response
 */
export interface ManageAuthenticatorsResponse {
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
  transactionBroadcast: TransactionBroadcastEvent;
  /** Fired when treasury grant is successful */
  grantApproved: { treasuryAddress: string };
}
