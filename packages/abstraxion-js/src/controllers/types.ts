/**
 * Controller interface for managing account connection lifecycle
 * Controllers coordinate between the state machine, orchestrator, and React components
 */

import type {
  AccountState,
  AccountStateAction,
} from "@burnt-labs/account-management";
import type {
  ConnectorConnectionResult,
  RedirectStrategy,
  StorageStrategy,
} from "@burnt-labs/abstraxion-core";
import type { NormalizedAbstraxionConfig } from "../types";

/**
 * State subscription callback
 * Called whenever the state machine transitions to a new state
 */
export type StateSubscription = (state: AccountState) => void;

/**
 * Unsubscribe function returned when subscribing to state changes
 */
export type Unsubscribe = () => void;

/**
 * Controller interface
 * Each mode (redirect, signer, popup, iframe) implements this interface
 */
export interface Controller {
  /**
   * Get the current state
   */
  getState(): AccountState;

  /**
   * Subscribe to state changes
   * @param callback - Function called on every state transition
   * @returns Unsubscribe function
   */
  subscribe(callback: StateSubscription): Unsubscribe;

  /**
   * Dispatch an action to the state machine
   * @param action - State machine action
   */
  dispatch(action: AccountStateAction): void;

  /**
   * Initialize the controller
   * Should attempt to restore session, check redirect callbacks, etc.
   */
  initialize(): Promise<void>;

  /**
   * Connect using the controller's specific flow
   * Mode-specific implementation (redirect, signer, popup, iframe)
   * All controllers currently take no arguments - connection is initiated via this method
   */
  connect(): Promise<void>;

  /**
   * Disconnect and reset state
   */
  disconnect(): Promise<void>;

  /**
   * Get connection info for direct signing (optional)
   * Only available in signer mode after successful connection
   * Returns undefined for redirect/popup/iframe modes
   */
  getConnectionInfo?(): ConnectorConnectionResult | undefined;

  /**
   * Cleanup resources (unsubscribe listeners, etc.)
   */
  destroy(): void;
}

/**
 * Controller configuration
 * Base config that all controllers receive
 */
export interface ControllerConfig {
  /** Chain ID */
  chainId: string;
  /** RPC URL */
  rpcUrl: string;
  /** Gas price */
  gasPrice: string;
  /** Initial state (defaults to 'idle') */
  initialState?: AccountState;
}

/**
 * Platform-specific strategies used by controllers for persistence and redirects.
 */
export interface ControllerStrategies {
  /** Storage strategy (web: localStorage, React Native: AsyncStorage, etc.) */
  storageStrategy: StorageStrategy;
  /** Redirect strategy (web: window.location, React Native: deep linking, etc.) */
  redirectStrategy: RedirectStrategy;
}

/**
 * Controller factory function type
 * Creates a controller instance based on normalized config
 * Matches the signature of createController() in ./factory.ts
 */
export type ControllerFactory = (
  config: NormalizedAbstraxionConfig,
  strategies: ControllerStrategies,
) => Controller;

// ============================================================================
// Signing Client Types
// ============================================================================

import type { EncodeObject } from "@cosmjs/proto-signing";
import type { StdFee, DeliverTxResponse } from "@cosmjs/stargate";
import type { SignAndBroadcastResult } from "@burnt-labs/abstraxion-core";

/**
 * Strategy function passed to RequireSigningClient at construction.
 * Each dashboard transport mode (popup, redirect, iframe) binds its own
 * controller method and passes it here.
 *
 * The return type is a union because popup returns DeliverTxResponse, iframe
 * returns SignAndBroadcastResult (hash only — no full RPC response), and
 * redirect resolves with no value (web: page navigates and never resolves;
 * React Native: WebBrowser session ends and the result is delivered via the
 * controller's signResult store, not as a direct return value).
 */
export type SignAndBroadcastFn = (
  address: string,
  messages: readonly EncodeObject[],
  fee: StdFee | "auto" | number,
  memo?: string,
) => Promise<DeliverTxResponse | SignAndBroadcastResult | void>;
