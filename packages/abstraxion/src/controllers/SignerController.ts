/**
 * Signer Controller
 * Headless connector-based flow for external signers (Turnkey, Privy, Web3Auth, etc.)
 * Uses ConnectionOrchestrator to handle the full connection flow
 */

import { ExternalSignerConnector } from "@burnt-labs/abstraxion-core";
import {
  ConnectionOrchestrator,
  SessionManager,
  AccountInfo,
  CompositeAccountStrategy,
  GrantConfig,
  AccountCreationConfig,
  isSessionRestorationError,
  isSessionRestored,
  getAccountInfoFromRestored,
} from "@burnt-labs/account-management";
import type { Connector, StorageStrategy } from "@burnt-labs/abstraxion-core";
import { BaseController } from "./BaseController";
import type { ControllerConfig } from "./types";
import type { SignerAuthentication } from "../types";
import {
  createAccountStrategyFromConfig,
  createGrantConfigFromConfig,
  createAccountCreationConfigFromConfig,
} from "../utils/normalizeAbstraxionConfig";
import { isSessionManager } from "./typeGuards";

/**
 * Configuration for SignerController
 */
export interface SignerControllerConfig extends ControllerConfig {
  /** Signer authentication config */
  signer: SignerAuthentication;

  /** Account discovery strategy */
  accountStrategy: CompositeAccountStrategy;

  /** Grant configuration */
  grantConfig?: GrantConfig;

  /** Account creation configuration (required for account creation) */
  accountCreationConfig?: AccountCreationConfig;

  /** Session manager for keypair and granter storage */
  sessionManager: SessionManager;

  /** Storage strategy (web: localStorage, React Native: AsyncStorage) */
  storageStrategy: StorageStrategy;
}

/**
 * Signer Controller
 * Handles headless connector-based authentication flow
 */
export class SignerController extends BaseController {
  private config: SignerControllerConfig;
  private orchestrator: ConnectionOrchestrator;
  private connector: Connector | null = null;

  /**
   * Factory method to create SignerController from NormalizedAbstraxionConfig
   * Handles all config transformation and validation internally
   */
  static fromConfig(
    config: import("../types").NormalizedAbstraxionConfig,
    storageStrategy: StorageStrategy,
    abstraxionAuth: import("@burnt-labs/abstraxion-core").AbstraxionAuth,
  ): SignerController {
    if (config.authentication?.type !== "signer") {
      throw new Error("Signer authentication config required for signer mode");
    }

    // Validate that AbstraxionAuth implements SessionManager interface
    if (!isSessionManager(abstraxionAuth)) {
      throw new Error(
        "AbstraxionAuth does not implement SessionManager interface",
      );
    }

    const signerAuth = config.authentication;
    const smartAccountContract = signerAuth.smartAccountContract;

    if (smartAccountContract && !config.feeGranter) {
      throw new Error(
        "feeGranter is required in AbstraxionConfig when using signer mode with smartAccountContract",
      );
    }

    // Use utility functions to create configs
    const accountStrategy = createAccountStrategyFromConfig(config, signerAuth);
    const grantConfig = createGrantConfigFromConfig(config, signerAuth);
    const accountCreationConfig = createAccountCreationConfigFromConfig(
      config,
      signerAuth,
    );

    const signerConfig: SignerControllerConfig = {
      chainId: config.chainId,
      rpcUrl: config.rpcUrl,
      gasPrice: config.gasPrice,
      signer: signerAuth,
      accountStrategy,
      grantConfig,
      accountCreationConfig,
      sessionManager: abstraxionAuth,
      storageStrategy,
    };

    return new SignerController(signerConfig);
  }

  constructor(config: SignerControllerConfig) {
    // Always start in 'initializing' state for consistent SSR/client behavior
    // This ensures UI immediately shows loading state and doesn't assume readiness
    super(config.initialState || { status: "initializing" });
    this.config = config;

    // Create orchestrator
    this.orchestrator = new ConnectionOrchestrator({
      sessionManager: config.sessionManager,
      storageStrategy: config.storageStrategy,
      accountStrategy: config.accountStrategy,
      grantConfig: config.grantConfig,
      accountCreationConfig: config.accountCreationConfig,
      chainId: config.chainId,
      rpcUrl: config.rpcUrl,
      gasPrice: config.gasPrice,
    });
  }

  /**
   * Initialize the controller
   * Attempts to restore existing session if available
   */
  async initialize(): Promise<void> {
    // Already in initializing state, so no need to dispatch INITIALIZE
    // Just proceed with session restoration

    try {
      // Try to restore existing session (with signing client creation)
      const restorationResult = await this.orchestrator.restoreSession(true);

      if (
        isSessionRestored(restorationResult) &&
        restorationResult.signingClient
      ) {
        // Session restored successfully - extract AccountInfo using type-safe helper
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
      // Client must call connect() manually (e.g., via onSuccess callback from external auth provider Or useEffect)
      this.dispatch({ type: "RESET" });
    } catch (error) {
      console.error("[SignerController] Initialization error:", error);
      // Unexpected error during initialization (network, config, etc.) - show to user
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
   * Connect using the signer
   * Creates ExternalSignerConnector and uses orchestrator to handle flow
   */
  async connect(): Promise<void> {
    if (this.getState().status === "connected") {
      console.warn("[SignerController] Already connected");
      return;
    }

    this.dispatch({ type: "START_CONNECT" });

    try {
      // 1. Get signer config from developer's function
      const signerConfig = await this.config.signer.getSignerConfig();

      // 2. Create ExternalSignerConnector
      this.connector = new ExternalSignerConnector({
        id: "external-signer",
        name: "External Signer",
        getSignerConfig: async () => signerConfig,
      });

      // 3. Use orchestrator to connect and setup
      const connectionResult = await this.orchestrator.connectAndSetup(
        this.connector,
        signerConfig.authenticator,
      );

      // 4. Get session keypair for account info
      const sessionKeypair = await this.config.sessionManager.getLocalKeypair();
      if (!sessionKeypair) {
        throw new Error("Session keypair not found after connection");
      }

      // 5. Dispatch success
      const accounts = await sessionKeypair.getAccounts();
      //TODO: fix this to allow multiple accounts long term
      const granteeAddress = accounts[0].address;

      const accountInfo: AccountInfo = {
        keypair: sessionKeypair,
        granterAddress: connectionResult.smartAccountAddress,
        granteeAddress,
      };

      if (!connectionResult.signingClient) {
        throw new Error("Signing client not available after connection");
      }

      this.dispatch({
        type: "SET_CONNECTED",
        account: accountInfo,
        signingClient: connectionResult.signingClient,
      });
    } catch (error) {
      console.error("[SignerController] Connection error:", error);
      this.dispatch({
        type: "SET_ERROR",
        error: error instanceof Error ? error.message : "Connection failed",
      });
      throw error;
    }
  }

  /**
   * Update the getSignerConfig function reference
   * This allows updating the function when config changes without recreating the controller
   */
  updateGetSignerConfig(
    getSignerConfig: SignerAuthentication["getSignerConfig"],
  ): void {
    this.config.signer.getSignerConfig = getSignerConfig;
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect(): Promise<void> {
    // Disconnect connector if connected
    if (this.connector) {
      try {
        await this.connector.disconnect();
      } catch (error) {
        console.error(
          "[SignerController] Error disconnecting connector:",
          error,
        );
      }
      this.connector = null;
    }

    // Cleanup session
    try {
      await this.config.sessionManager.logout();
    } catch (error) {
      console.error("[SignerController] Error cleaning up session:", error);
    }

    // Reset state
    this.dispatch({ type: "RESET" });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    super.destroy();
  }
}
