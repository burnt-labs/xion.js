/**
 * Iframe Controller
 * Inline iframe-based authentication flow
 *
 * Renders the full dashboard app inside an inline iframe. The dApp controls
 * where and how big the iframe is via a container element. Authentication
 * and grant approval happen inside the iframe UI.
 *
 * Communication uses MessageChannelManager for request-response (CONNECT,
 * SIGN_AND_BROADCAST) — each request gets its own isolated MessageChannel
 * with targetOrigin enforcement and timeouts.
 *
 * Two disconnect types exist:
 * - DISCONNECT (soft): SDK detaches the iframe without notifying the dashboard.
 *   Dashboard session survives. Not currently sent but defined for future use
 *   (e.g. ITP storage cleanup, UI hints).
 * - HARD_DISCONNECT: Full session clear on both sides. Sent as a raw postMessage
 *   in both directions (SDK → dashboard and dashboard → SDK). Currently only the
 *   dashboard → SDK direction is active (user clicks disconnect inside the iframe).
 *   The SDK → dashboard direction is defined for future use.
 *
 * The iframe handles:
 * - User authentication (Stytch OAuth, Passkey, MetaMask, Keplr, etc.)
 * - Grant permission UI
 *
 * The SDK (this controller) handles:
 * - Iframe lifecycle management
 * - Local session keypair generation (via AbstraxionAuth)
 * - GranteeSignerClient creation
 * - MessageChannel-based CONNECT / SIGN_AND_BROADCAST
 * - IFRAME_READY handshake (waits for dashboard to mount before sending requests)
 * - Session restoration with on-chain grant verification (via orchestrator)
 */

import {
  AbstraxionAuth,
  MessageChannelManager,
  GranteeSignerClient,
  TypedEventEmitter,
} from "@burnt-labs/abstraxion-core";
import type {
  SignArbSecp256k1HdWallet,
  IframeSDKEvents,
  ConnectPayload,
  ConnectResponse,
  StorageStrategy,
  RedirectStrategy,
  SignAndBroadcastResult,
  AddAuthenticatorPayload,
  AddAuthenticatorResponse,
} from "@burnt-labs/abstraxion-core";
import {
  IframeMessageType,
  DashboardMessageType,
} from "@burnt-labs/abstraxion-core";
import { GasPrice } from "@cosmjs/stargate";
import { getDaoDaoIndexerUrl } from "@burnt-labs/constants";
import type { EncodeObject } from "@cosmjs/proto-signing";
import type { StdFee } from "@cosmjs/stargate";
import {
  ConnectionOrchestrator,
  isSessionRestorationError,
  isSessionRestored,
  getAccountInfoFromRestored,
} from "@burnt-labs/account-management";
import type { AccountInfo } from "@burnt-labs/account-management";
import {
  validateTxPayload,
  type TxTransportPayload,
} from "@burnt-labs/signers";
import { BaseController } from "./BaseController";
import type {
  IframeAuthentication,
  NormalizedAbstraxionConfig,
} from "../types";

/**
 * Configuration for IframeController
 */
export interface IframeControllerConfig {
  /** Chain ID */
  chainId: string;
  /** RPC URL */
  rpcUrl: string;
  /** Gas price */
  gasPrice: string;
  /** Iframe authentication config */
  iframe: IframeAuthentication;
  /** Treasury address for grants */
  treasury?: string;
  /** Bank spend limits */
  bank?: Array<{ denom: string; amount: string }>;
  /** Enable staking grants */
  stake?: boolean;
  /** Contract grant configurations */
  contracts?: Array<
    | string
    | { address: string; amounts: Array<{ denom: string; amount: string }> }
  >;
  /** Storage strategy */
  storageStrategy: StorageStrategy;
  /** Redirect strategy (required by AbstraxionAuth, not used for actual redirects) */
  redirectStrategy: RedirectStrategy;
}

/**
 * Iframe Controller
 * Handles inline iframe-based authentication flow
 */
export class IframeController extends BaseController {
  private config: IframeControllerConfig;
  private abstraxionAuth: AbstraxionAuth;
  private orchestrator: ConnectionOrchestrator;
  private initializePromise: Promise<void> | null = null;
  private iframe: HTMLIFrameElement | null = null;
  /** Handles all request-response communication with the iframe */
  private messageManager: MessageChannelManager;
  private iframeOrigin: string;
  private granterAddress: string | null = null;
  private granteeWallet: SignArbSecp256k1HdWallet | null = null;
  private granteeAddress: string | null = null;
  private signingClient: GranteeSignerClient | null = null;
  private eventEmitter = new TypedEventEmitter<
    IframeSDKEvents & Record<string, unknown>
  >();
  private disconnectListener: ((event: MessageEvent) => void) | null = null;
  private iframeReadyListener: ((event: MessageEvent) => void) | null = null;

  // Transient UI state: true while a requireAuth signing request is pending
  // and the iframe needs to be visible for user approval.
  private _awaitingApproval = false;
  private _approvalListeners = new Set<(value: boolean) => void>();
  /** Reject callback for the in-flight signAndBroadcast, used by cancelApproval(). */
  private _cancelPendingApproval: (() => void) | null = null;

  /**
   * Factory method to create IframeController from NormalizedAbstraxionConfig
   */
  static fromConfig(
    config: NormalizedAbstraxionConfig,
    storageStrategy: StorageStrategy,
    redirectStrategy: RedirectStrategy,
  ): IframeController {
    if (config.authentication?.type !== "embedded") {
      throw new Error(
        "Embedded authentication config required for embedded mode",
      );
    }

    const iframeConfig: IframeControllerConfig = {
      chainId: config.chainId,
      rpcUrl: config.rpcUrl,
      gasPrice: config.gasPrice,
      iframe: config.authentication,
      treasury: config.treasury,
      bank: config.bank,
      stake: config.stake,
      contracts: config.contracts,
      storageStrategy,
      redirectStrategy,
    };

    return new IframeController(iframeConfig);
  }

  constructor(config: IframeControllerConfig) {
    super({ status: "initializing" });
    this.config = config;
    this.messageManager = new MessageChannelManager();

    // Extract and validate iframe origin
    if (!config.iframe.iframeUrl) {
      throw new Error(
        "Iframe URL is required. Ensure config is normalized with normalizeAbstraxionConfig().",
      );
    }

    try {
      const url = new URL(config.iframe.iframeUrl);
      this.iframeOrigin = url.origin;
    } catch {
      throw new Error("Invalid iframe URL in configuration");
    }

    // Create AbstraxionAuth for keypair/session management (same as Popup/Redirect controllers)
    this.abstraxionAuth = new AbstraxionAuth(
      config.storageStrategy,
      config.redirectStrategy,
    );

    const treasuryIndexerUrl = config.treasury
      ? getDaoDaoIndexerUrl(config.chainId)
      : undefined;

    this.abstraxionAuth.configureAbstraxionInstance(
      config.rpcUrl,
      config.contracts,
      config.stake,
      config.bank,
      undefined, // callbackUrl — not used in iframe mode
      config.treasury,
      treasuryIndexerUrl,
      config.gasPrice,
    );

    // Create orchestrator for session restoration (same pattern as Redirect/Signer/Popup controllers)
    const grantConfig =
      config.treasury || config.contracts || config.bank || config.stake
        ? {
            treasury: config.treasury,
            contracts: config.contracts,
            bank: config.bank,
            stake: config.stake,
          }
        : undefined;

    this.orchestrator = new ConnectionOrchestrator({
      sessionManager: this.abstraxionAuth,
      storageStrategy: config.storageStrategy,
      grantConfig,
      chainId: config.chainId,
      rpcUrl: config.rpcUrl,
      gasPrice: config.gasPrice,
    });
  }

  /**
   * Subscribe to iframe SDK events
   */
  on<K extends keyof IframeSDKEvents>(
    event: K,
    handler: (data: IframeSDKEvents[K]) => void,
  ): void {
    this.eventEmitter.on(event, handler);
  }

  /**
   * Unsubscribe from iframe SDK events
   */
  off<K extends keyof IframeSDKEvents>(
    event: K,
    handler: (data: IframeSDKEvents[K]) => void,
  ): void {
    this.eventEmitter.off(event, handler);
  }

  /**
   * Initialize: attempt to restore a prior session from storage.
   * Uses orchestrator.restoreSession() — same pattern as Redirect/Signer/Popup controllers.
   * Verifies grants on-chain before restoring session.
   * Idempotent: returns the same promise if called while already initializing
   * (guards against React strict-mode double-invocation)
   */
  async initialize(): Promise<void> {
    if (this.initializePromise) return this.initializePromise;
    this.initializePromise = this.doInitialize();
    return this.initializePromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      // Restore session via orchestrator (verifies grants on-chain, creates signing client)
      const restorationResult = await this.orchestrator.restoreSession(true);

      if (
        isSessionRestored(restorationResult) &&
        restorationResult.signingClient
      ) {
        const accountInfo = getAccountInfoFromRestored(restorationResult);

        // Keep instance vars for public API (getAddress, getGranteeAddress, getSigningClient)
        this.granterAddress = accountInfo.granterAddress;
        this.granteeWallet = accountInfo.keypair;
        this.granteeAddress = accountInfo.granteeAddress;
        this.signingClient = restorationResult.signingClient;

        this.dispatch({
          type: "SET_CONNECTED",
          account: accountInfo,
          signingClient: restorationResult.signingClient,
        });

        // Try to mount the iframe showing the "Connected" view.
        // containerElement may not be set yet (React ref timing),
        // in which case setContainerElement() will handle it later.
        this.mountConnectedIframe();
        return;
      }

      if (isSessionRestorationError(restorationResult)) {
        this.dispatch({
          type: "SET_ERROR",
          error: restorationResult.error,
        });
        return;
      }

      // No session to restore — transition to idle
      this.dispatch({ type: "RESET" });
    } catch (error) {
      console.error("[IframeController] Initialization error:", error);
      this.dispatch({
        type: "SET_ERROR",
        error:
          error instanceof Error
            ? error.message
            : "Failed to initialize. Please refresh the page.",
      });
    }
  }

  /**
   * Connect using the inline iframe
   *
   * 1. Generates grantee keypair via AbstraxionAuth (needed for URL params)
   * 2. Builds iframe URL with mode=inline and grant params
   * 3. Creates/updates iframe element
   * 4. Waits for IFRAME_READY (dashboard React app mounted)
   * 5. Sends CONNECT via MessageChannelManager and waits for response
   */
  async connect(): Promise<void> {
    if (this.getState().status === "connected") {
      console.warn("[IframeController] Already connected");
      return;
    }

    this.dispatch({ type: "START_CONNECT" });

    try {
      // Generate keypair via AbstraxionAuth (same storage as other controllers)
      this.granteeWallet =
        await this.abstraxionAuth.generateAndStoreTempAccount();
      this.granteeAddress = await this.abstraxionAuth.getKeypairAddress();

      // Build iframe URL with all params
      const iframeUrl = this.buildIframeUrl();

      // Register the IFRAME_READY listener BEFORE creating/updating the iframe
      // to eliminate the race where a fast-booting dashboard sends IFRAME_READY
      // before the listener exists.
      const readyPromise = this.waitForIframeReady();

      // Initialize iframe if not done, or update src
      if (!this.iframe) {
        this.initializeIframe(iframeUrl);
      } else {
        this.iframe.src = iframeUrl;
      }

      // Wait for the dashboard's IframeMessageHandler to mount
      await readyPromise;

      // Send CONNECT via MessageChannel — the dashboard's IframeMessageHandler
      // returns a Promise that resolves when auth + grants complete
      const response = await this.messageManager.sendRequest<
        ConnectPayload,
        ConnectResponse
      >(
        this.iframe!,
        IframeMessageType.CONNECT,
        {
          grantParams: this.config.treasury
            ? {
                treasuryAddress: this.config.treasury,
                grantee: this.granteeAddress!,
              }
            : undefined,
        },
        this.iframeOrigin,
        300_000, // 5 min — user needs time for auth + grant approval
      );

      await this.completeConnection(response.address);
    } catch (error) {
      console.error("[IframeController] Connection error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Connection failed";
      this.eventEmitter.emit("error", { error: errorMessage });
      this.dispatch({
        type: "SET_ERROR",
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Disconnect and cleanup (SDK-initiated / soft disconnect)
   *
   * Only clears SDK-side state (grantee keypair, granter address) and removes
   * the iframe from the DOM. Does NOT send a DISCONNECT message to the dashboard,
   * so the dashboard session remains intact.
   *
   * This means on the next connect() call the user only needs to re-approve
   * grants — they won't have to fully re-authenticate with their XION account.
   *
   * Contrast with iframe-initiated disconnect (user clicks Disconnect inside the
   * iframe): that path goes through AuthStateManager.logout() in the dashboard
   * and is a full logout, which is the correct behaviour for a user deliberately
   * signing out of their account.
   */
  async disconnect(): Promise<void> {
    // Remove the iframe silently — the dashboard session survives.
    // connect() will create a fresh iframe whose dashboard app can reuse
    // the existing session from storage.
    if (this.iframe) {
      this.removeIframe();
    }

    // Clear SDK-side state (keypair, granter, signing client) and dispatch
    // EXPLICITLY_DISCONNECTED so the embed does not immediately re-trigger login.
    await this.handleDisconnect();
  }

  /**
   * Set the container element for the iframe.
   * Typically called from a React ref callback. If a session was already
   * restored before the container was available, the iframe will be mounted immediately.
   */
  setContainerElement(element: HTMLElement): void {
    this.config.iframe = { ...this.config.iframe, containerElement: element };

    // If session was restored before the container was available, mount now
    if (this.getState().status === "connected" && !this.iframe) {
      this.mountConnectedIframe();
    }
  }

  /**
   * Whether a container element has been set via setContainerElement().
   * Used by AbstraxionProvider to warn if <AbstraxionEmbed> is missing.
   */
  hasContainerElement(): boolean {
    return !!this.config.iframe.containerElement;
  }

  /**
   * Get the current user's address
   */
  getAddress(): string | null {
    return this.granterAddress;
  }

  /**
   * Get the signing client
   */
  getSigningClient(): GranteeSignerClient | null {
    return this.signingClient;
  }

  /**
   * Get the grantee address (session key address)
   */
  getGranteeAddress(): string | null {
    return this.granteeAddress;
  }

  /**
   * Whether a requireAuth signing request is pending and the iframe needs
   * to be visible for user approval.
   */
  get awaitingApproval(): boolean {
    return this._awaitingApproval;
  }

  /**
   * Subscribe to awaitingApproval changes.
   * Used by AbstraxionProvider to surface `isAwaitingApproval` in context.
   */
  subscribeApproval(callback: (value: boolean) => void): () => void {
    this._approvalListeners.add(callback);
    return () => {
      this._approvalListeners.delete(callback);
    };
  }

  private setAwaitingApproval(value: boolean): void {
    if (this._awaitingApproval !== value) {
      this._awaitingApproval = value;
      this._approvalListeners.forEach((cb) => cb(value));
    }
  }

  /**
   * Cancel a pending approval (signing request).
   * Rejects the in-flight signAndBroadcastWithMetaAccount promise with a
   * cancellation error and hides the approval UI.
   */
  cancelApproval(): void {
    if (this._cancelPendingApproval) {
      this._cancelPendingApproval();
      this._cancelPendingApproval = null;
    }
    this.setAwaitingApproval(false);
  }

  /**
   * Sign and broadcast a transaction with the user's direct authenticator (meta-account).
   *
   * Sends SIGN_AND_BROADCAST via MessageChannelManager to the dashboard iframe,
   * which shows a signing approval UI and broadcasts the transaction.
   */
  async signAndBroadcastWithMetaAccount(
    signerAddress: string,
    messages: readonly EncodeObject[],
    fee: StdFee | "auto" | number,
    memo?: string,
  ): Promise<SignAndBroadcastResult> {
    if (!this.iframe?.contentWindow) {
      throw new Error(
        "Iframe is not available. Ensure the iframe is mounted and the user is connected.",
      );
    }

    // Validate payload before sending — catches common dev mistakes early.
    // The casts below are needed because CosmJS types (readonly EncodeObject[],
    // StdFee | "auto" | number) don't perfectly overlap with TxTransportPayload's
    // field types at the TS level, but are structurally compatible at runtime.
    const txPayloadObj: TxTransportPayload = {
      messages: messages as TxTransportPayload["messages"],
      fee: fee as TxTransportPayload["fee"],
      memo,
    };
    validateTxPayload(txPayloadObj, "IframeController");

    this.setAwaitingApproval(true);
    try {
      // Race the MessageChannel request against a cancellation promise so
      // that cancelApproval() can abort the flow from the UI side.
      const response = await new Promise<{ signedTx: SignAndBroadcastResult }>(
        (resolve, reject) => {
          this._cancelPendingApproval = () =>
            reject(new Error("User cancelled signing request"));

          this.messageManager
            .sendRequest<
              {
                transaction: {
                  messages: readonly EncodeObject[];
                  fee: StdFee | "auto" | number;
                  memo?: string;
                };
                signerAddress: string;
              },
              { signedTx: SignAndBroadcastResult }
            >(
              this.iframe!,
              IframeMessageType.SIGN_AND_BROADCAST,
              { transaction: { messages, fee, memo }, signerAddress },
              this.iframeOrigin,
              300_000, // 5 min — user needs time to review and approve
            )
            .then(resolve, reject);
        },
      );

      return response.signedTx;
    } finally {
      this._cancelPendingApproval = null;
      this.setAwaitingApproval(false);
    }
  }

  /**
   * Add an authenticator to the user's account via the embedded iframe.
   *
   * Sends ADD_AUTHENTICATOR via MessageChannelManager to the dashboard iframe,
   * which shows an add-authenticator UI and resolves when the user completes
   * or cancels. Same pattern as signAndBroadcastWithMetaAccount.
   */
  // _signerAddress is unused here because the iframe already knows the connected
  // account. The parameter exists for interface symmetry with PopupController and
  // RedirectController so callers can use promptAddAuthenticators uniformly.
  async promptAddAuthenticators(_signerAddress: string): Promise<void> {
    if (!this.iframe?.contentWindow) {
      throw new Error(
        "Iframe is not available. Ensure the iframe is mounted and the user is connected.",
      );
    }

    this.setAwaitingApproval(true);
    try {
      await new Promise<AddAuthenticatorResponse>((resolve, reject) => {
        this._cancelPendingApproval = () =>
          reject(new Error("User cancelled add authenticator request"));

        this.messageManager
          .sendRequest<AddAuthenticatorPayload, AddAuthenticatorResponse>(
            this.iframe!,
            IframeMessageType.ADD_AUTHENTICATOR,
            {},
            this.iframeOrigin,
            600_000, // 10 min — user needs time to add authenticator
          )
          .then(resolve, reject);
      });
    } finally {
      this._cancelPendingApproval = null;
      this.setAwaitingApproval(false);
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    // Remove disconnect listener
    if (this.disconnectListener) {
      window.removeEventListener("message", this.disconnectListener);
      this.disconnectListener = null;
    }

    // Remove IFRAME_READY listener
    if (this.iframeReadyListener) {
      window.removeEventListener("message", this.iframeReadyListener);
      this.iframeReadyListener = null;
    }

    // Remove iframe from DOM
    if (this.iframe && this.iframe.parentNode) {
      this.iframe.parentNode.removeChild(this.iframe);
    }
    this.iframe = null;

    // Clear event listeners
    this.eventEmitter.removeAllListeners();

    // Cleanup orchestrator
    this.orchestrator.destroy();

    super.destroy();
  }

  /**
   * Remove the iframe from DOM and clean up its event listener.
   * Used during SDK-initiated disconnect to prevent a visible re-render
   * before connect() creates a fresh iframe.
   */
  private removeIframe(): void {
    if (this.disconnectListener) {
      window.removeEventListener("message", this.disconnectListener);
      this.disconnectListener = null;
    }
    if (this.iframe?.parentNode) {
      this.iframe.parentNode.removeChild(this.iframe);
    }
    this.iframe = null;
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  /**
   * Mount the iframe showing the dashboard's "Connected" view.
   * Used after restoring a session from storage on page refresh.
   * Only sets mode=inline (no grantee/treasury — grant is already done).
   */
  private mountConnectedIframe(): void {
    if (!this.config.iframe.containerElement) {
      return; // Container not available yet — setContainerElement() will retry
    }
    if (this.iframe) {
      return; // Already mounted
    }

    const url = new URL(this.config.iframe.iframeUrl!);
    url.searchParams.set("mode", "inline");
    url.searchParams.set("redirect_uri", window.location.origin);
    this.initializeIframe(url.toString());
  }

  /**
   * Build the iframe URL with all required query params
   */
  private buildIframeUrl(): string {
    const url = new URL(this.config.iframe.iframeUrl!);

    url.searchParams.set("mode", "inline");
    url.searchParams.set("grantee", this.granteeAddress!);
    url.searchParams.set("redirect_uri", window.location.origin);

    if (this.config.treasury) {
      url.searchParams.set("treasury", this.config.treasury);
    }
    if (this.config.bank) {
      url.searchParams.set("bank", JSON.stringify(this.config.bank));
    }
    if (this.config.stake) {
      url.searchParams.set("stake", "true");
    }
    if (this.config.contracts) {
      url.searchParams.set("contracts", JSON.stringify(this.config.contracts));
    }

    return url.toString();
  }

  /**
   * Wait for the iframe's IframeMessageHandler to mount.
   * The dashboard sends IFRAME_READY via postMessage once it's ready
   * to accept MessageChannel requests.
   */
  private waitForIframeReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("Iframe did not become ready within 30s"));
      }, 30_000);

      const handler = (event: MessageEvent) => {
        if (event.origin !== this.iframeOrigin) return;
        if (event.data?.type === DashboardMessageType.IFRAME_READY) {
          cleanup();
          resolve();
        }
      };

      const cleanup = () => {
        window.removeEventListener("message", handler);
        this.iframeReadyListener = null;
        clearTimeout(timeout);
      };

      this.iframeReadyListener = handler;
      window.addEventListener("message", handler);
    });
  }

  /**
   * Initialize the iframe element and mount it to the container
   */
  private initializeIframe(src: string): void {
    const container = this.config.iframe.containerElement;
    if (!container) {
      throw new Error(
        "containerElement is required for iframe mode. " +
          "Provide a DOM element where the iframe should be mounted.",
      );
    }

    const iframe = document.createElement("iframe");
    iframe.src = src;
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.allow = `publickey-credentials-get ${this.iframeOrigin}; clipboard-read; clipboard-write`;

    container.appendChild(iframe);
    this.iframe = iframe;

    // Listen for HARD_DISCONNECT from the dashboard (user clicked disconnect inside
    // the iframe UI — full session clear on both sides).
    this.disconnectListener = (event: MessageEvent) => {
      if (event.origin !== this.iframeOrigin) return;
      if (event.data?.type === DashboardMessageType.HARD_DISCONNECT) {
        if (this.getState().status === "connected") {
          this.removeIframe();
          this.handleDisconnect().catch((error) => {
            console.error(
              "[IframeController] Error handling hard disconnect:",
              error,
            );
          });
        }
      }
    };
    window.addEventListener("message", this.disconnectListener);
  }

  /**
   * Complete connection after receiving address from MessageChannel CONNECT response
   * Stores granter via AbstraxionAuth and creates GranteeSignerClient (same as Popup/Redirect)
   */
  private async completeConnection(granterAddress: string): Promise<void> {
    this.granterAddress = granterAddress;

    // Store granter via AbstraxionAuth (same storage key as other controllers)
    await this.abstraxionAuth.setGranter(granterAddress);

    // Sync in-memory state for getSigner()
    this.abstraxionAuth.abstractAccount = this.granteeWallet!;

    // Emit authenticated event
    this.eventEmitter.emit("authenticated", { address: granterAddress });

    // Create signing client via AbstraxionAuth
    const signingClient = await this.abstraxionAuth.getSigner(
      GasPrice.fromString(this.config.gasPrice),
    );
    this.signingClient = signingClient;

    const accountInfo: AccountInfo = {
      keypair: this.granteeWallet!,
      granterAddress: this.granterAddress,
      granteeAddress: this.granteeAddress!,
    };

    this.dispatch({
      type: "SET_CONNECTED",
      account: accountInfo,
      signingClient,
    });
  }

  /**
   * Handle disconnect — shared between SDK-initiated and iframe-initiated
   */
  private async handleDisconnect(): Promise<void> {
    // Clear session via AbstraxionAuth (same storage keys as other controllers)
    try {
      await this.abstraxionAuth.logout();
    } catch (error) {
      console.warn(
        "[IframeController] Logout failed during disconnect. Session data may persist and be restored on next load:",
        error,
      );
    }

    // Clear local state
    this.granterAddress = null;
    this.granteeWallet = null;
    this.granteeAddress = null;
    this.signingClient = null;

    // Emit disconnected event
    this.eventEmitter.emit("disconnected", {});

    // Mark as explicitly disconnected so the embed does not re-trigger login
    // on the next render within the same page session.
    this.dispatch({ type: "EXPLICITLY_DISCONNECTED" });
  }
}
