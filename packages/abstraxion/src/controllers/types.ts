/**
 * Controller interface for managing account connection lifecycle
 * Controllers coordinate between the state machine, orchestrator, and React components
 */

import type { AccountState, AccountStateAction } from '@burnt-labs/account-management';
import type { NormalizedAbstraxionConfig } from '../types';

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
 * Each mode (redirect, signer, direct) implements this interface
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
   * Mode-specific implementation (redirect, signer, direct)
   * All controllers currently take no arguments - connection is initiated via this method
   */
  connect(): Promise<void>;

  /**
   * Disconnect and reset state
   */
  disconnect(): Promise<void>;

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
 * Controller factory function type
 * Creates a controller instance based on normalized config
 * Matches the signature of createController() in utils/controllerFactory.ts
 */
export type ControllerFactory = (
  config: NormalizedAbstraxionConfig,
) => Controller;

