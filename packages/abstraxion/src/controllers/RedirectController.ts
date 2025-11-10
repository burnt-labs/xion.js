/**
 * Redirect Controller
 * OAuth flow via dashboard (redirect mode)
 * Wraps AbstraxionAuth.login() flow and handles redirect callbacks
 */

import { AbstraxionAuth } from "@burnt-labs/abstraxion-core";
import type {
  StorageStrategy,
  RedirectStrategy,
} from "@burnt-labs/abstraxion-core";
import { ConnectionOrchestrator } from "@burnt-labs/account-management";
import type { AccountInfo } from "@burnt-labs/account-management";
import { BaseController } from "./BaseController";
import type { ControllerConfig } from "./types";
import type { RedirectAuthentication } from "../types";

/**
 * Configuration for RedirectController
 */
export interface RedirectControllerConfig extends ControllerConfig {
  /** Redirect authentication config */
  redirect: RedirectAuthentication;

  /** Storage strategy (web: localStorage, React Native: AsyncStorage) */
  storageStrategy: StorageStrategy;

  /** Redirect strategy (web: window.location, React Native: deep linking) */
  redirectStrategy: RedirectStrategy;

  /** Treasury address (optional, passed to dashboard for grant configuration) */
  treasury?: string;

  /** Bank spend limits (optional, passed to dashboard for grant configuration) */
  bank?: Array<{ denom: string; amount: string }>;

  /** Enable staking permissions (optional, passed to dashboard for grant configuration) */
  stake?: boolean;

  /** Contract grant descriptions (optional, passed to dashboard for grant configuration) */
  contracts?: Array<
    | string
    | { address: string; amounts: Array<{ denom: string; amount: string }> }
  >;
}

/**
 * Check if we're currently returning from a redirect callback
 * This is a synchronous check of URL params, useful for immediate UI state
 * @returns true if URL contains granted=true parameter
 */
function isReturningFromRedirect(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get("granted") === "true";
}

/**
 * Redirect Controller
 * Handles OAuth flow via dashboard redirect
 */
export class RedirectController extends BaseController {
  private config: RedirectControllerConfig;
  private abstraxionAuth: AbstraxionAuth;
  private orchestrator: ConnectionOrchestrator;

  constructor(config: RedirectControllerConfig) {
    // Always start in 'initializing' state for consistent SSR/client behavior
    // This ensures UI immediately shows loading state and doesn't assume readiness
    // The initialize() method will handle transitioning to connecting if returning from auth
    super(config.initialState || { status: "initializing" });
    this.config = config;

    // Create AbstraxionAuth instance
    this.abstraxionAuth = new AbstraxionAuth(
      config.storageStrategy,
      config.redirectStrategy,
    );

    // Configure AbstraxionAuth
    this.abstraxionAuth.configureAbstraxionInstance(
      config.rpcUrl,
      config.contracts, // Pass contracts if provided
      config.stake, // Pass stake if provided
      config.bank, // Pass bank (or minimal fallback) if provided
      config.redirect.callbackUrl,
      config.treasury, // Pass treasury so it's included in redirect URL
      // indexerUrl, indexerAuthToken, treasuryIndexerUrl omitted - not used in redirect mode
      config.gasPrice, // Pass gasPrice for signing client creation
      config.redirect.dashboardUrl, // Pass dashboardUrl if provided (for custom networks)
    );

    // Create grant config
    const grantConfig =
      config.treasury || config.contracts || config.bank || config.stake
        ? {
            treasury: config.treasury,
            contracts: config.contracts,
            bank: config.bank,
            stake: config.stake,
          }
        : undefined;

    // Create orchestrator with AbstraxionAuth as sessionManager
    this.orchestrator = new ConnectionOrchestrator({
      sessionManager: this.abstraxionAuth, // AbstraxionAuth implements SessionManager + redirect methods
      storageStrategy: config.storageStrategy,
      grantConfig,
      chainId: config.chainId,
      rpcUrl: config.rpcUrl,
      gasPrice: config.gasPrice,
    });
  }

  /**
   * Check if we're currently returning from a redirect callback
   * This is a synchronous check of URL params, useful for immediate UI state
   * @returns true if URL contains granted=true parameter
   */
  isReturningFromRedirect(): boolean {
    return isReturningFromRedirect();
  }

  /**
   * Initialize the controller
   * Checks for redirect callback, attempts to restore session
   */
  async initialize(): Promise<void> {
    // Check if we're returning from dashboard redirect FIRST
    // If so, transition from initializing to connecting
    if (this.isReturningFromRedirect()) {
      // We're returning from dashboard - handle callback
      // Transition from initializing to connecting
      this.dispatch({ type: "START_CONNECT" });

      // Use orchestrator to complete redirect flow
      const result = await this.orchestrator.completeRedirect();

      if (!result.keypair || !result.granterAddress || !result.signingClient) {
        throw new Error("Failed to complete redirect flow");
      }

      const accounts = await result.keypair.getAccounts();
      const granteeAddress = accounts[0].address;

      const accountInfo: AccountInfo = {
        keypair: result.keypair,
        granterAddress: result.granterAddress,
        granteeAddress,
      };

      this.dispatch({
        type: "SET_CONNECTED",
        account: accountInfo,
        signingClient: result.signingClient,
      });

      return;
    }

    // Not a redirect callback - normal initialization flow
    // Already in initializing state, so no need to dispatch INITIALIZE
    // Just proceed with session restoration

    try {
      // Try to restore session using orchestrator (with signing client creation)
      const restorationResult = await this.orchestrator.restoreSession(true);

      if (restorationResult.restored && restorationResult.signingClient) {
        // Session restored successfully - restorationResult contains AccountInfo fields when restored: true
        const accountInfo: AccountInfo = {
          keypair: (restorationResult as { restored: true } & AccountInfo)
            .keypair,
          granterAddress: (
            restorationResult as { restored: true } & AccountInfo
          ).granterAddress,
          granteeAddress: (
            restorationResult as { restored: true } & AccountInfo
          ).granteeAddress,
        };

        this.dispatch({
          type: "SET_CONNECTED",
          account: accountInfo,
          signingClient: restorationResult.signingClient,
        });
        return;
      }

      // No session to restore - transition to idle
      this.dispatch({ type: "RESET" });
    } catch (error) {
      console.error("[RedirectController] Initialization error:", error);
      // Transition to idle on error (don't stay in initializing)
      this.dispatch({ type: "RESET" });
    }
  }

  /**
   * Connect by redirecting to dashboard
   * Uses orchestrator to initiate redirect flow
   */
  async connect(): Promise<void> {
    if (this.getState().status === "connected") {
      console.warn("[RedirectController] Already connected");
      return;
    }

    try {
      // Use orchestrator to initiate redirect (generates keypair and redirects)
      const { dashboardUrl } = await this.orchestrator.initiateRedirect();

      // Dispatch redirecting state
      this.dispatch({
        type: "START_REDIRECT",
        dashboardUrl,
      });

      // Note: We don't dispatch SET_CONNECTED here because the user
      // will be redirected away. The callback handling in initialize()
      // will handle the success state when they return.
    } catch (error) {
      console.error("[RedirectController] Connection error:", error);
      this.dispatch({
        type: "SET_ERROR",
        error: error instanceof Error ? error.message : "Redirect failed",
      });
      throw error;
    }
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect(): Promise<void> {
    // Logout via orchestrator's sessionManager
    try {
      await this.abstraxionAuth.logout();
    } catch (error) {
      console.error("[RedirectController] Error during logout:", error);
    }

    // Reset state
    this.dispatch({ type: "RESET" });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    super.destroy();

    // Cleanup orchestrator resources
    this.orchestrator.destroy();
  }
}
