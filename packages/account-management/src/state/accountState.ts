/**
 * Account state machine types
 * Defines the lifecycle states for account connection and management
 * Shared between @abstraxion and @abstraxion-react-native
 */

import type { SignArbSecp256k1HdWallet } from "@burnt-labs/abstraxion-core";
import type { GranteeSignerClient } from "@burnt-labs/abstraxion-core";

/**
 * Account information when connected
 */
export interface AccountInfo {
  /** The session keypair (grantee) */
  keypair: SignArbSecp256k1HdWallet;
  /** The smart account address (granter) */
  granterAddress: string;
  /** The grantee address (session key address) */
  granteeAddress: string;
}

/**
 * Account state machine states
 * Represents the lifecycle: idle → initializing → redirecting → connecting → configuring-permissions → connected
 *
 * Note: The 'configuring-permissions' status represents setting up session permissions/authorization,
 * not creating the session key itself (which happens during connecting).
 */
export type AccountState =
  | { status: "idle" }
  | { status: "initializing" }
  | { status: "redirecting"; dashboardUrl: string }
  | { status: "connecting"; connectorId?: string }
  | { status: "configuring-permissions"; smartAccountAddress: string }
  | {
      status: "connected";
      account: AccountInfo;
      signingClient: GranteeSignerClient;
    }
  | { status: "error"; error: string };

/**
 * State transition actions
 */
export type AccountStateAction =
  | { type: "INITIALIZE" }
  | { type: "START_REDIRECT"; dashboardUrl: string }
  | { type: "START_CONNECT"; connectorId?: string }
  | { type: "START_CONFIGURING_PERMISSIONS"; smartAccountAddress: string }
  | {
      type: "SET_CONNECTED";
      account: AccountInfo;
      signingClient: GranteeSignerClient;
    }
  | { type: "SET_ERROR"; error: string }
  | { type: "RESET" };

/**
 * State transition guard functions
 */
export const AccountStateGuards = {
  /** Check if state is idle */
  isIdle: (state: AccountState): state is { status: "idle" } =>
    state.status === "idle",

  /** Check if state is initializing */
  isInitializing: (state: AccountState): state is { status: "initializing" } =>
    state.status === "initializing",

  /** Check if state is redirecting */
  isRedirecting: (
    state: AccountState,
  ): state is { status: "redirecting"; dashboardUrl: string } =>
    state.status === "redirecting",

  /** Check if state is connecting */
  isConnecting: (
    state: AccountState,
  ): state is { status: "connecting"; connectorId?: string } =>
    state.status === "connecting",

  /** Check if state is configuring permissions for the session */
  isConfiguringPermissions: (
    state: AccountState,
  ): state is {
    status: "configuring-permissions";
    smartAccountAddress: string;
  } => state.status === "configuring-permissions",

  /** Check if state is connected (ready to use) */
  isConnected: (
    state: AccountState,
  ): state is {
    status: "connected";
    account: AccountInfo;
    signingClient: GranteeSignerClient;
  } => state.status === "connected",

  /** Check if state is error */
  isError: (state: AccountState): state is { status: "error"; error: string } =>
    state.status === "error",
};

/**
 * State reducer function
 * Handles state transitions based on actions
 */
export function accountStateReducer(
  state: AccountState,
  action: AccountStateAction,
): AccountState {
  // Handle null/undefined actions gracefully
  if (!action || typeof action !== "object" || !("type" in action)) {
    return state;
  }

  switch (action.type) {
    case "INITIALIZE":
      return { status: "initializing" };

    case "START_REDIRECT":
      return { status: "redirecting", dashboardUrl: action.dashboardUrl };

    case "START_CONNECT":
      return { status: "connecting", connectorId: action.connectorId };

    case "START_CONFIGURING_PERMISSIONS":
      return {
        status: "configuring-permissions",
        smartAccountAddress: action.smartAccountAddress,
      };

    case "SET_CONNECTED":
      return {
        status: "connected",
        account: action.account,
        signingClient: action.signingClient,
      };

    case "SET_ERROR":
      return { status: "error", error: action.error };

    case "RESET":
      return { status: "idle" };

    default:
      return state;
  }
}

/**
 * Helper to check if a transition is valid
 */
export function isValidTransition(
  from: AccountState,
  to: AccountStateAction["type"],
): boolean {
  // Allow reset from any state
  if (to === "RESET") {
    return true;
  }

  // Allow initialize from idle
  if (to === "INITIALIZE" && from.status === "idle") {
    return true;
  }

  // Allow redirect from initializing
  if (to === "START_REDIRECT" && from.status === "initializing") {
    return true;
  }

  // Allow connect from initializing or idle
  if (
    to === "START_CONNECT" &&
    (from.status === "initializing" || from.status === "idle")
  ) {
    return true;
  }

  // Allow start configuring permissions from connecting
  if (to === "START_CONFIGURING_PERMISSIONS" && from.status === "connecting") {
    return true;
  }

  // Allow set connected from configuring-permissions or connecting (if no permissions needed)
  if (
    to === "SET_CONNECTED" &&
    (from.status === "configuring-permissions" || from.status === "connecting")
  ) {
    return true;
  }

  // Allow set error from any non-terminal state
  if (
    to === "SET_ERROR" &&
    from.status !== "connected" &&
    from.status !== "error"
  ) {
    return true;
  }

  return false;
}
