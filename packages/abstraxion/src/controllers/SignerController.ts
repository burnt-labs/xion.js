/**
 * Signer Controller
 * Headless connector-based flow for external signers (Turnkey, Privy, Web3Auth, etc.)
 * Uses ConnectionOrchestrator to handle the full connection flow
 */

import {
  ExternalSignerConnector,
  type ConnectorConnectionResult,
} from "@burnt-labs/abstraxion-core";
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
import type { EncodeObject } from "@cosmjs/proto-signing";
import { GasPrice } from "@cosmjs/stargate";
import type { StdFee, DeliverTxResponse } from "@cosmjs/stargate";
import {
  AAClient,
  createSignerFromSigningFunction,
  type AuthenticatorType,
} from "@burnt-labs/signers";
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
  private initializePromise: Promise<void> | null = null;
  private connector: Connector | null = null;
  private connectionInfo: ConnectorConnectionResult | null = null; // signmessage and authenticator metadata needed for direct signing

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
   * Attempts to restore existing session if available.
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

      // 4. Store connection info for direct signing
      this.connectionInfo = connectionResult.connectionInfo;

      // 6. Get session keypair for account info
      const sessionKeypair = await this.config.sessionManager.getLocalKeypair();
      if (!sessionKeypair) {
        throw new Error("Session keypair not found after connection");
      }

      // 7. Dispatch success
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
   * Get connection info for direct signing
   * Returns the connector connection result which includes signMessage function
   * Used by useAbstraxionSigningClient to create AAClient for direct signing
   */
  getConnectionInfo(): ConnectorConnectionResult | undefined {
    return this.connectionInfo ?? undefined;
  }

  /**
   * Sign and broadcast a transaction using the user's direct authenticator (meta-account).
   *
   * Uses the connectionInfo from connect() to create an AAClient and sign
   * the transaction directly with the user's authenticator.
   */
  async signWithMetaAccount(
    signerAddress: string,
    messages: readonly EncodeObject[],
    fee: StdFee | "auto" | number,
    memo?: string,
  ): Promise<DeliverTxResponse> {
    if (!this.connectionInfo) {
      throw new Error(
        "No authenticator available for direct signing. Please reconnect your wallet.",
      );
    }

    const authenticatorType = this.connectionInfo.metadata?.authenticatorType;
    if (!authenticatorType) {
      throw new Error(
        "Authenticator type not found in connection metadata. Please reconnect your wallet.",
      );
    }

    const authenticatorIndex =
      this.connectionInfo.metadata?.authenticatorIndex ?? 0;

    const signer = createSignerFromSigningFunction({
      smartAccountAddress: signerAddress,
      authenticatorIndex,
      authenticatorType: authenticatorType as AuthenticatorType,
      signMessage: this.connectionInfo.signMessage,
    });

    const client = await AAClient.connectWithSigner(
      this.config.rpcUrl,
      signer,
      { gasPrice: GasPrice.fromString(this.config.gasPrice) },
    );

    return client.signAndBroadcast(signerAddress, messages, fee, memo);
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
        console.warn(
          "[SignerController] Connector disconnect failed. Session data may persist:",
          error,
        );
      }
      this.connector = null;
    }

    // Clear connection info
    this.connectionInfo = null;

    // Cleanup session
    try {
      await this.config.sessionManager.logout();
    } catch (error) {
      console.warn("[SignerController] Session cleanup failed during disconnect. Session data may persist and be restored on next load:", error);
    }

    // Reset state
    this.dispatch({ type: "RESET" });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.orchestrator.destroy();
    super.destroy();
  }
}
