import { randomBytes } from "node:crypto";
import NodeCache from "node-cache";
import type { IncomingMessage } from "node:http";
import { GasPrice } from "@cosmjs/stargate";
import {
  AbstraxionAuth,
  ContractGrantDescription,
  SpendLimit,
} from "@burnt-labs/abstraxion-core";
import { fetchConfig, xionGasValues } from "@burnt-labs/constants";
import {
  AbstraxionBackendConfig,
  ConnectionInitResponse,
  CallbackRequest,
  CallbackResponse,
  StatusResponse,
  DisconnectResponse,
  Permissions,
  XionKeypair,
} from "../types";
import * as e from "../types/errors";
import { SessionKeyManager } from "../services/SessionKeyManager";
import {
  DatabaseRedirectStrategy,
  DatabaseStorageStrategy,
  InMemoryDummyRedirectStrategy,
} from "../adapters/AbstraxionStategies";

export class AbstraxionBackend {
  public readonly sessionKeyManager: SessionKeyManager;
  private readonly _stateStore: NodeCache;
  private readonly _gasPriceDefault: GasPrice;

  constructor(private readonly config: AbstraxionBackendConfig) {
    // Validate configuration
    if (!config.encryptionKey) {
      throw new e.EncryptionKeyRequiredError();
    }
    if (!config.databaseAdapter) {
      throw new e.DatabaseAdapterRequiredError();
    }
    if (!config.redirectUrl) {
      throw new e.RedirectUrlRequiredError();
    }
    if (!config.treasury) {
      throw new e.TreasuryRequiredError();
    }
    if (!config.rpcUrl) {
      throw new e.RpcUrlRequiredError();
    }

    let gasPriceDefault: GasPrice;
    const { gasPrice: gasPriceConstant } = xionGasValues;
    if (config.rpcUrl.includes("mainnet")) {
      gasPriceDefault = GasPrice.fromString(gasPriceConstant);
    } else {
      gasPriceDefault = GasPrice.fromString("0.001uxion");
    }
    this._gasPriceDefault = gasPriceDefault;

    // Initialize node-cache with 10 minutes TTL and automatic cleanup
    this._stateStore = new NodeCache({
      stdTTL: 600, // 10 minutes in seconds
      checkperiod: 60, // Check for expired keys every minute
      useClones: false, // Don't clone objects for better performance
    });

    this.sessionKeyManager = new SessionKeyManager(config.databaseAdapter, {
      encryptionKey: config.encryptionKey,
      sessionKeyExpiryMs: config.sessionKeyExpiryMs,
      refreshThresholdMs: config.refreshThresholdMs,
      enableAuditLogging: config.enableAuditLogging,
    });
  }

  /**
   * Get the default gas price
   */
  public get gasPriceDefault(): GasPrice {
    return this._gasPriceDefault;
  }

  /**
   * Initiate wallet connection flow
   * Generate session key and return authorization URL
   */
  async connectInit(
    userId: string,
    permissions?: Permissions,
    grantedRedirectUrl?: string,
  ): Promise<ConnectionInitResponse> {
    // Validate input parameters
    if (!userId) {
      throw new e.UserIdRequiredError();
    }

    try {
      // Generate session key
      const sessionKey = await this.sessionKeyManager.generateSessionKeypair();

      // Generate OAuth state parameter for security
      const state = randomBytes(32).toString("hex");

      const permissionsToStore: Permissions = {
        contracts: permissions?.contracts || [],
        bank: permissions?.bank || [],
        stake: permissions?.stake || false,
        treasury: this.config.treasury,
      };

      // Store state with user ID, timestamp, session key address, and permissions
      // node-cache will automatically handle TTL, no need for manual cleanup
      this._stateStore.set(state, {
        userId,
        timestamp: Date.now(),
        sessionKeyAddress: sessionKey.address,
        grantedRedirectUrl: grantedRedirectUrl,
        permissions: permissionsToStore,
      });

      // Store the session key temporarily (as PENDING) for later retrieval
      await this.sessionKeyManager.createPendingSessionKey(userId, sessionKey);

      // Build authorization URL
      const authorizationUrl = await this.buildAuthorizationUrl(
        sessionKey.address,
        state,
        permissionsToStore,
      );

      return {
        sessionKeyAddress: sessionKey.address,
        authorizationUrl,
        state,
      };
    } catch (error) {
      if (error instanceof e.AbstraxionBackendError) {
        throw error;
      }
      throw new e.UnknownError(
        `Failed to initiate connection: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Handle authorization callback from frontend SDK
   * Process the granted/granter parameters and store session key
   */
  async handleCallback(request: CallbackRequest): Promise<CallbackResponse> {
    if (!request.state) {
      throw new e.StateRequiredError();
    }
    if (!request.granter) {
      throw new e.GranterRequiredError();
    }

    try {
      // Validate state parameter
      const stateData = this._stateStore.get<{
        userId: string;
        timestamp: number;
        sessionKeyAddress: string;
        grantedRedirectUrl?: string;
        permissions?: Permissions;
      }>(request.state);
      if (!stateData) {
        throw new e.InvalidStateError(request.state);
      }

      // Check if authorization was granted
      if (!request.granted) {
        // Clean up used state
        this._stateStore.del(request.state);
        return {
          success: false,
          error: "Authorization was not granted by user",
        };
      }

      // Clean up used state
      this._stateStore.del(request.state);

      // Get the session key info that was stored during connectInit
      const sessionKeyInfo = await this.sessionKeyManager.getLastSessionKeyInfo(
        stateData.userId,
      );
      if (!sessionKeyInfo) {
        throw new e.SessionKeyNotFoundError("Session key not found for user");
      }

      // Create permissions from the stored state or default permissions
      const permissions: Permissions = stateData.permissions || {
        contracts: [],
        bank: [],
        stake: false,
        treasury: this.config.treasury,
      };

      // Call authz to validate the grants
      const authz = this._createRawAbstraxionAuthz(stateData.userId);
      // Don't use login method here, because the granter is not set yet
      const keypair = await authz.getLocalKeypair();
      if (!keypair) {
        throw new e.EncryptionKeyRequiredError();
      }

      const accounts = await keypair.getAccounts();
      const keypairAddress = accounts[0].address;
      const pollSuccess = await authz.pollForGrants(
        keypairAddress,
        request.granter,
      );
      if (!pollSuccess) {
        throw new e.GrantedFailedError();
      }

      // Store session key with permissions and granter address
      await this.sessionKeyManager.storeGrantedSessionKey(
        stateData.userId,
        sessionKeyInfo.sessionKeyAddress,
        request.granter, // Use granter as metaAccountAddress
        permissions,
      );

      return {
        success: true,
        sessionKeyAddress: sessionKeyInfo.sessionKeyAddress,
        grantedRedirectUrl: stateData.grantedRedirectUrl,
        metaAccountAddress: request.granter,
        permissions,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Disconnect and revoke session key
   * Cleanup database entries
   * @param userId User ID
   * @returns DisconnectResponse
   */
  async disconnect(userId: string): Promise<DisconnectResponse> {
    // Validate input parameters
    if (!userId) {
      throw new e.UserIdRequiredError();
    }

    try {
      // Get session key info first
      const sessionKeyInfo =
        await this.sessionKeyManager.getLastSessionKeyInfo(userId);

      if (sessionKeyInfo) {
        await this.sessionKeyManager.revokeSessionKey(
          userId,
          sessionKeyInfo.sessionKeyAddress,
        );
      }

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Start Abstraxion backend authentication
   * @param userId User ID
   * @param request IncomingMessage (optional)
   * @param options Options
   * @returns AbstraxionAuth
   */
  async startAbstraxionBackendAuth(
    userId: string,
    request?: IncomingMessage,
    options?: {
      contracts?: ContractGrantDescription[];
      bank?: SpendLimit[];
      indexerUrl?: string;
      stake?: boolean;
      onRedirectMethod?: (url: string) => Promise<void>;
    },
  ): Promise<AbstraxionAuth> {
    const activeSessionKey =
      await this.sessionKeyManager.getLastSessionKeyInfo(userId);
    if (
      !activeSessionKey ||
      !this.sessionKeyManager.isActive(activeSessionKey)
    ) {
      throw new e.SessionKeyNotFoundError("Session key not found for user");
    }
    const authz = this._createRawAbstraxionAuthz(userId, request, options);
    await authz.login();
    return authz;
  }

  private _createRawAbstraxionAuthz(
    userId: string,
    request?: IncomingMessage,
    options?: {
      contracts?: ContractGrantDescription[];
      bank?: SpendLimit[];
      indexerUrl?: string;
      stake?: boolean;
      onRedirectMethod?: (url: string) => Promise<void>;
    },
  ): AbstraxionAuth {
    const authz = new AbstraxionAuth(
      new DatabaseStorageStrategy(userId, this.sessionKeyManager),
      request
        ? new DatabaseRedirectStrategy(request, options?.onRedirectMethod)
        : new InMemoryDummyRedirectStrategy(),
    );
    // Configure AbstraxionAuth instance
    authz.configureAbstraxionInstance(
      this.config.rpcUrl,
      options?.contracts,
      options?.stake,
      options?.bank,
      this.config.redirectUrl,
      this.config.treasury,
      options?.indexerUrl,
    );
    return authz;
  }

  /**
   * Check connection status
   * Return wallet address and permissions
   * @param userId User ID
   * @returns StatusResponse
   */
  async checkStatus(userId: string): Promise<StatusResponse> {
    // Validate input parameters
    if (!userId) {
      throw new e.UserIdRequiredError();
    }

    try {
      const sessionKeyInfo =
        await this.sessionKeyManager.getLastSessionKeyInfo(userId);

      if (!sessionKeyInfo) {
        return {
          connected: false,
        };
      }

      // Check if session key is valid
      const isValid = await this.sessionKeyManager.validateSessionKey(userId);

      if (!isValid) {
        return {
          connected: false,
        };
      }

      return {
        connected: true,
        sessionKeyAddress: sessionKeyInfo.sessionKeyAddress,
        metaAccountAddress: sessionKeyInfo.metaAccountAddress,
        permissions: sessionKeyInfo.sessionPermissions,
        expiresAt: sessionKeyInfo.sessionKeyExpiry.getTime(),
        state: sessionKeyInfo.sessionState,
      };
    } catch (error) {
      // Log error for debugging but don't expose it to client
      console.error(
        "Error checking status:",
        error instanceof Error ? error.message : String(error),
      );
      return {
        connected: false,
      };
    }
  }

  /**
   * Refresh session key if needed
   */
  async refreshSessionKey(userId: string): Promise<XionKeypair | null> {
    // Validate input parameters
    if (!userId) {
      throw new e.UserIdRequiredError();
    }

    try {
      return await this.sessionKeyManager.refreshIfNeeded(userId);
    } catch (error) {
      if (error instanceof e.AbstraxionBackendError) {
        throw error;
      }
      throw new e.UnknownError(
        `Failed to refresh session key: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Build authorization URL for dashboard
   * This matches the frontend SDK's configureUrlAndRedirect method
   */
  private async buildAuthorizationUrl(
    sessionKeyAddress: string,
    state: string,
    permissions?: Permissions,
  ): Promise<string> {
    const { dashboardUrl } = await fetchConfig(this.config.rpcUrl);
    const url = new URL(dashboardUrl);

    // Add state parameter
    url.searchParams.set("state", state);

    // Add required parameters (matching frontend SDK)
    url.searchParams.set("grantee", sessionKeyAddress);
    url.searchParams.set("redirect_uri", this.config.redirectUrl);

    // Add treasury parameter (required by frontend SDK)
    url.searchParams.set("treasury", this.config.treasury);

    // Add optional permissions (matching frontend SDK format)
    if (permissions) {
      if (permissions.contracts) {
        url.searchParams.set(
          "contracts",
          JSON.stringify(permissions.contracts),
        );
      }
      if (permissions.bank) {
        url.searchParams.set("bank", JSON.stringify(permissions.bank));
      }
      if (permissions.stake) {
        url.searchParams.set("stake", "true");
      }
    }

    return url.toString();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    keys: number;
    hits: number;
    misses: number;
    ksize: number;
    vsize: number;
  } {
    return this._stateStore.getStats();
  }

  /**
   * Clear all cached states
   */
  clearCache(): void {
    this._stateStore.flushAll();
  }

  /**
   * Close the cache and cleanup resources
   */
  close(): void {
    this._stateStore.close();
  }
}
