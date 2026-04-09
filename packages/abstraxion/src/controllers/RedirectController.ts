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
import { BaseController } from "./BaseController";
import { resolveAuthAppUrl, buildDashboardUrl } from "./utils";
import type { ControllerConfig } from "./types";
import type { RedirectAuthentication, SignResult, AddAuthResult } from "../types";
import {
  toBase64,
  validateTxPayload,
  type TxTransportPayload,
} from "@burnt-labs/signers";

const STORAGE_KEY_PENDING_SIGN = "xion_pending_sign";
const STORAGE_KEY_PENDING_ADD_AUTH = "xion_pending_add_auth";

// ─── File-level utilities ────────────────────────────────────────────────────

/**
 * Generic observable result store for redirect flow results.
 * Handles get/set/clear/subscribe for a single nullable value.
 */
class ResultStore<T> {
  private value_: T | null = null;
  private subscribers_ = new Set<() => void>();

  get(): T | null {
    return this.value_;
  }

  /** Stable snapshot reference — only changes when value is updated */
  snapshot(): T | null {
    return this.value_;
  }

  set(value: T | null): void {
    this.value_ = value;
    this.subscribers_.forEach((cb) => cb());
  }

  clear(): void {
    this.set(null);
  }

  /** Subscribe for useSyncExternalStore. Returns unsubscribe function. */
  subscribe(callback: () => void): () => void {
    this.subscribers_.add(callback);
    return () => {
      this.subscribers_.delete(callback);
    };
  }

  destroy(): void {
    this.subscribers_.clear();
  }
}

/**
 * Initiate a redirect to the dashboard for a given mode.
 * Stores a pending context entry in sessionStorage, builds the URL, and
 * navigates the browser away. Returns a Promise that rejects after 10 s if
 * navigation didn't complete (e.g. CSP block).
 */
function initiateRedirectNavigation(
  authAppUrl: string,
  mode: string,
  granter: string,
  storageKey: string,
  extraParams?: Record<string, string>,
): Promise<never> {
  sessionStorage.setItem(
    storageKey,
    JSON.stringify({ returnUrl: window.location.href, timestamp: Date.now() }),
  );

  const url = buildDashboardUrl(authAppUrl, mode, granter, window.location.href, extraParams);
  window.location.href = url.toString();

  return new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(
        new Error(
          `Navigation to the dashboard "${mode}" page did not complete. ` +
            "This may be caused by a Content Security Policy restriction or the browser interrupting the redirect.",
        ),
      );
    }, 10_000);
  });
}

/**
 * Detect a redirect result from URL query params.
 * If any of the watched params are present, calls `buildResult` to construct
 * the typed result, stores it via `setResult`, cleans the params from the URL,
 * and removes the pending sessionStorage entry.
 *
 * @param paramKeys  Param names to watch for (any one triggers detection)
 * @param storageKey sessionStorage key to remove after detection
 * @param buildResult Receives the current URLSearchParams; returns the typed result
 * @param setResult  Called with the constructed result
 */
function detectRedirectResult<T>(
  paramKeys: string[],
  storageKey: string,
  buildResult: (params: URLSearchParams) => T,
  setResult: (value: T) => void,
): void {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);
  if (!paramKeys.some((k) => params.has(k))) return;

  setResult(buildResult(params));

  paramKeys.forEach((k) => params.delete(k));
  const cleanSearch = params.toString();
  window.history.replaceState(
    {},
    "",
    window.location.pathname + (cleanSearch ? `?${cleanSearch}` : ""),
  );
  sessionStorage.removeItem(storageKey);
}

// ─── Config ──────────────────────────────────────────────────────────────────

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

// ─── Controller ──────────────────────────────────────────────────────────────

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
  readonly signResult = new ResultStore<SignResult>();
  readonly addAuthResult = new ResultStore<AddAuthResult>();
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
      bank: config.bank,
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
    // Check for add-authenticator result return (add_auth_success / add_auth_rejected / add_auth_error)
    this.detectAddAuthResult();

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

        // Clean redirect params from the address bar now that we've read them
        const url = new URL(window.location.href);
        url.searchParams.delete("granted");
        url.searchParams.delete("granter");
        history.replaceState({}, "", url.href);

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
      console.warn(
        "[RedirectController] Logout failed during disconnect. Session data may persist and be restored on next load:",
        error,
      );
    }

    // Mark as explicitly disconnected so autoConnect does not fire on re-render.
    this.dispatch({ type: "EXPLICITLY_DISCONNECTED" });
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
  async signAndBroadcastWithMetaAccount(
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

  // ─── Sign redirect flow ──────────────────────────────────────────────────

  /**
   * Redirect to the dashboard signing view for direct signing.
   *
   * **Fire-and-forget**: this method sets `window.location.href` and the
   * browser navigates away. The returned Promise is only a safety net — it
   * rejects after 10 seconds if navigation didn't happen (e.g. a Content
   * Security Policy blocked it). Callers should NOT await this for a signing
   * result; instead, read `signResult.get()` (via the hook's `signResult`)
   * after the page reloads from the dashboard redirect.
   *
   * TODO: consider storing the tx payload in sessionStorage before redirect and
   * verifying it matches on return, to correlate results to the originating tx.
   */
  async promptSignAndBroadcast(
    signerAddress: string,
    messages: readonly EncodeObject[],
    fee: StdFee | "auto" | number,
    memo?: string,
  ): Promise<never> {
    const authAppUrl = await resolveAuthAppUrl(
      this.config.rpcUrl,
      this.config.redirect.authAppUrl,
    );

    const txPayloadObj: TxTransportPayload = {
      messages,
      fee,
      memo,
    };
    validateTxPayload(txPayloadObj, "RedirectController");

    return initiateRedirectNavigation(
      authAppUrl,
      "sign",
      signerAddress,
      STORAGE_KEY_PENDING_SIGN,
      { tx: toBase64(JSON.stringify(txPayloadObj)) },
    );
  }

  private detectSignResult(): void {
    detectRedirectResult(
      ["tx_hash", "sign_rejected", "sign_error"],
      STORAGE_KEY_PENDING_SIGN,
      (params) => {
        const txHash = params.get("tx_hash");
        const signError = params.get("sign_error");
        return txHash
          ? { success: true as const, transactionHash: txHash }
          : { success: false as const, error: signError ? decodeURIComponent(signError) : "Transaction rejected" };
      },
      (result) => this.signResult.set(result),
    );
  }

  // ─── Add-authenticator redirect flow ────────────────────────────────────

  /**
   * Add an authenticator by redirecting to the dashboard's add-auth page.
   *
   * Fire-and-forget: the browser navigates away. On success the dashboard
   * redirects back with `?add_auth_success=true`; on cancellation with
   * `?add_auth_rejected=true`; on error with `?add_auth_error=<message>`.
   *
   * Read the result via `addAuthResult.get()` (or the hook's `addAuthResult`)
   * after the page reloads from the dashboard redirect.
   */
  async promptAddAuthenticators(signerAddress: string): Promise<void> {
    const authAppUrl = await resolveAuthAppUrl(
      this.config.rpcUrl,
      this.config.redirect.authAppUrl,
    );

    return initiateRedirectNavigation(
      authAppUrl,
      "add-authenticators",
      signerAddress,
      STORAGE_KEY_PENDING_ADD_AUTH,
    );
  }

  private detectAddAuthResult(): void {
    detectRedirectResult(
      ["add_auth_success", "add_auth_rejected", "add_auth_error"],
      STORAGE_KEY_PENDING_ADD_AUTH,
      (params) => {
        const success = params.get("add_auth_success");
        const error = params.get("add_auth_error");
        return success
          ? { success: true as const }
          : { success: false as const, error: error ? decodeURIComponent(error) : "Cancelled" };
      },
      (result) => this.addAuthResult.set(result),
    );
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    super.destroy();
    this.signResult.destroy();
    this.addAuthResult.destroy();
    this.orchestrator.destroy();
  }
}
