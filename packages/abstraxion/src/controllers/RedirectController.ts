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
import {
  ConnectionOrchestrator,
  isSessionRestorationError,
  isSessionRestored,
  getAccountInfoFromRestored,
} from "@burnt-labs/account-management";
import type { AccountInfo } from "@burnt-labs/account-management";
import { getDaoDaoIndexerUrl } from "@burnt-labs/constants";
import type { EncodeObject } from "@cosmjs/proto-signing";
import { GasPrice } from "@cosmjs/stargate";
import type { StdFee, DeliverTxResponse } from "@cosmjs/stargate";
import { fetchConfig } from "@burnt-labs/constants";
import { BaseController } from "./BaseController";
import type { ControllerConfig } from "./types";
import type { RedirectAuthentication, SignResult } from "../types";
import { toBase64 } from "../utils/encoding";

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
  private abstraxionAuth: AbstraxionAuth;
  private orchestrator: ConnectionOrchestrator;
  private config: RedirectControllerConfig;
  private signResult_: SignResult | null = null;
  private initializePromise: Promise<void> | null = null;

  /**
   * Factory method to create RedirectController from NormalizedAbstraxionConfig
   * Handles all config transformation internally
   */
  static fromConfig(
    config: import("../types").NormalizedAbstraxionConfig,
    storageStrategy: StorageStrategy,
    redirectStrategy: RedirectStrategy,
  ): RedirectController {
    // For redirect mode, ensure at least one grant parameter is present
    // This ensures the dashboard shows AbstraxionGrant and redirects back
    // If no grant config is provided, use a minimal bank grant as fallback
    const hasGrantConfig =
      config.treasury || config.contracts || config.bank || config.stake;
    const fallbackBank = hasGrantConfig
      ? undefined
      : [{ denom: "uxion", amount: "0.1" }];

    const redirectConfig: RedirectControllerConfig = {
      chainId: config.chainId,
      rpcUrl: config.rpcUrl,
      gasPrice: config.gasPrice,
      redirect: {
        type: "redirect",
        callbackUrl:
          config.authentication?.type === "redirect"
            ? config.authentication.callbackUrl
            : undefined,
        authAppUrl:
          config.authentication?.type === "redirect"
            ? config.authentication.authAppUrl
            : undefined,
      },
      storageStrategy,
      redirectStrategy,
      treasury: config.treasury,
      bank: config.bank || fallbackBank,
      stake: config.stake,
      contracts: config.contracts,
    };

    return new RedirectController(redirectConfig);
  }

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

    // Configure AbstraxionAuth with default treasury indexer URL
    const treasuryIndexerUrl = config.treasury
      ? getDaoDaoIndexerUrl(config.chainId)
      : undefined;

    this.abstraxionAuth.configureAbstraxionInstance(
      config.rpcUrl,
      config.contracts, // Pass contracts if provided
      config.stake, // Pass stake if provided
      config.bank, // Pass bank (or minimal fallback) if provided
      config.redirect.callbackUrl,
      config.treasury, // Pass treasury so it's included in redirect URL
      treasuryIndexerUrl, // Default DaoDao indexer URL for treasury grant queries
      config.gasPrice, // Pass gasPrice for signing client creation
      config.redirect.authAppUrl, // Optional override for the auth app URL
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
   * Idempotent: returns the same promise if called while already initializing
   * (guards against React strict-mode double-invocation)
   */
  async initialize(): Promise<void> {
    if (this.initializePromise) return this.initializePromise;
    this.initializePromise = this.doInitialize();
    return this.initializePromise;
  }

  private async doInitialize(): Promise<void> {
    // Check for signing result return (tx_hash / sign_rejected / sign_error)
    this.detectSignResult();

    // Check if we're returning from dashboard redirect FIRST
    // If so, transition from initializing to connecting
    if (this.isReturningFromRedirect()) {
      // We're returning from dashboard with ?granted=true — complete the
      // connection directly (same approach as PopupController.completeConnection).
      // This avoids going through performLogin() → pollForGrants() which has
      // strict grant comparison logic and an isLoginInProgress guard that
      // breaks under React strict-mode double-invocation.
      this.dispatch({ type: "START_CONNECT" });

      try {
        // 1. Read keypair from storage (was generated before redirect)
        const keypair = await this.abstraxionAuth.getLocalKeypair();
        if (!keypair) {
          throw new Error(
            "Session keypair not found after redirect. Storage may have been cleared.",
          );
        }

        // 2. Read granter from URL params (set by dashboard redirect)
        const searchParams = new URLSearchParams(window.location.search);
        const granterAddress = searchParams.get("granter");
        if (!granterAddress) {
          throw new Error(
            "Granter address missing from redirect callback URL.",
          );
        }

        // 3. Persist granter + sync in-memory state (same as PopupController)
        await this.abstraxionAuth.setGranter(granterAddress);
        this.abstraxionAuth.abstractAccount = keypair;

        // 4. Create signing client
        const signingClient = await this.abstraxionAuth.getSigner(
          GasPrice.fromString(this.config.gasPrice),
        );

        const accounts = await keypair.getAccounts();
        const granteeAddress = accounts[0].address;

        const accountInfo: AccountInfo = {
          keypair,
          granterAddress,
          granteeAddress,
        };

        this.dispatch({
          type: "SET_CONNECTED",
          account: accountInfo,
          signingClient,
        });

        // 5. Clean redirect params from URL
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("granted");
        cleanUrl.searchParams.delete("granter");
        history.replaceState({}, "", cleanUrl.href);
      } catch (error) {
        console.error(
          "[RedirectController] Error completing redirect callback:",
          error,
        );
        this.dispatch({
          type: "SET_ERROR",
          error:
            error instanceof Error
              ? error.message
              : "Failed to complete authentication. Please try again.",
        });
      }

      return;
    }

    // Not a redirect callback - normal initialization flow
    // Already in initializing state, so no need to dispatch INITIALIZE
    // Just proceed with session restoration

    try {
      // Try to restore session using orchestrator (with signing client creation)
      const restorationResult = await this.orchestrator.restoreSession(true);

      if (
        isSessionRestored(restorationResult) &&
        restorationResult.signingClient
      ) {
        // Session restored successfully - extract AccountInfo using type guard
        const accountInfo = getAccountInfoFromRestored(restorationResult);

        this.dispatch({
          type: "SET_CONNECTED",
          account: accountInfo,
          signingClient: restorationResult.signingClient,
        });
        return;
      }

      // Check if restoration failed with an error (session existed but was invalid)
      if (isSessionRestorationError(restorationResult)) {
        this.dispatch({
          type: "SET_ERROR",
          error: restorationResult.error,
        });
        return;
      }

      // No session to restore - transition to idle
      this.dispatch({ type: "RESET" });
    } catch (error) {
      console.error("[RedirectController] Initialization error:", error);
      // Unexpected error during initialization (network, config, etc.) - show to user
      this.dispatch({
        type: "SET_ERROR",
        error:
          error instanceof Error
            ? error.message
            : "Failed to initialize. Please try again.",
      });
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
      console.warn("[RedirectController] Logout failed during disconnect. Session data may persist and be restored on next load:", error);
    }

    // Reset state
    this.dispatch({ type: "RESET" });
  }

  /**
   * Direct signing is not supported with redirect mode.
   *
   * Redirect mode cannot perform direct signing because the session key
   * does not have access to the user's direct authenticator. Use signer mode
   * with `requireAuth: true` for direct signing, or iframe mode for
   * interactive signing via the dashboard.
   *
   * @throws Always throws an error explaining the limitation
   */
  async signWithMetaAccount(
    _signerAddress: string,
    _messages: readonly EncodeObject[],
    _fee: StdFee | "auto" | number,
    _memo?: string,
  ): Promise<DeliverTxResponse> {
    throw new Error(
      "Direct signing is not supported with redirect mode. " +
        "Redirect mode uses a session key and cannot access the user's direct authenticator for signing. " +
        "For transactions requiring the user's direct signer mode, use iframe mode or signer mode with requireAuth: true.",
    );
  }

  /**
   * Redirect to the dashboard signing view for direct signing.
   *
   * The page navigates away — the returned Promise never resolves on this page load.
   * After the dashboard signs + broadcasts, it redirects back with `?tx_hash=<hash>`
   * (or `?sign_rejected=true` / `?sign_error=<msg>`). On the next page load,
   * `initialize()` picks up the result and exposes it via `getSignResult()`.
   */
  async promptAndSign(
    signerAddress: string,
    messages: readonly EncodeObject[],
    fee: StdFee | "auto" | number,
    memo?: string,
  ): Promise<DeliverTxResponse> {
    const authAppUrl =
      this.config.redirect.authAppUrl ||
      (await fetchConfig(this.config.rpcUrl)).dashboardUrl;

    if (!authAppUrl) {
      throw new Error(
        "Could not determine auth app URL for signing redirect. " +
          "Provide authAppUrl in your authentication config.",
      );
    }

    // Save pending sign context so we can correlate the return
    sessionStorage.setItem(
      "xion_pending_sign",
      JSON.stringify({
        returnUrl: window.location.href,
        timestamp: Date.now(),
      }),
    );

    // Build signing URL (same params as PopupController.promptAndSign)
    const url = new URL(authAppUrl);
    url.searchParams.set("mode", "sign");
    url.searchParams.set("tx", toBase64(JSON.stringify({ messages, fee, memo })));
    url.searchParams.set("granter", signerAddress);
    url.searchParams.set("redirect_uri", window.location.href);

    // Navigate away
    window.location.href = url.toString();

    // Return a promise that rejects if navigation doesn't happen within 5s
    // (e.g., popup blocker, CSP, or browser stop button)
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            "Redirect to signing page failed. The page may have been blocked by a popup blocker or Content Security Policy.",
          ),
        );
      }, 5_000);
    });
  }

  /**
   * Get the result from a redirect signing flow (populated after returning
   * from the dashboard signing redirect). Returns null if no result is pending.
   */
  getSignResult(): SignResult | null {
    return this.signResult_;
  }

  /**
   * Clear the sign result after the consumer has handled it.
   */
  clearSignResult(): void {
    this.signResult_ = null;
  }

  /**
   * Detect signing result from URL query params after a signing redirect return.
   * Stores the result and cleans the params from the URL.
   */
  private detectSignResult(): void {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const txHash = params.get("tx_hash");
    const signRejected = params.get("sign_rejected");
    const signError = params.get("sign_error");

    if (!txHash && !signRejected && !signError) return;

    this.signResult_ = txHash
      ? { success: true, transactionHash: txHash }
      : { success: false, error: signError || "Transaction rejected" };

    // Clean signing params from URL
    params.delete("tx_hash");
    params.delete("sign_rejected");
    params.delete("sign_error");
    const cleanSearch = params.toString();
    const cleanUrl =
      window.location.pathname + (cleanSearch ? `?${cleanSearch}` : "");
    window.history.replaceState({}, "", cleanUrl);
    sessionStorage.removeItem("xion_pending_sign");
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
