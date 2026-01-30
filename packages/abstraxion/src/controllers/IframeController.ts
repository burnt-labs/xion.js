/**
 * Iframe Controller
 * Embedded iframe-based authentication flow
 *
 * This controller manages authentication and transaction signing via an embedded iframe,
 * replacing the deprecated @burnt-labs/xion-auth-sdk package.
 *
 * The iframe handles:
 * - User authentication (Stytch OAuth, Passkey, MetaMask, Keplr, etc.)
 * - Transaction signing with user's authenticator
 * - Grant permission UI
 *
 * The SDK (this controller) handles:
 * - Iframe lifecycle management
 * - MessageChannel communication
 * - Local session keypair generation
 * - GranteeSignerClient creation
 */

import {
  MessageChannelManager,
  SignArbSecp256k1HdWallet,
  GranteeSignerClient,
  TypedEventEmitter,
  IframeMessageType,
} from "@burnt-labs/abstraxion-core";
import type {
  ConnectResponse,
  RequestGrantResponse,
  IframeSDKEvents,
  StorageStrategy,
} from "@burnt-labs/abstraxion-core";
import { GasPrice } from "@cosmjs/stargate";
import type { AccountInfo } from "@burnt-labs/account-management";
import { BaseController } from "./BaseController";
import type { IframeAuthentication, NormalizedAbstraxionConfig } from "../types";

const KEYPAIR_STORAGE_KEY = "xion_abstraxion_grantee_keypair";

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
  /** Storage strategy */
  storageStrategy: StorageStrategy;
}

/**
 * Iframe Controller
 * Handles embedded iframe-based authentication flow
 */
export class IframeController extends BaseController {
  private config: IframeControllerConfig;
  private iframe: HTMLIFrameElement | null = null;
  private messageManager: MessageChannelManager;
  private iframeReady = false;
  private iframeReadyPromise: Promise<void> | null = null;
  private iframeOrigin: string;
  private granterAddress: string | null = null;
  private granteeWallet: SignArbSecp256k1HdWallet | null = null;
  private granteeAddress: string | null = null;
  private signingClient: GranteeSignerClient | null = null;
  private eventEmitter = new TypedEventEmitter<IframeSDKEvents>();

  /**
   * Factory method to create IframeController from NormalizedAbstraxionConfig
   */
  static fromConfig(
    config: NormalizedAbstraxionConfig,
    storageStrategy: StorageStrategy,
  ): IframeController {
    if (config.authentication?.type !== "iframe") {
      throw new Error("Iframe authentication config required for iframe mode");
    }

    const iframeConfig: IframeControllerConfig = {
      chainId: config.chainId,
      rpcUrl: config.rpcUrl,
      gasPrice: config.gasPrice,
      iframe: config.authentication,
      treasury: config.treasury,
      storageStrategy,
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
   * Initialize the controller
   * Attempts to restore existing session if available
   */
  async initialize(): Promise<void> {
    try {
      // Try to load stored session
      const storedGranter = await this.config.storageStrategy.getItem(
        "xion_abstraxion_granter",
      );
      const storedKeypair = await this.config.storageStrategy.getItem(
        KEYPAIR_STORAGE_KEY,
      );

      if (storedGranter && storedKeypair) {
        try {
          // Restore keypair
          this.granteeWallet = await SignArbSecp256k1HdWallet.deserialize(
            storedKeypair,
            "xion-abstraxion",
          );
          const accounts = await this.granteeWallet.getAccounts();
          this.granteeAddress = accounts[0]?.address || null;
          this.granterAddress = storedGranter;

          // Create signing client
          const signingClient = await this.createSigningClient();
          if (signingClient) {
            this.signingClient = signingClient;

            const accountInfo: AccountInfo = {
              keypair: this.granteeWallet,
              granterAddress: this.granterAddress,
              granteeAddress: this.granteeAddress!,
            };

            this.dispatch({
              type: "SET_CONNECTED",
              account: accountInfo,
              signingClient,
            });
            return;
          }
        } catch {
          // Clear invalid session data
          await this.clearStoredSession();
        }
      }

      // No valid session - go to idle
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
   * Connect using the iframe
   * Opens the authentication iframe and waits for user to complete auth flow
   */
  async connect(): Promise<void> {
    if (this.getState().status === "connected") {
      console.warn("[IframeController] Already connected");
      return;
    }

    this.dispatch({ type: "START_CONNECT" });

    try {
      // Initialize iframe if not already done
      if (!this.iframe) {
        await this.initializeIframe();
      }

      // Wait for iframe to be ready
      await this.waitForIframeReady();

      // Get or create local grantee keypair
      await this.getOrCreateGranteeWallet();

      // Build grant params if treasury is configured
      const grantParams = this.config.treasury
        ? {
            treasuryAddress: this.config.treasury,
            grantee: this.granteeAddress!,
          }
        : undefined;

      // Send connect request to iframe
      const response = await this.messageManager.sendRequest<
        { grantParams?: { treasuryAddress: string; grantee: string } },
        ConnectResponse
      >(
        this.iframe!,
        IframeMessageType.CONNECT,
        { grantParams },
        this.iframeOrigin,
        300000, // 5 minute timeout for user to authenticate
      );

      this.granterAddress = response.address;

      // Store session
      await this.config.storageStrategy.setItem(
        "xion_abstraxion_granter",
        response.address,
      );

      // Emit authenticated event
      this.eventEmitter.emit("authenticated", { address: response.address });

      // If grant was requested and succeeded, emit grantApproved
      if (grantParams) {
        this.eventEmitter.emit("grantApproved", {
          treasuryAddress: grantParams.treasuryAddress,
        });
      }

      // Create signing client
      const signingClient = await this.createSigningClient();
      if (!signingClient) {
        throw new Error("Failed to create signing client");
      }
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
   * Disconnect and cleanup
   */
  async disconnect(): Promise<void> {
    // Send disconnect to iframe if available
    if (this.iframe && this.iframeReady) {
      try {
        await this.messageManager.sendRequest(
          this.iframe,
          IframeMessageType.DISCONNECT,
          {},
          this.iframeOrigin,
          5000,
        );
      } catch (error) {
        console.error("[IframeController] Error disconnecting:", error);
      }
    }

    // Clear stored session
    await this.clearStoredSession();

    // Clear local state
    this.granterAddress = null;
    this.granteeWallet = null;
    this.granteeAddress = null;
    this.signingClient = null;

    // Emit disconnected event
    this.eventEmitter.emit("disconnected", {});

    // Reset state
    this.dispatch({ type: "RESET" });
  }

  /**
   * Request treasury grants
   * Opens the iframe to show grant permissions and deploy fee grant
   */
  async requestGrant(
    treasuryAddress: string,
    grantee: string,
  ): Promise<RequestGrantResponse> {
    if (!this.iframe || !this.iframeReady) {
      throw new Error("Iframe not ready. Call connect() first.");
    }

    try {
      const response = await this.messageManager.sendRequest<
        { treasuryAddress: string; grantee: string },
        RequestGrantResponse
      >(
        this.iframe,
        IframeMessageType.REQUEST_GRANT,
        { treasuryAddress, grantee },
        this.iframeOrigin,
        120000, // 2 minute timeout
      );

      this.eventEmitter.emit("grantApproved", { treasuryAddress });
      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to request grant";
      this.eventEmitter.emit("error", { error: errorMessage });
      throw error;
    }
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
   * Cleanup resources
   */
  destroy(): void {
    // Remove iframe from DOM
    if (this.iframe && this.iframe.parentNode) {
      this.iframe.parentNode.removeChild(this.iframe);
    }
    this.iframe = null;
    this.iframeReady = false;
    this.iframeReadyPromise = null;

    // Clear event listeners
    this.eventEmitter.removeAllListeners();

    super.destroy();
  }

  /**
   * Generate or retrieve the grantee keypair
   */
  private async getOrCreateGranteeWallet(): Promise<SignArbSecp256k1HdWallet> {
    if (this.granteeWallet) {
      return this.granteeWallet;
    }

    // Try to load from storage
    const stored = await this.config.storageStrategy.getItem(
      KEYPAIR_STORAGE_KEY,
    );
    if (stored) {
      try {
        this.granteeWallet = await SignArbSecp256k1HdWallet.deserialize(
          stored,
          "xion-abstraxion",
        );
        const accounts = await this.granteeWallet.getAccounts();
        this.granteeAddress = accounts[0]?.address || null;
        return this.granteeWallet;
      } catch {
        // Invalid stored data, generate new
        await this.config.storageStrategy.removeItem(KEYPAIR_STORAGE_KEY);
      }
    }

    // Generate new keypair
    this.granteeWallet = await SignArbSecp256k1HdWallet.generate(12, {
      prefix: "xion",
    });
    const accounts = await this.granteeWallet.getAccounts();
    this.granteeAddress = accounts[0]?.address || null;

    // Persist to storage
    const serialized = await this.granteeWallet.serialize("xion-abstraxion");
    await this.config.storageStrategy.setItem(KEYPAIR_STORAGE_KEY, serialized);

    return this.granteeWallet;
  }

  /**
   * Create a GranteeSignerClient for signing transactions
   */
  private async createSigningClient(): Promise<GranteeSignerClient | null> {
    if (!this.granterAddress || !this.granteeWallet || !this.granteeAddress) {
      return null;
    }

    try {
      return await GranteeSignerClient.connectWithSigner(
        this.config.rpcUrl,
        this.granteeWallet,
        {
          granterAddress: this.granterAddress,
          granteeAddress: this.granteeAddress,
          treasuryAddress: this.config.treasury,
          gasPrice: GasPrice.fromString(this.config.gasPrice),
        },
      );
    } catch (error) {
      console.error("[IframeController] Failed to create signing client:", error);
      return null;
    }
  }

  /**
   * Clear stored session data
   */
  private async clearStoredSession(): Promise<void> {
    await this.config.storageStrategy.removeItem("xion_abstraxion_granter");
    await this.config.storageStrategy.removeItem(KEYPAIR_STORAGE_KEY);
  }

  /**
   * Initialize the iframe and mount it to the DOM
   */
  private async initializeIframe(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Create iframe element
      const iframe = document.createElement("iframe");

      // Set iframe attributes
      iframe.src = this.config.iframe.iframeUrl!;
      iframe.style.position = "fixed";
      iframe.style.top = "0";
      iframe.style.left = "0";
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.border = "none";
      iframe.style.zIndex = "999999";
      iframe.style.display = this.config.iframe.alwaysVisible
        ? "block"
        : "none";
      iframe.allow =
        "publickey-credentials-get *; clipboard-read; clipboard-write";

      // Listen for modal state changes to show/hide iframe
      if (!this.config.iframe.alwaysVisible) {
        const handleModalStateChange = (event: MessageEvent) => {
          if (event.data.type === "MODAL_STATE_CHANGE" && this.iframe) {
            this.iframe.style.display = event.data.isOpen ? "block" : "none";
          }
        };
        window.addEventListener("message", handleModalStateChange);
      }

      // Set up IFRAME_READY listener
      this.setupIframeReadyListener();

      // Wait for iframe to load
      iframe.onload = () => {
        this.iframe = iframe;
        resolve();
      };

      iframe.onerror = () => {
        reject(new Error("Failed to load authentication iframe"));
      };

      // Mount iframe to DOM
      const container =
        this.config.iframe.containerElement || document.body;
      container.appendChild(iframe);
    });
  }

  /**
   * Set up the IFRAME_READY listener
   */
  private setupIframeReadyListener(): void {
    if (this.iframeReadyPromise) {
      return;
    }

    this.iframeReadyPromise = new Promise((resolve) => {
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === "IFRAME_READY") {
          this.iframeReady = true;
          window.removeEventListener("message", handleMessage);
          this.eventEmitter.emit("ready", {});

          resolve();
        }
      };

      window.addEventListener("message", handleMessage);

      // Timeout fallback
      setTimeout(() => {
        if (!this.iframeReady) {
          window.removeEventListener("message", handleMessage);
          console.warn(
            "[IframeController] Iframe ready timeout - proceeding anyway",
          );
          this.iframeReady = true;
          resolve();
        }
      }, 5000);
    });
  }

  /**
   * Wait for iframe to signal it's ready
   */
  private waitForIframeReady(): Promise<void> {
    if (this.iframeReady) {
      return Promise.resolve();
    }

    if (!this.iframeReadyPromise) {
      this.setupIframeReadyListener();
    }

    return this.iframeReadyPromise!;
  }
}
