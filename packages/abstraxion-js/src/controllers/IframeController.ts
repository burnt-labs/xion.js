/**
 * Iframe Controller
 * Inline iframe-based authentication flow
 *
 * Renders the full dashboard app inside an inline iframe (web) or WebView
 * (React Native). Mount + transport details are delegated to a host-supplied
 * `IframeTransportStrategy`, so this controller has no direct DOM or
 * react-native-webview dependency.
 *
 * Communication uses MessageChannelManager for request-response (CONNECT,
 * SIGN_AND_BROADCAST) — each request gets its own isolated MessageChannel
 * with targetOrigin enforcement and timeouts.
 *
 * Two disconnect types exist:
 * - DISCONNECT (soft): SDK detaches the iframe without notifying the dashboard.
 *   Dashboard session survives. Not currently sent but defined for future use.
 * - HARD_DISCONNECT: Full session clear on both sides. The dashboard → SDK
 *   direction is delivered as a push event via `IframeTransportStrategy.onPushMessage`.
 */

import {
  AbstraxionAuth,
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
  ManageAuthenticatorsPayload,
  ManageAuthenticatorsResponse,
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
import { BrowserIframeTransportStrategy } from "../strategies/BrowserIframeTransportStrategy";
import type { IframeTransportStrategy } from "../strategies/IframeTransportStrategy";

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
  /**
   * Iframe transport strategy. Optional — defaults to `BrowserIframeTransportStrategy`
   * for back-compat with web consumers and existing tests. React Native callers MUST
   * pass an `RNWebViewIframeTransport`.
   */
  iframeTransportStrategy?: IframeTransportStrategy;
}

/** Sentinel thrown internally by `connect()` to signal a cancelled login. */
class LoginCancelledError extends Error {
  constructor() {
    super("Login cancelled by user");
    this.name = "LoginCancelledError";
  }
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
  private transport: IframeTransportStrategy;
  private iframeOrigin: string;
  private granterAddress: string | null = null;
  private granteeWallet: SignArbSecp256k1HdWallet | null = null;
  private granteeAddress: string | null = null;
  private signingClient: GranteeSignerClient | null = null;
  private eventEmitter = new TypedEventEmitter<
    IframeSDKEvents & Record<string, unknown>
  >();
  private unsubscribePushMessages: (() => void) | null = null;

  // Transient UI state: true while a requireAuth signing request is pending
  // and the iframe needs to be visible for user approval.
  private _awaitingApproval = false;
  private _approvalListeners = new Set<(value: boolean) => void>();
  /** Reject callback for the in-flight signAndBroadcast, used by cancelApproval(). */
  private _cancelPendingApproval: (() => void) | null = null;
  /** Cancellation handle for the in-flight connect() flow, used by cancelLogin(). */
  private _loginCancellation: {
    aborted: boolean;
    reject: ((error: Error) => void) | null;
  } | null = null;

  /**
   * Factory method to create IframeController from NormalizedAbstraxionConfig
   */
  static fromConfig(
    config: NormalizedAbstraxionConfig,
    storageStrategy: StorageStrategy,
    redirectStrategy: RedirectStrategy,
    iframeTransportStrategy?: IframeTransportStrategy,
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
      iframeTransportStrategy,
    };

    return new IframeController(iframeConfig);
  }

  constructor(config: IframeControllerConfig) {
    super({ status: "initializing" });
    this.config = config;

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

    // Default to browser transport so the existing tests + web consumers
    // continue to work without explicit injection. React Native consumers
    // pass an RN WebView-backed transport.
    this.transport =
      config.iframeTransportStrategy ?? new BrowserIframeTransportStrategy();

    // If an explicit container was passed (web only), bind it to the transport.
    if (config.iframe.containerElement) {
      this.transport.setContainer(config.iframe.containerElement);
    }

    // Subscribe to dashboard push messages (HARD_DISCONNECT etc.)
    this.unsubscribePushMessages = this.transport.onPushMessage(
      this.handlePushMessage.bind(this),
    );

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
   * Override the default transport strategy. Used by `createAbstraxionRuntime`
   * so the runtime can inject a host-supplied transport without forcing every
   * controller config to thread the strategy through manually.
   *
   * Replaces any previously bound transport — the old one is unmounted first.
   */
  setTransportStrategy(transport: IframeTransportStrategy): void {
    if (transport === this.transport) return;

    if (this.transport) {
      this.unsubscribePushMessages?.();
      this.unsubscribePushMessages = null;
      this.transport.unmount();
    }
    this.transport = transport;

    if (this.config.iframe.containerElement) {
      this.transport.setContainer(this.config.iframe.containerElement);
    }

    this.unsubscribePushMessages = this.transport.onPushMessage(
      this.handlePushMessage.bind(this),
    );
  }

  /** Returns the active transport strategy. Mainly useful for tests/embedded UI hosts. */
  getTransportStrategy(): IframeTransportStrategy {
    return this.transport;
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
   * Idempotent: returns the same promise if called while already initializing.
   */
  async initialize(): Promise<void> {
    if (this.initializePromise) return this.initializePromise;
    this.initializePromise = this.doInitialize();
    return this.initializePromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      const restorationResult = await this.orchestrator.restoreSession(true);

      if (
        isSessionRestored(restorationResult) &&
        restorationResult.signingClient
      ) {
        const accountInfo = getAccountInfoFromRestored(restorationResult);

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
        // The transport may not have a container yet (React ref timing),
        // in which case setContainerElement() will retry later.
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
   * Connect using the inline iframe / WebView.
   *
   * 1. Generates grantee keypair via AbstraxionAuth (needed for URL params).
   * 2. Builds iframe URL with mode=inline and grant params.
   * 3. Mounts the iframe via the active `IframeTransportStrategy`.
   * 4. Waits for IFRAME_READY (dashboard React app mounted).
   * 5. Sends CONNECT and waits for response.
   */
  async connect(): Promise<void> {
    if (this.getState().status === "connected") {
      console.warn("[IframeController] Already connected");
      return;
    }

    this.dispatch({ type: "START_CONNECT" });

    const cancellation: NonNullable<IframeController["_loginCancellation"]> = {
      aborted: false,
      reject: null,
    };
    this._loginCancellation = cancellation;

    // Wraps each await so cancelLogin() can reject in-flight transport calls.
    // Only used for promises whose rejection reason we care about preserving
    // verbatim — internal awaits use `throwIfAborted()` after the fact.
    const cancellable = <T>(p: Promise<T>): Promise<T> =>
      new Promise<T>((resolve, reject) => {
        if (cancellation.aborted) {
          reject(new LoginCancelledError());
          return;
        }
        cancellation.reject = reject;
        p.then(
          (value) => {
            if (cancellation.reject === reject) cancellation.reject = null;
            resolve(value);
          },
          (error) => {
            if (cancellation.reject === reject) cancellation.reject = null;
            // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- forwards the underlying transport rejection unchanged
            reject(error);
          },
        );
      });

    const throwIfAborted = (): void => {
      if (cancellation.aborted) throw new LoginCancelledError();
    };

    try {
      this.granteeWallet =
        await this.abstraxionAuth.generateAndStoreTempAccount();
      this.granteeAddress = await this.abstraxionAuth.getKeypairAddress();
      throwIfAborted();

      const iframeUrl = this.buildIframeUrl();

      // Register the IFRAME_READY listener BEFORE mounting to eliminate
      // the race where a fast-booting dashboard sends IFRAME_READY before
      // the listener exists.
      const readyPromise = this.transport.waitForReady(30_000);

      if (!this.transport.isMounted()) {
        this.transport.mount({ url: iframeUrl, origin: this.iframeOrigin });
      } else {
        this.transport.navigate(iframeUrl);
      }

      await cancellable(readyPromise);

      const response = await cancellable(
        this.transport.sendRequest<ConnectPayload, ConnectResponse>(
          IframeMessageType.CONNECT,
          {
            grantParams: this.config.treasury
              ? {
                  treasuryAddress: this.config.treasury,
                  grantee: this.granteeAddress!,
                }
              : undefined,
          },
          300_000, // 5 min — user needs time for auth + grant approval
        ),
      );

      // completeConnection() has its own awaits (setGranter, getSigner) — pass
      // the abort guard so a cancel landing mid-finalization doesn't dispatch
      // SET_CONNECTED on top of an already-unmounted transport.
      await this.completeConnection(response.address, throwIfAborted);
    } catch (error) {
      if (error instanceof LoginCancelledError) {
        // cancelLogin() already unmounted the transport and reset state.
        return;
      }
      console.error("[IframeController] Connection error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Connection failed";
      this.eventEmitter.emit("error", { error: errorMessage });
      this.dispatch({
        type: "SET_ERROR",
        error: errorMessage,
      });
      throw error;
    } finally {
      if (this._loginCancellation === cancellation) {
        this._loginCancellation = null;
      }
    }
  }

  /**
   * Cancel an in-flight connect() / login flow.
   *
   * Used by embedded UI hosts when the user dismisses the login modal/WebView
   * mid-flow. Rejects any awaited transport call, unmounts the iframe, and
   * resets state so the consumer can retry. No-op if no login is in flight.
   */
  cancelLogin(): void {
    if (!this.abortPendingLogin()) return;

    if (this.transport.isMounted()) {
      this.transport.unmount();
    }

    if (this.getState().status !== "connected") {
      this.dispatch({ type: "RESET" });
    }
  }

  /**
   * Mark any in-flight `connect()` as aborted and reject its currently-awaited
   * promise. Returns true if a login was in flight, false otherwise. Shared
   * by `cancelLogin()` (user-initiated) and `destroy()` (controller teardown).
   */
  private abortPendingLogin(): boolean {
    const cancellation = this._loginCancellation;
    if (!cancellation) return false;

    cancellation.aborted = true;
    cancellation.reject?.(new LoginCancelledError());
    cancellation.reject = null;
    this._loginCancellation = null;
    return true;
  }

  /**
   * Disconnect and cleanup (SDK-initiated / soft disconnect).
   *
   * Removes the iframe silently — the dashboard session survives so the user
   * only needs to re-approve grants on the next connect() call, not fully
   * re-authenticate.
   */
  async disconnect(): Promise<void> {
    if (this.transport.isMounted()) {
      this.transport.unmount();
    }
    await this.handleDisconnect();
  }

  /**
   * Set the container element for the iframe.
   * Typically called from a React ref callback. If a session was already
   * restored before the container was available, the iframe will be mounted immediately.
   */
  setContainerElement(element: unknown): void {
    this.config.iframe = {
      ...this.config.iframe,
      containerElement: element as HTMLElement,
    };
    this.transport.setContainer(element);

    if (this.getState().status === "connected" && !this.transport.isMounted()) {
      this.mountConnectedIframe();
    }
  }

  /** Whether a container element has been set via setContainerElement(). */
  hasContainerElement(): boolean {
    return this.transport.hasContainer();
  }

  /** Get the current user's address. */
  getAddress(): string | null {
    return this.granterAddress;
  }

  /** Get the signing client. */
  getSigningClient(): GranteeSignerClient | null {
    return this.signingClient;
  }

  /** Get the grantee address (session key address). */
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
      this.transport.setVisible(value);
      this._approvalListeners.forEach((cb) => cb(value));
    }
  }

  /** Cancel a pending approval (signing request). */
  cancelApproval(): void {
    if (this._cancelPendingApproval) {
      this._cancelPendingApproval();
      this._cancelPendingApproval = null;
    }
    this.setAwaitingApproval(false);
  }

  /**
   * Sign and broadcast a transaction with the user's direct authenticator (meta-account).
   */
  async signAndBroadcastWithMetaAccount(
    signerAddress: string,
    messages: readonly EncodeObject[],
    fee: StdFee | "auto" | number,
    memo?: string,
  ): Promise<SignAndBroadcastResult> {
    if (!this.transport.isMounted()) {
      throw new Error(
        "Iframe is not available. Ensure the iframe is mounted and the user is connected.",
      );
    }

    const txPayloadObj: TxTransportPayload = {
      messages: messages as TxTransportPayload["messages"],
      fee: fee as TxTransportPayload["fee"],
      memo,
    };
    validateTxPayload(txPayloadObj, "IframeController");

    this.setAwaitingApproval(true);
    try {
      const response = await new Promise<{ signedTx: SignAndBroadcastResult }>(
        (resolve, reject) => {
          this._cancelPendingApproval = () =>
            reject(new Error("User cancelled signing request"));

          this.transport
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
              IframeMessageType.SIGN_AND_BROADCAST,
              { transaction: { messages, fee, memo }, signerAddress },
              300_000,
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
   * Add or remove an authenticator on the user's account via the embedded
   * iframe. Mirrors the popup/redirect manage-authenticators surface.
   */
  // _signerAddress is unused: the iframe already knows the connected account.
  // The parameter exists for symmetry with PopupController/RedirectController.
  async promptManageAuthenticators(_signerAddress: string): Promise<void> {
    if (!this.transport.isMounted()) {
      throw new Error(
        "Iframe is not available. Ensure the iframe is mounted and the user is connected.",
      );
    }

    this.setAwaitingApproval(true);
    try {
      await new Promise<ManageAuthenticatorsResponse>((resolve, reject) => {
        this._cancelPendingApproval = () =>
          reject(new Error("User cancelled manage authenticators request"));

        this.transport
          .sendRequest<
            ManageAuthenticatorsPayload,
            ManageAuthenticatorsResponse
          >(IframeMessageType.MANAGE_AUTHENTICATORS, {}, 600_000)
          .then(resolve, reject);
      });
    } finally {
      this._cancelPendingApproval = null;
      this.setAwaitingApproval(false);
    }
  }

  /** Cleanup resources. */
  destroy(): void {
    this.abortPendingLogin();
    this.unsubscribePushMessages?.();
    this.unsubscribePushMessages = null;
    this.transport.unmount();
    this.eventEmitter.removeAllListeners();
    this.orchestrator.destroy();
    super.destroy();
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  /**
   * Mount the iframe showing the dashboard's "Connected" view.
   * Used after restoring a session from storage on page refresh.
   */
  private mountConnectedIframe(): void {
    if (!this.transport.hasContainer()) {
      return;
    }
    if (this.transport.isMounted()) {
      return;
    }

    const url = new URL(this.config.iframe.iframeUrl!);
    url.searchParams.set("mode", "inline");
    if (typeof window !== "undefined") {
      url.searchParams.set("redirect_uri", window.location.origin);
    }
    this.transport.mount({ url: url.toString(), origin: this.iframeOrigin });
  }

  /** Build the iframe URL with all required query params. */
  private buildIframeUrl(): string {
    const url = new URL(this.config.iframe.iframeUrl!);

    url.searchParams.set("mode", "inline");
    url.searchParams.set("grantee", this.granteeAddress!);
    if (typeof window !== "undefined") {
      url.searchParams.set("redirect_uri", window.location.origin);
    }

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
   * Handle push events from the dashboard (HARD_DISCONNECT etc.).
   * Routed through the active transport strategy.
   */
  private handlePushMessage(data: unknown): void {
    const event = data as { type?: string } | undefined;
    if (!event || typeof event.type !== "string") return;

    if (event.type === DashboardMessageType.HARD_DISCONNECT) {
      if (this.getState().status === "connected") {
        this.transport.unmount();
        this.handleDisconnect().catch((error) => {
          console.error(
            "[IframeController] Error handling hard disconnect:",
            error,
          );
        });
      }
    }
  }

  /**
   * Complete connection after receiving address from MessageChannel CONNECT response.
   *
   * Optional `throwIfAborted` is invoked between awaits so that a `cancelLogin()`
   * landing during finalization aborts before `SET_CONNECTED` dispatches on top
   * of an already-unmounted transport.
   */
  private async completeConnection(
    granterAddress: string,
    throwIfAborted: () => void = () => undefined,
  ): Promise<void> {
    this.granterAddress = granterAddress;

    await this.abstraxionAuth.setGranter(granterAddress);
    throwIfAborted();
    this.abstraxionAuth.abstractAccount = this.granteeWallet!;

    this.eventEmitter.emit("authenticated", { address: granterAddress });

    const signingClient = await this.abstraxionAuth.getSigner(
      GasPrice.fromString(this.config.gasPrice),
    );
    throwIfAborted();
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

  /** Handle disconnect — shared between SDK-initiated and iframe-initiated. */
  private async handleDisconnect(): Promise<void> {
    try {
      await this.abstraxionAuth.logout();
    } catch (error) {
      console.warn(
        "[IframeController] Logout failed during disconnect. Session data may persist and be restored on next load:",
        error,
      );
    }

    this.granterAddress = null;
    this.granteeWallet = null;
    this.granteeAddress = null;
    this.signingClient = null;

    this.eventEmitter.emit("disconnected", {});
    this.dispatch({ type: "EXPLICITLY_DISCONNECTED" });
  }
}
