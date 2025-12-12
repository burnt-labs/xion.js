/**
 * Base controller implementation with state subscription
 * Abstract class that controllers can extend
 */

import { accountStateReducer } from "@burnt-labs/account-management";
import type {
  AccountState,
  AccountStateAction,
} from "@burnt-labs/account-management";
import type { Controller, StateSubscription, Unsubscribe } from "./types";

/**
 * Base controller implementation
 * Provides state management and subscription mechanism
 */
export abstract class BaseController implements Controller {
  private state: AccountState;
  private subscribers: Set<StateSubscription> = new Set();

  constructor(initialState: AccountState = { status: "idle" }) {
    this.state = initialState;
  }

  /**
   * Get the current state
   */
  getState(): AccountState {
    return this.state;
  }

  /**
   * Subscribe to state changes
   * @param callback - Function called on every state transition
   * @returns Unsubscribe function
   */
  subscribe(callback: StateSubscription): Unsubscribe {
    this.subscribers.add(callback);

    // Immediately call with current state (with error boundary)
    this.notifySubscriber(callback, this.state);

    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Dispatch an action to the state machine
   * @param action - State machine action
   */
  dispatch(action: AccountStateAction): void {
    const newState = accountStateReducer(this.state, action);
    this.setState(newState);
  }

  /**
   * Set state and notify subscribers
   * @param newState - New state to set
   */
  protected setState(newState: AccountState): void {
    this.state = newState;
    // Notify all subscribers (with error boundaries)
    this.subscribers.forEach((callback) => {
      this.notifySubscriber(callback, newState);
    });
  }

  /**
   * Safely notify a single subscriber with error boundary
   * Logs errors without disrupting other subscribers
   * @param callback - Subscriber callback
   * @param state - Current state to pass to callback
   */
  private notifySubscriber(
    callback: StateSubscription,
    state: AccountState,
  ): void {
    try {
      callback(state);
    } catch (error) {
      console.error("[BaseController] Error in state subscriber:", error);
      // Continue execution - don't let one bad subscriber break others
    }
  }

  /**
   * Initialize the controller
   * Should attempt to restore session, check redirect callbacks, etc.
   */
  abstract initialize(): Promise<void>;

  /**
   * Connect using the controller's specific flow
   * Mode-specific implementation (redirect, signer, direct)
   * All controllers currently take no arguments - connection is initiated via this method
   */
  abstract connect(): Promise<void>;

  /**
   * Disconnect and reset state
   */
  abstract disconnect(): Promise<void>;

  /**
   * Cleanup resources (unsubscribe listeners, etc.)
   */
  destroy(): void {
    this.subscribers.clear();
  }
}
