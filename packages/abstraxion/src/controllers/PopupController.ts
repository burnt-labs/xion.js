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

import { AbstraxionAuth } from "@burnt-labs/abstraxion-core";
import type {
  StorageStrategy,
  RedirectStrategy,
} from "@burnt-labs/abstraxion-core";
import { fetchConfig, getDaoDaoIndexerUrl } from "@burnt-labs/constants";
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
import { toBase64 } from "../utils/encoding";

// postMessage types for the popup protocol
const CONNECT_SUCCESS = "CONNECT_SUCCESS";
const CONNECT_REJECTED = "CONNECT_REJECTED";

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
      // Resolve auth app URL: use explicit override or fetch from network config (same
      // mechanism as redirect mode — dashboardUrl comes from the chain's RPC config)
      const authAppUrl =
        this.config.popup.authAppUrl ||
        (await fetchConfig(this.config.rpcUrl)).dashboardUrl;

      if (!authAppUrl) {
        throw new Error(
          "Could not determine auth app URL from network config. " +
            "Provide authAppUrl in your authentication config as a fallback.",
        );
      }

      const authAppOrigin = new URL(authAppUrl).origin;

      // Generate keypair via AbstraxionAuth (same storage key as redirect mode)
      const keypair = await this.abstraxionAuth.generateAndStoreTempAccount();
      const granteeAddress = await this.abstraxionAuth.getKeypairAddress();

      const popupUrl = this.buildPopupUrl(granteeAddress, authAppUrl);

      const popup = window.open(
        popupUrl,
        "xion-auth-popup",
        "width=460,height=720,resizable=yes,scrollbars=yes,status=no,location=yes",
      );

      if (!popup) {
        this.dispatch({ type: "RESET" });
        throw new Error(
          "Popup was blocked by the browser. Please allow popups for this site and try again.",
        );
      }

      return new Promise<void>((resolve, reject) => {
        let settled = false;

        const messageHandler = (event: MessageEvent) => {
          // Only accept messages from the auth app origin
          if (event.origin !== authAppOrigin) return;

          const data = event.data as {
            type?: string;
            address?: string;
          };

          if (data?.type === CONNECT_SUCCESS && data.address) {
            if (settled) return;
            settled = true;
            cleanup();
            this.completeConnection(keypair, granteeAddress, data.address)
              .then(resolve)
              .catch(reject);
          }

          if (data?.type === CONNECT_REJECTED) {
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
      console.warn("[PopupController] Logout failed during disconnect. Session data may persist and be restored on next load:", error);
    }
    this.dispatch({ type: "RESET" });
  }

  /**
   * Open a signing popup and wait for the dashboard to sign + broadcast.
   *
   * The dashboard shows a SignTransactionView (approve / deny). On approve it
   * signs with the user's meta-account authenticator, broadcasts, and sends
   * the txHash back via postMessage. This is the popup-mode equivalent of the
   * external-wallet approval prompt in signer mode.
   */
  async promptAndSign(
    signerAddress: string,
    messages: readonly EncodeObject[],
    fee: StdFee | "auto" | number,
    memo?: string,
  ): Promise<DeliverTxResponse> {
    const authAppUrl =
      this.config.popup.authAppUrl ||
      (await fetchConfig(this.config.rpcUrl)).dashboardUrl;

    if (!authAppUrl) {
      throw new Error(
        "Could not determine auth app URL for signing popup. " +
          "Provide authAppUrl in your authentication config.",
      );
    }

    const authAppOrigin = new URL(authAppUrl).origin;

    // Encode transaction payload as base64 JSON
    const txPayload = JSON.stringify({ messages, fee, memo });
    const txEncoded = toBase64(txPayload);

    const url = new URL(authAppUrl);
    url.searchParams.set("mode", "sign");
    url.searchParams.set("tx", txEncoded);
    url.searchParams.set("granter", signerAddress);
    url.searchParams.set("redirect_uri", window.location.origin);

    const popup = window.open(
      url.toString(),
      "xion-sign-popup",
      "width=460,height=720,resizable=yes,scrollbars=yes,status=no,location=yes",
    );

    if (!popup) {
      throw new Error(
        "Signing popup was blocked by the browser. Please allow popups for this site.",
      );
    }

    return new Promise<DeliverTxResponse>((resolve, reject) => {
      let settled = false;

      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== authAppOrigin) return;

        const data = event.data as {
          type?: string;
          txHash?: string;
          message?: string;
        };

        if (data?.type === "SIGN_SUCCESS" && data.txHash) {
          if (settled) return;
          settled = true;
          cleanup();
          // Note: height, gasUsed, gasWanted are not available from the popup protocol.
          // Consumers should use the txHash to query the full transaction result if needed.
          resolve({
            code: 0,
            transactionHash: data.txHash,
            events: [],
            height: 0,
            gasUsed: BigInt(0),
            gasWanted: BigInt(0),
            msgResponses: [],
            txIndex: 0,
          });
        }

        if (data?.type === "SIGN_REJECTED") {
          if (settled) return;
          settled = true;
          cleanup();
          reject(new Error("Transaction was rejected by user"));
        }

        if (data?.type === "SIGN_ERROR") {
          if (settled) return;
          settled = true;
          cleanup();
          reject(new Error(data.message || "Transaction signing failed"));
        }
      };

      const closedCheck = setInterval(() => {
        if (popup.closed && !settled) {
          settled = true;
          cleanup();
          reject(new Error("Signing popup was closed"));
        }
      }, 500);

      const cleanup = () => {
        clearInterval(closedCheck);
        window.removeEventListener("message", messageHandler);
      };

      window.addEventListener("message", messageHandler);
    });
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  /**
   * Build the popup URL with all required query params
   */
  private buildPopupUrl(granteeAddress: string, authAppUrl: string): string {
    const url = new URL(authAppUrl);

    url.searchParams.set("grantee", granteeAddress);
    url.searchParams.set("redirect_uri", window.location.origin);
    // mode=popup tells the dashboard to close the window on completion instead of
    // redirecting to redirect_uri — important when window.opener is lost during
    // cross-origin OAuth sub-flows (Google/Apple)
    url.searchParams.set("mode", "popup");

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
   * Complete connection after receiving CONNECT_SUCCESS
   * Stores granter via AbstraxionAuth and creates GranteeSignerClient
   */
  private async completeConnection(
    keypair: import("@burnt-labs/abstraxion-core").SignArbSecp256k1HdWallet,
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
