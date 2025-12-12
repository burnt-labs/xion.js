/**
 * Connection Flow Orchestrator
 * Coordinates the complete connection flow by combining:
 * - accountConnection.ts: Connector connection & account discovery/creation
 * - grantCreation.ts: Authorization grant creation
 * - sessionRestoration.ts: Session restoration logic
 *
 * This orchestrator unifies all connector flows: session restoration, grant creation, account discovery
 * It delegates implementation to the separate flow modules while coordinating the overall sequence.
 */

import type {
  Connector,
  ConnectorConnectionResult,
  SignArbSecp256k1HdWallet,
} from "@burnt-labs/abstraxion-core";
import type { StorageStrategy } from "@burnt-labs/abstraxion-core";
import { GranteeSignerClient } from "@burnt-labs/abstraxion-core";
import { GasPrice } from "@cosmjs/stargate";
import type {
  SessionManager,
  GrantConfig,
  ConnectionResult,
  SessionRestorationResult,
  AccountCreationConfig,
} from "./types";
import type { CompositeAccountStrategy } from "../accounts";
import { restoreSession } from "./flow/sessionRestoration";
import { connectAccount } from "./flow/accountConnection";
import {
  createGrants,
  checkStorageGrants,
  type GrantCreationResult,
} from "./flow/grantCreation";
import { initiateRedirect, completeRedirect } from "./flow/redirectFlow";

/**
 * Configuration for ConnectionOrchestrator
 */
export interface ConnectionOrchestratorConfig {
  /** Session manager for keypair and granter storage */
  sessionManager: SessionManager;

  /** Storage strategy for accessing stored values (web: localStorage, React Native: AsyncStorage) */
  storageStrategy: StorageStrategy;

  /** Account discovery strategy (CompositeAccountStrategy from @burnt-labs/account-management) */
  accountStrategy?: CompositeAccountStrategy;

  /** Grant configuration */
  grantConfig?: GrantConfig;

  /** Account creation configuration (required if accounts need to be created) */
  accountCreationConfig?: AccountCreationConfig;

  /** Chain ID */
  chainId: string;

  /** RPC URL */
  rpcUrl: string;

  /** Gas price (e.g., "0.001uxion") */
  gasPrice: string;
}

/**
 * Connection Orchestrator
 * Coordinates the full connection flow: connect → discover account → create grants → ready
 */
export class ConnectionOrchestrator {
  private config: ConnectionOrchestratorConfig;

  constructor(config: ConnectionOrchestratorConfig) {
    this.config = config;
  }

  /**
   * Restore an existing session if valid
   * Checks for stored keypair and granter, then verifies grants on-chain
   * Optionally creates a signing client if createSigningClient is true
   *
   * @param createSigningClient - If true, creates signing client for restored session
   */
  async restoreSession(
    createSigningClient = false,
  ): Promise<SessionRestorationResult> {
    const signingClientConfig = createSigningClient
      ? {
          rpcUrl: this.config.rpcUrl,
          gasPrice: this.config.gasPrice,
          treasuryAddress: this.config.grantConfig?.treasury,
        }
      : undefined;

    return restoreSession(this.config.sessionManager, signingClientConfig);
  }

  /**
   * Check if grants exist in storage for a given smart account
   * Uses StorageStrategy to support both web and React Native
   */
  async checkStorageGrants(smartAccountAddress: string): Promise<{
    grantsExist: boolean;
    storedGranter: string | null;
    storedTempAccount: string | null;
  }> {
    return checkStorageGrants(smartAccountAddress, this.config.storageStrategy);
  }

  /**
   * Connect via a connector and discover/create smart account
   *
   * @param connector - The connector to use
   * @param authenticator - Optional authenticator string (if already known)
   * @returns Connection result with smart account address and connection info
   */
  async connect(
    connector: Connector,
    authenticator?: string,
  ): Promise<ConnectionResult> {
    if (!this.config.accountStrategy) {
      throw new Error(
        "Account strategy is required for connect() but was not provided",
      );
    }

    return connectAccount({
      connector,
      authenticator,
      chainId: this.config.chainId,
      rpcUrl: this.config.rpcUrl,
      accountStrategy: this.config.accountStrategy,
      accountCreationConfig: this.config.accountCreationConfig,
      sessionManager: this.config.sessionManager,
    });
  }

  /**
   * Create grants for a connected account
   *
   * @param smartAccountAddress - Smart account address (granter)
   * @param connectionResult - Connection result from connector
   * @param granteeAddress - Session key address (grantee)
   * @returns Result indicating success or failure
   */
  async createGrants(
    smartAccountAddress: string,
    connectionResult: ConnectorConnectionResult,
    granteeAddress: string,
  ): Promise<GrantCreationResult> {
    if (!this.config.grantConfig) {
      throw new Error("Grant config is required but not provided");
    }

    return createGrants({
      smartAccountAddress,
      connectionResult,
      granteeAddress,
      grantConfig: this.config.grantConfig,
      storageStrategy: this.config.storageStrategy,
      rpcUrl: this.config.rpcUrl,
      gasPrice: this.config.gasPrice,
    });
  }

  /**
   * Complete connection flow: connect → discover → create grants → ready
   */
  async connectAndSetup(
    connector: Connector,
    authenticator?: string,
  ): Promise<ConnectionResult> {
    if (!this.config.accountStrategy) {
      throw new Error(
        "Account strategy is required for connectAndSetup() but was not provided",
      );
    }

    // 1. Connect and discover account
    const connectionResult = await this.connect(connector, authenticator);

    // 2. Create grants if configured
    if (
      this.config.grantConfig?.treasury ||
      this.config.grantConfig?.contracts?.length ||
      this.config.grantConfig?.bank?.length ||
      this.config.grantConfig?.stake
    ) {
      const grantResult = await this.createGrants(
        connectionResult.smartAccountAddress,
        connectionResult.connectionInfo,
        connectionResult.granteeAddress,
      );

      if (!grantResult.success) {
        throw new Error(`Failed to create grants: ${grantResult.error}`);
      }
    } else {
      // No grants needed - just store granter
      await this.config.sessionManager.setGranter(
        connectionResult.smartAccountAddress,
      );
    }

    // Always create signing client after connection (with or without grants)
    const signingClient = await this.createSigningClient(
      connectionResult.sessionKeypair,
      connectionResult.smartAccountAddress,
      connectionResult.granteeAddress,
    );

    return {
      ...connectionResult,
      signingClient,
    };
  }

  /**
   * Initiate redirect flow
   * Uses AbstraxionAuth.redirectToDashboard() if available
   *
   * @returns Dashboard URL for state dispatch
   */
  async initiateRedirect(): Promise<{ dashboardUrl: string }> {
    return initiateRedirect(this.config.sessionManager, this.config.rpcUrl);
  }

  /**
   * Complete redirect flow after callback
   * Uses AbstraxionAuth.login() if available
   */
  async completeRedirect(): Promise<SessionRestorationResult> {
    return completeRedirect(this.config.sessionManager);
  }

  /**
   * Create signing client for grantee using session keypair
   * Used when grants already exist or after grants are created
   */
  private async createSigningClient(
    sessionKeypair: SignArbSecp256k1HdWallet,
    granterAddress: string,
    granteeAddress: string,
  ): Promise<GranteeSignerClient> {
    return GranteeSignerClient.connectWithSigner(
      this.config.rpcUrl,
      sessionKeypair,
      {
        gasPrice: GasPrice.fromString(this.config.gasPrice),
        granterAddress,
        granteeAddress,
        treasuryAddress: this.config.grantConfig?.treasury,
      },
    );
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    // No cleanup needed
  }
}
