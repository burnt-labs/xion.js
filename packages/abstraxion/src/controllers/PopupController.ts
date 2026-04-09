/**
 * Popup Controller
 * Popup-window-based authentication flow
 *
 * Opens the auth app in a popup window. The user stays on the dApp page —
 * auth happens in a separate popup tab that closes itself when done.
 *
 * Config: use { type: "popup" } in AbstraxionProvider.
 *
 * The controller:
 * 1. Delegates keypair generation/storage/retrieval to AbstraxionAuth (same keys as redirect)
 * 2. Opens the popup with URL params (grantee, treasury, callbackOrigin, etc.)
 * 3. Listens for CONNECT_SUCCESS / CONNECT_REJECTED postMessages
 * 4. On success: stores granter via AbstraxionAuth, gets GranteeSignerClient, dispatches SET_CONNECTED
 * 5. Monitors for popup closed (user cancelled) and dispatches RESET
 */

import {
  AbstraxionAuth,
  DashboardMessageType,
} from "@burnt-labs/abstraxion-core";
import type {
  StorageStrategy,
  RedirectStrategy,
  SignArbSecp256k1HdWallet,
} from "@burnt-labs/abstraxion-core";
import { getDaoDaoIndexerUrl } from "@burnt-labs/constants";
import { resolveAuthAppUrl, buildDashboardUrl } from "./utils";
import { GasPrice } from "@cosmjs/stargate";
import type { EncodeObject } from "@cosmjs/proto-signing";
import type { StdFee, DeliverTxResponse } from "@cosmjs/stargate";
import {
  ConnectionOrchestrator,
  isSessionRestorationError,
  isSessionRestored,
  getAccountInfoFromRestored,
} from "@burnt-labs/account-management";
import type { AccountInfo } from "@burnt-labs/account-management";
import { BaseController } from "./BaseController";
import type { PopupAuthentication, NormalizedAbstraxionConfig } from "../types";
import {
  toBase64,
  validateTxPayload,
  type TxTransportPayload,
} from "@burnt-labs/signers";

export interface PopupControllerConfig {
  chainId: string;
  rpcUrl: string;
  gasPrice: string;
  popup: PopupAuthentication;
  treasury?: string;
  bank?: Array<{ denom: string; amount: string }>;
  stake?: boolean;
  contracts?: Array<
    | string
    | { address: string; amounts: Array<{ denom: string; amount: string }> }
  >;
  storageStrategy: StorageStrategy;
  redirectStrategy: RedirectStrategy;
}

export class PopupController extends BaseController {
  private config: PopupControllerConfig;
  private abstraxionAuth: AbstraxionAuth;
  private orchestrator: ConnectionOrchestrator;
  private initializePromise: Promise<void> | null = null;
  private pendingCleanup: (() => void) | null = null;

  static fromConfig(
    config: NormalizedAbstraxionConfig,
    storageStrategy: StorageStrategy,
    redirectStrategy: RedirectStrategy,
  ): PopupController {
    if (config.authentication?.type !== "popup") {
      throw new Error(
        'PopupController requires authentication: { type: "popup" }',
      );
    }

    const popupConfig: PopupControllerConfig = {
      chainId: config.chainId,
      rpcUrl: config.rpcUrl,
      gasPrice: config.gasPrice,
      popup: config.authentication,
      treasury: config.treasury,
      bank: config.bank,
      stake: config.stake,
      contracts: config.contracts,
      storageStrategy,
      redirectStrategy,
    };

    return new PopupController(popupConfig);
  }

  constructor(config: PopupControllerConfig) {
    super({ status: "initializing" });
    this.config = config;

    // Create AbstraxionAuth for keypair/session management — same as redirect mode
    this.abstraxionAuth = new AbstraxionAuth(
      config.storageStrategy,
      config.redirectStrategy,
    );

    // Provide treasuryIndexerUrl so pollForGrants() can verify treasury grants
    // on session restore (same as RedirectController)
    const treasuryIndexerUrl = config.treasury
      ? getDaoDaoIndexerUrl(config.chainId)
      : undefined;

    this.abstraxionAuth.configureAbstraxionInstance(
      config.rpcUrl,
      config.contracts,
      config.stake,
      config.bank,
      undefined, // callbackUrl — not used in popup mode
      config.treasury,
      treasuryIndexerUrl,
      config.gasPrice,
    );

    // Create orchestrator for session restoration (same pattern as RedirectController/SignerController)
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
   * Initialize: attempt to restore a prior session from storage
   * Uses orchestrator.restoreSession() — same pattern as RedirectController and SignerController.
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

        this.dispatch({
          type: "SET_CONNECTED",
          account: accountInfo,
          signingClient: restorationResult.signingClient,
        });
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
      console.error("[PopupController] Initialization error:", error);
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
   * Connect: open auth popup and wait for CONNECT_SUCCESS postMessage
   */
  async connect(): Promise<void> {
    if (this.getState().status === "connected") {
      console.warn("[PopupController] Already connected");
      return;
    }

    this.dispatch({ type: "START_CONNECT" });

    try {
      const authAppUrl = await resolveAuthAppUrl(this.config.rpcUrl, this.config.popup.authAppUrl);
      const authAppOrigin = new URL(authAppUrl).origin;

      // Generate keypair via AbstraxionAuth (same storage key as redirect mode)
      const keypair = await this.abstraxionAuth.generateAndStoreTempAccount();
      const granteeAddress = await this.abstraxionAuth.getKeypairAddress();

      // Build connection URL. mode=popup tells the dashboard to close the window
      // on completion instead of redirecting — important when window.opener is
      // lost during cross-origin OAuth sub-flows (Google/Apple).
      const connectUrl = new URL(authAppUrl);
      connectUrl.searchParams.set("mode", "popup");
      connectUrl.searchParams.set("grantee", granteeAddress);
      connectUrl.searchParams.set("redirect_uri", window.location.origin);
      if (this.config.treasury) connectUrl.searchParams.set("treasury", this.config.treasury);
      if (this.config.bank) connectUrl.searchParams.set("bank", JSON.stringify(this.config.bank));
      if (this.config.stake) connectUrl.searchParams.set("stake", "true");
      if (this.config.contracts) connectUrl.searchParams.set("contracts", JSON.stringify(this.config.contracts));

      const popup = this.openPopupWindow(connectUrl.toString(), "xion-auth-popup");

      return new Promise<void>((resolve, reject) => {
        let settled = false;

        const messageHandler = (event: MessageEvent) => {
          // Only accept messages from the auth app origin
          if (event.origin !== authAppOrigin) return;

          const data = event.data as {
            type?: string;
            address?: string;
          };

          if (
            data?.type === DashboardMessageType.CONNECT_SUCCESS &&
            data.address
          ) {
            if (settled) return;
            settled = true;
            cleanup();
            this.completeConnection(keypair, granteeAddress, data.address)
              .then(resolve)
              .catch(reject);
          }

          if (data?.type === DashboardMessageType.CONNECT_REJECTED) {
            if (settled) return;
            settled = true;
            cleanup();
            this.dispatch({ type: "RESET" });
            reject(new Error("Connection rejected by user"));
          }
        };

        // Monitor for popup closed by user without completing auth
        const closedCheck = setInterval(() => {
          if (popup.closed && !settled) {
            settled = true;
            cleanup();
            this.dispatch({ type: "RESET" });
            reject(new Error("Authentication popup was closed"));
          }
        }, 500);

        const cleanup = () => {
          clearInterval(closedCheck);
          window.removeEventListener("message", messageHandler);
          this.pendingCleanup = null;
        };

        this.pendingCleanup = cleanup;
        window.addEventListener("message", messageHandler);
      });
    } catch (error) {
      console.error("[PopupController] Connection error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Connection failed";
      this.dispatch({ type: "SET_ERROR", error: errorMessage });
      throw error;
    }
  }

  /**
   * Disconnect and clean up via AbstraxionAuth
   */
  async disconnect(): Promise<void> {
    try {
      await this.abstraxionAuth.logout();
    } catch (error) {
      console.warn(
        "[PopupController] Logout failed during disconnect. Session data may persist and be restored on next load:",
        error,
      );
    }
    this.dispatch({ type: "EXPLICITLY_DISCONNECTED" });
  }

  /**
   * Open a signing popup and wait for the dashboard to sign + broadcast.
   *
   * The dashboard shows a SignTransactionView (approve / deny). On approve it
   * signs with the user's meta-account authenticator, broadcasts, and sends
   * the txHash back via postMessage. This is the popup-mode equivalent of the
   * external-wallet approval prompt in signer mode.
   */
  async promptSignAndBroadcast(
    signerAddress: string,
    messages: readonly EncodeObject[],
    fee: StdFee | "auto" | number,
    memo?: string,
  ): Promise<DeliverTxResponse> {
    const authAppUrl = await resolveAuthAppUrl(this.config.rpcUrl, this.config.popup.authAppUrl);
    const authAppOrigin = new URL(authAppUrl).origin;

    const txPayloadObj: TxTransportPayload = { messages, fee, memo };
    validateTxPayload(txPayloadObj, "PopupController");

    const url = buildDashboardUrl(authAppUrl, "sign", signerAddress, window.location.origin, {
      tx: toBase64(JSON.stringify(txPayloadObj)),
    });

    const popup = this.openPopupWindow(url.toString(), "xion-sign-popup");

    return this.waitForPopupMessage<DeliverTxResponse>(
      popup,
      authAppOrigin,
      (data, resolve, reject) => {
        if (data.type === DashboardMessageType.SIGN_SUCCESS && data.txHash) {
          // Note: height, gasUsed, gasWanted are not available from the popup protocol.
          // Consumers should use the txHash to query the full transaction result if needed.
          resolve({
            code: 0,
            transactionHash: data.txHash as string,
            events: [],
            height: 0,
            gasUsed: BigInt(0),
            gasWanted: BigInt(0),
            msgResponses: [],
            txIndex: 0,
          });
        } else if (data.type === DashboardMessageType.SIGN_REJECTED) {
          reject(new Error("Transaction was rejected by user"));
        } else if (data.type === DashboardMessageType.SIGN_ERROR) {
          reject(new Error((data.message as string) || "Transaction signing failed"));
        }
      },
      { name: "Signing popup" },
    );
  }

  /**
   * Open a popup to add an authenticator to the user's account.
   *
   * The dashboard shows AddAuthenticatorsForm (approve / skip). On success it
   * posts ADD_AUTHENTICATOR_SUCCESS back; on cancel it posts ADD_AUTHENTICATOR_REJECTED.
   */
  async promptAddAuthenticators(signerAddress: string): Promise<void> {
    const authAppUrl = await resolveAuthAppUrl(this.config.rpcUrl, this.config.popup.authAppUrl);
    const authAppOrigin = new URL(authAppUrl).origin;

    const url = buildDashboardUrl(authAppUrl, "add-authenticators", signerAddress, window.location.origin);
    const popup = this.openPopupWindow(url.toString(), "xion-add-auth-popup");

    return this.waitForPopupMessage<void>(
      popup,
      authAppOrigin,
      (data, resolve, reject) => {
        if (data.type === DashboardMessageType.ADD_AUTHENTICATOR_SUCCESS) {
          resolve();
        } else if (data.type === DashboardMessageType.ADD_AUTHENTICATOR_REJECTED) {
          reject(new Error("Add authenticator cancelled by user"));
        } else if (data.type === DashboardMessageType.ADD_AUTHENTICATOR_ERROR) {
          reject(new Error((data.message as string) || "Failed to add authenticator"));
        }
      },
      { name: "Add authenticators popup", timeoutMs: 10 * 60 * 1000 },
    );
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  /**
   * Open a popup window and throw if the browser blocked it.
   */
  private openPopupWindow(url: string, name: string): Window {
    const popup = window.open(
      url,
      name,
      "width=460,height=720,resizable=yes,scrollbars=yes,status=no,location=yes",
    );
    if (!popup) {
      throw new Error(
        "Popup was blocked by the browser. Please allow popups for this site.",
      );
    }
    return popup;
  }

  /**
   * Wait for a postMessage result from a popup window.
   *
   * @param popup     - The popup window returned by window.open
   * @param origin    - The expected message origin (validated on every message)
   * @param onMessage - Called for each message from the popup; call resolve/reject to settle
   * @param options   - Optional timeout and label for error messages
   */
  private waitForPopupMessage<T>(
    popup: Window,
    origin: string,
    onMessage: (
      data: Record<string, unknown>,
      resolve: (value: T) => void,
      reject: (error: Error) => void,
    ) => void,
    options?: { timeoutMs?: number; name?: string; onRegisterCleanup?: (cleanup: () => void) => void },
  ): Promise<T> {
    const label = options?.name ?? "Popup";

    return new Promise<T>((resolve, reject) => {
      let settled = false;

      const settle = (fn: () => void) => {
        if (settled) return;
        settled = true;
        cleanup();
        fn();
      };

      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== origin) return;
        onMessage(
          event.data as Record<string, unknown>,
          (v) => settle(() => resolve(v)),
          (e) => settle(() => reject(e)),
        );
      };

      const closedCheck = setInterval(() => {
        if (popup.closed) {
          settle(() => reject(new Error(`${label} was closed`)));
        }
      }, 500);

      let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
      if (options?.timeoutMs !== undefined) {
        timeoutHandle = setTimeout(() => {
          settle(() => {
            try { popup.close(); } catch { /* ignore */ }
            reject(new Error(`${label} timed out`));
          });
        }, options.timeoutMs);
      }

      const cleanup = () => {
        clearInterval(closedCheck);
        if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
        window.removeEventListener("message", messageHandler);
      };

      options?.onRegisterCleanup?.(cleanup);
      window.addEventListener("message", messageHandler);
    });
  }

  /**
   * Complete connection after receiving CONNECT_SUCCESS
   * Stores granter via AbstraxionAuth and creates GranteeSignerClient
   */
  private async completeConnection(
    keypair: SignArbSecp256k1HdWallet,
    granteeAddress: string,
    granterAddress: string,
  ): Promise<void> {
    // Persist granter via AbstraxionAuth (same key as redirect mode)
    await this.abstraxionAuth.setGranter(granterAddress);

    // getSigner() requires abstractAccount to be set in-memory; sync it now.
    this.abstraxionAuth.abstractAccount = keypair;

    // Get signing client via AbstraxionAuth
    const signingClient = await this.abstraxionAuth.getSigner(
      GasPrice.fromString(this.config.gasPrice),
    );

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
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.pendingCleanup?.();
    this.pendingCleanup = null;
    super.destroy();
    this.orchestrator.destroy();
  }
}
