import { randomBytes } from "node:crypto";
import NodeCache from "node-cache";
import {
  AbstraxionBackendConfig,
  ConnectionInitResponse,
  CallbackRequest,
  CallbackResponse,
  StatusResponse,
  DisconnectResponse,
  Permissions,
  SessionKey,
  InvalidStateError,
  SessionKeyNotFoundError,
  UnknownError,
  AbstraxionBackendError,
  UserIdRequiredError,
  EncryptionKeyRequiredError,
  DatabaseAdapterRequiredError,
  DashboardUrlRequiredError,
  RedirectUrlRequiredError,
  TreasuryRequiredError,
  StateRequiredError,
  GranterRequiredError,
} from "../types";
import { SessionKeyManager } from "../services/SessionKeyManager";

export class AbstraxionBackend {
  public readonly sessionKeyManager: SessionKeyManager;
  private readonly stateStore: NodeCache;

  constructor(private readonly config: AbstraxionBackendConfig) {
    // Validate configuration
    if (!config.encryptionKey) {
      throw new EncryptionKeyRequiredError();
    }
    if (!config.databaseAdapter) {
      throw new DatabaseAdapterRequiredError();
    }
    if (!config.redirectUrl) {
      throw new RedirectUrlRequiredError();
    }
    if (!config.dashboardUrl) {
      throw new DashboardUrlRequiredError();
    }
    if (!config.treasury) {
      throw new TreasuryRequiredError();
    }

    // Initialize node-cache with 10 minutes TTL and automatic cleanup
    this.stateStore = new NodeCache({
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
   * Initiate wallet connection flow
   * Generate session key and return authorization URL
   */
  async connectInit(
    userId: string,
    permissions?: Permissions,
  ): Promise<ConnectionInitResponse> {
    // Validate input parameters
    if (!userId) {
      throw new UserIdRequiredError();
    }

    try {
      // Generate session key
      const sessionKey = await this.sessionKeyManager.generateSessionKey();

      // Generate OAuth state parameter for security
      const state = randomBytes(32).toString("hex");

      // Store state with user ID, timestamp, session key address, and permissions
      // node-cache will automatically handle TTL, no need for manual cleanup
      this.stateStore.set(state, {
        userId,
        timestamp: Date.now(),
        sessionKeyAddress: sessionKey.address,
        permissions: permissions || {
          contracts: [],
          bank: [],
          stake: false,
          treasury: this.config.treasury,
        },
      });

      // Store the session key temporarily (as PENDING) for later retrieval
      await this.sessionKeyManager.createPendingSessionKey(
        userId,
        sessionKey,
        "", // metaAccountAddress will be set during callback
      );

      // Build authorization URL
      const authorizationUrl = this.buildAuthorizationUrl(
        sessionKey.address,
        state,
        permissions,
      );

      return {
        sessionKeyAddress: sessionKey.address,
        authorizationUrl,
        state,
      };
    } catch (error) {
      if (error instanceof AbstraxionBackendError) {
        throw error;
      }
      throw new UnknownError(
        `Failed to initiate connection: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Handle authorization callback from frontend SDK
   * Process the granted/granter parameters and store session key
   */
  async handleCallback(request: CallbackRequest): Promise<CallbackResponse> {
    // Validate input parameters
    if (!request.userId) {
      throw new UserIdRequiredError();
    }
    if (!request.granter) {
      throw new GranterRequiredError();
    }
    if (!request.state) {
      throw new StateRequiredError();
    }

    try {
      // Validate state parameter
      const stateData = this.stateStore.get<{
        userId: string;
        timestamp: number;
        sessionKeyAddress: string;
        permissions?: Permissions;
      }>(request.state);
      if (!stateData) {
        throw new InvalidStateError(request.state);
      }

      // Verify user ID matches
      if (stateData.userId !== request.userId) {
        throw new InvalidStateError(request.state);
      }

      // Check if authorization was granted
      if (!request.granted) {
        // Clean up used state
        this.stateStore.del(request.state);
        return {
          success: false,
          error: "Authorization was not granted by user",
        };
      }

      // Clean up used state
      this.stateStore.del(request.state);

      // Get the session key info that was stored during connectInit
      const sessionKeyInfo = await this.sessionKeyManager.getSessionKeyInfo(
        request.userId,
      );
      if (!sessionKeyInfo) {
        throw new Error("Session key not found for user");
      }

      // Decrypt the session key
      const sessionKey = await this.sessionKeyManager.getSessionKey(
        request.userId,
      );
      if (!sessionKey) {
        throw new Error("Failed to decrypt session key");
      }

      // Create permissions from the stored state or default permissions
      const permissions: Permissions = stateData.permissions || {
        contracts: [],
        bank: [],
        stake: false,
        treasury: this.config.treasury,
      };

      // Store session key with permissions and granter address
      await this.sessionKeyManager.storeSessionKey(
        request.userId,
        sessionKey,
        permissions,
        request.granter, // Use granter as metaAccountAddress
      );

      return {
        success: true,
        sessionKeyAddress: sessionKey.address,
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
   */
  async disconnect(userId: string): Promise<DisconnectResponse> {
    // Validate input parameters
    if (!userId) {
      throw new UserIdRequiredError();
    }

    try {
      // Get session key info first
      const sessionKeyInfo =
        await this.sessionKeyManager.getSessionKeyInfo(userId);

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
   * Check connection status
   * Return wallet address and permissions
   */
  async checkStatus(userId: string): Promise<StatusResponse> {
    // Validate input parameters
    if (!userId) {
      throw new UserIdRequiredError();
    }

    try {
      const sessionKeyInfo =
        await this.sessionKeyManager.getSessionKeyInfo(userId);

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
   * Get session key for signing operations
   */
  async getSessionKeyForSigning(userId: string): Promise<SessionKey | null> {
    // Validate input parameters
    if (!userId) {
      throw new UserIdRequiredError();
    }

    try {
      return await this.sessionKeyManager.getSessionKey(userId);
    } catch (error) {
      if (error instanceof SessionKeyNotFoundError) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Refresh session key if needed
   */
  async refreshSessionKey(userId: string): Promise<SessionKey | null> {
    // Validate input parameters
    if (!userId) {
      throw new UserIdRequiredError();
    }

    try {
      return await this.sessionKeyManager.refreshIfNeeded(userId);
    } catch (error) {
      if (error instanceof AbstraxionBackendError) {
        throw error;
      }
      throw new UnknownError(
        `Failed to refresh session key: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Build authorization URL for dashboard
   * This matches the frontend SDK's configureUrlAndRedirect method
   */
  private buildAuthorizationUrl(
    sessionKeyAddress: string,
    state: string,
    permissions?: Permissions,
  ): string {
    const url = new URL(this.config.dashboardUrl);

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
   * Get callback URL for OAuth flow
   * This is the URL that the frontend SDK will redirect to after authorization
   */
  private getCallbackUrl(): string {
    return this.config.redirectUrl;
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
    return this.stateStore.getStats();
  }

  /**
   * Clear all cached states
   */
  clearCache(): void {
    this.stateStore.flushAll();
  }

  /**
   * Close the cache and cleanup resources
   */
  close(): void {
    this.stateStore.close();
  }
}
