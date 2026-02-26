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
import { fetchConfig } from "@burnt-labs/constants";
import { GasPrice } from "@cosmjs/stargate";
import type { EncodeObject } from "@cosmjs/proto-signing";
import type { StdFee, DeliverTxResponse } from "@cosmjs/stargate";
import type { AccountInfo } from "@burnt-labs/account-management";
import { BaseController } from "./BaseController";
import type { PopupAuthentication, NormalizedAbstraxionConfig } from "../types";

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

    this.abstraxionAuth.configureAbstraxionInstance(
      config.rpcUrl,
      config.contracts,
      config.stake,
      config.bank,
      undefined, // callbackUrl — not used in popup mode
      config.treasury,
      undefined, // treasuryIndexerUrl — not needed for URL building
      config.gasPrice,
    );
  }

  /**
   * Initialize: attempt to restore a prior session from storage (same keys as redirect)
   */
  async initialize(): Promise<void> {
    try {
      const keypair = await this.abstraxionAuth.getLocalKeypair();
      const granterAddress = await this.abstraxionAuth.getGranter();

      if (keypair && granterAddress) {
        // getSigner() checks this.abstractAccount (in-memory); getLocalKeypair()
        // only reads from storage, so we must sync the in-memory property here.
        this.abstraxionAuth.abstractAccount = keypair;
        try {
          const accounts = await keypair.getAccounts();
          const granteeAddress = accounts[0]?.address;

          if (granteeAddress) {
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
            return;
          }
        } catch {
          // Stored session is invalid — clear and fall through to idle
          await this.abstraxionAuth.logout();
        }
      }

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
        const messageHandler = (event: MessageEvent) => {
          // Only accept messages from the auth app origin
          if (event.origin !== authAppOrigin) return;

          const data = event.data as {
            type?: string;
            address?: string;
          };

          if (data?.type === CONNECT_SUCCESS && data.address) {
            cleanup();
            this.completeConnection(keypair, granteeAddress, data.address)
              .then(resolve)
              .catch(reject);
          }

          if (data?.type === CONNECT_REJECTED) {
            cleanup();
            this.dispatch({ type: "RESET" });
            reject(new Error("Connection rejected by user"));
          }
        };

        // Monitor for popup closed by user without completing auth
        const closedCheck = setInterval(() => {
          if (popup.closed) {
            // Check if we've already completed (CONNECT_SUCCESS arrived just before close)
            if (this.getState().status !== "connected") {
              cleanup();
              this.dispatch({ type: "RESET" });
              reject(new Error("Authentication popup was closed"));
            }
          }
        }, 500);

        const cleanup = () => {
          clearInterval(closedCheck);
          window.removeEventListener("message", messageHandler);
        };

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
    await this.abstraxionAuth.logout();
    this.dispatch({ type: "RESET" });
  }

  /**
   * Direct signing not supported in popup mode (same constraint as redirect)
   */
  async signWithMetaAccount(
    _signerAddress: string,
    _messages: readonly EncodeObject[],
    _fee: StdFee | "auto" | number,
    _memo?: string,
  ): Promise<DeliverTxResponse> {
    throw new Error(
      "Direct signing is not supported in popup mode. " +
        "Use signer mode (external wallets like Turnkey, Privy, etc.) " +
        "for transactions that require requireAuth: true.",
    );
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
}
