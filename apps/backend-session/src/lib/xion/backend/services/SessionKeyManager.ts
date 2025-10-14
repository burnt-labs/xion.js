import { randomBytes } from "node:crypto";
import { SignArbSecp256k1HdWallet } from "@burnt-labs/abstraxion-core";
import {
  SessionKeyInfo,
  XionKeypair,
  Permissions,
  SessionState,
  DatabaseAdapter,
  AuditAction,
  AuditEvent,
  AbstraxionBackendError,
  UserIdRequiredError,
  SessionKeyGenerationError,
  SessionKeyStorageError,
  SessionKeyRetrievalError,
  SessionKeyRevocationError,
  SessionKeyRefreshError,
  SessionKeyNotFoundError,
  SessionKeyInvalidError,
} from "../types";
import { EncryptionService } from "./EncryptionService";

export class SessionKeyManager {
  public readonly encryptionService: EncryptionService;
  private readonly sessionKeyExpiryMs: number;
  private readonly refreshThresholdMs: number;

  constructor(
    private readonly databaseAdapter: DatabaseAdapter,
    private readonly config: {
      encryptionKey: string;
      sessionKeyExpiryMs?: number;
      refreshThresholdMs?: number;
      enableAuditLogging?: boolean;
    },
  ) {
    this.encryptionService = new EncryptionService(config.encryptionKey);
    this.sessionKeyExpiryMs = config.sessionKeyExpiryMs || 24 * 60 * 60 * 1000; // 24 hours
    this.refreshThresholdMs = config.refreshThresholdMs || 60 * 60 * 1000; // 1 hour
  }

  /**
   * Get session key info without decrypting
   */
  async getLastSessionKeyInfo(userId: string): Promise<SessionKeyInfo | null> {
    // Validate input parameters
    if (!userId) {
      throw new UserIdRequiredError();
    }

    try {
      const sessionKeyInfo =
        await this.databaseAdapter.getLastSessionKey(userId);

      if (!sessionKeyInfo) {
        return null;
      }

      // Check if expired
      if (this.isExpired(sessionKeyInfo)) {
        await this.markAsExpired(sessionKeyInfo);
        return null;
      }

      return sessionKeyInfo;
    } catch (error) {
      return null;
    }
  }

  /**
   * Retrieve and decrypt active session key
   */
  async getSessionKeypair(
    user: string | SessionKeyInfo,
  ): Promise<SignArbSecp256k1HdWallet> {
    try {
      const sessionKeyInfo =
        typeof user === "string"
          ? await this.getLastSessionKeyInfo(user)
          : user;
      if (!sessionKeyInfo) {
        throw new SessionKeyNotFoundError("Session key not found for user");
      }

      // Decrypt the private key
      const decryptedPrivateKey =
        await this.encryptionService.decryptSessionKey(
          sessionKeyInfo.sessionKeyMaterial,
        );

      // Log audit event
      await this.logAuditEvent(
        sessionKeyInfo.userId,
        AuditAction.SESSION_KEY_ACCESSED,
        {
          sessionKeyAddress: sessionKeyInfo.sessionKeyAddress,
        },
      );

      return SignArbSecp256k1HdWallet.deserialize(
        decryptedPrivateKey,
        "abstraxion",
      );
    } catch (error) {
      if (error instanceof AbstraxionBackendError) {
        throw error;
      }
      throw new SessionKeyRetrievalError(
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Check expiry and validity
   */
  async validateSessionKey(user: string | SessionKeyInfo): Promise<boolean> {
    // Validate input parameters
    if (!user) {
      throw new UserIdRequiredError();
    }

    try {
      const sessionKeyInfo =
        typeof user === "string"
          ? await this.getLastSessionKeyInfo(user)
          : user;

      if (!sessionKeyInfo) {
        return false;
      }

      // Check if expired
      if (this.isExpired(sessionKeyInfo)) {
        await this.markAsExpired(sessionKeyInfo);
        return false;
      }

      // Check if active
      return sessionKeyInfo.sessionState === SessionState.ACTIVE;
    } catch (error) {
      return false;
    }
  }

  /**
   * Revoke/delete specific session key
   */
  async revokeSessionKey(
    userId: string,
    sessionKeyAddress: string,
  ): Promise<void> {
    // Validate input parameters
    if (!userId) {
      throw new UserIdRequiredError();
    }
    if (!sessionKeyAddress) {
      throw new Error("Session key address is required");
    }

    try {
      // Revoke the session key in database
      const result = await this.databaseAdapter.revokeSessionKey(
        userId,
        sessionKeyAddress,
      );
      if (!result) {
        throw new SessionKeyRevocationError("Failed to revoke session key");
      } else {
        // Log audit event
        await this.logAuditEvent(userId, AuditAction.SESSION_KEY_REVOKED, {
          sessionKeyAddress: sessionKeyAddress,
        });
      }
    } catch (error) {
      if (error instanceof AbstraxionBackendError) {
        throw error;
      }
      throw new SessionKeyRevocationError(
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Revoke all active session keys for a user
   */
  async revokeActiveSessionKeys(userId: string): Promise<void> {
    // Validate input parameters
    if (!userId) {
      throw new UserIdRequiredError();
    }

    try {
      // Get active session keys before revoking
      const activeSessionKeys =
        await this.databaseAdapter.getActiveSessionKeys(userId);

      if (activeSessionKeys && activeSessionKeys.length > 0) {
        for (const key of activeSessionKeys) {
          // Log audit event
          await this.logAuditEvent(userId, AuditAction.SESSION_KEY_REVOKED, {
            sessionKeyAddress: key.sessionKeyAddress,
            reason: "All active session keys revoked",
          });
        }

        // Delete all active session keys from database
        await this.databaseAdapter.revokeActiveSessionKeys(userId);
      }
    } catch (error) {
      if (error instanceof AbstraxionBackendError) {
        throw error;
      }
      throw new SessionKeyRevocationError(
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Refresh if near expiry
   */
  async refreshIfNeeded(userId: string): Promise<XionKeypair | null> {
    // Validate input parameters
    if (!userId) {
      throw new UserIdRequiredError();
    }

    try {
      const sessionKeyInfo =
        await this.databaseAdapter.getLastSessionKey(userId);

      if (!sessionKeyInfo) {
        return null;
      }

      // Check if near expiry
      const timeUntilExpiry =
        sessionKeyInfo.sessionKeyExpiry.getTime() - Date.now();

      if (timeUntilExpiry <= this.refreshThresholdMs) {
        // Generate new session key
        const newSessionKey = await this.generateSessionKeypair();
        await this.createPendingSessionKey(userId, newSessionKey);
        return newSessionKey;
      }

      // Return existing session key
      return {
        address: sessionKeyInfo.sessionKeyAddress,
        serializedKeypair: await this.encryptionService.decryptSessionKey(
          sessionKeyInfo.sessionKeyMaterial,
        ),
      };
    } catch (error) {
      if (error instanceof AbstraxionBackendError) {
        throw error;
      }
      throw new SessionKeyRefreshError(
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Generate a new session key
   */
  async generateSessionKeypair(): Promise<XionKeypair> {
    try {
      const keypair = await SignArbSecp256k1HdWallet.generate(12, {
        prefix: "xion",
      });
      const serializedKeypair = await keypair.serialize("abstraxion");

      // Get account info
      const accounts = await keypair.getAccounts();
      const account = accounts[0];

      return {
        address: account.address,
        serializedKeypair,
      };
    } catch (error) {
      if (error instanceof AbstraxionBackendError) {
        throw error;
      }
      throw new SessionKeyGenerationError(
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Create a new pending session key
   */
  async createPendingSessionKey(
    userId: string,
    sessionKey: XionKeypair,
  ): Promise<void> {
    // Validate input parameters
    if (!userId) {
      throw new UserIdRequiredError();
    }

    try {
      // Encrypt the private key
      const encryptedPrivateKey =
        await this.encryptionService.encryptSessionKey(
          sessionKey.serializedKeypair,
        );

      // Calculate expiry time
      const now = Date.now();
      const expiryTime = new Date(now + this.sessionKeyExpiryMs);

      // Create pending session key
      await this.databaseAdapter.addNewSessionKey(userId, {
        sessionKeyAddress: sessionKey.address,
        sessionKeyMaterial: encryptedPrivateKey,
        sessionKeyExpiry: expiryTime,
      });

      // Log audit event
      await this.logAuditEvent(userId, AuditAction.SESSION_KEY_CREATED, {
        sessionKeyAddress: sessionKey.address,
        state: SessionState.PENDING,
        expiryTime,
      });
    } catch (error) {
      if (error instanceof AbstraxionBackendError) {
        throw error;
      }
      throw new SessionKeyStorageError(
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Store encrypted session key with permissions
   */
  async storeGrantedSessionKey(
    userId: string,
    sessionAddress: string,
    granterAddress: string,
    permissions?: Permissions,
  ): Promise<void> {
    // Validate input parameters
    if (!userId) {
      throw new UserIdRequiredError();
    }

    try {
      // Check existing session key
      const existingSessionKey = await this.databaseAdapter.getSessionKey(
        userId,
        sessionAddress,
      );

      if (!existingSessionKey) {
        throw new SessionKeyNotFoundError(
          `Session key not found for user: ${userId}, session address: ${sessionAddress}`,
        );
      }

      if (existingSessionKey.sessionState === SessionState.PENDING) {
        // Update existing PENDING session key
        await this.databaseAdapter.updateSessionKeyWithParams(
          userId,
          sessionAddress,
          {
            sessionState: SessionState.ACTIVE,
            metaAccountAddress: granterAddress,
            sessionPermissions: permissions,
          },
        );

        // Log audit event
        await this.logAuditEvent(userId, AuditAction.SESSION_KEY_UPDATED, {
          sessionKeyAddress: sessionAddress,
          metaAccountAddress: granterAddress,
          permissions,
          previousState: SessionState.PENDING,
        });
      } else {
        throw new SessionKeyInvalidError(
          `Session key invalid for user: ${userId}, it should be pending instead of ${existingSessionKey.sessionState}`,
        );
      }
    } catch (error) {
      if (error instanceof AbstraxionBackendError) {
        throw error;
      }
      throw new SessionKeyStorageError(
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Check if session key is expired
   */
  public isExpired(sessionKeyInfo: SessionKeyInfo): boolean {
    return (
      (sessionKeyInfo.sessionState === SessionState.ACTIVE &&
        Date.now() > sessionKeyInfo.sessionKeyExpiry.getTime()) ||
      sessionKeyInfo.sessionState === SessionState.EXPIRED
    );
  }

  /**
   * Check if session key is active
   */
  public isActive(sessionKeyInfo: SessionKeyInfo): boolean {
    return (
      sessionKeyInfo.sessionState === SessionState.ACTIVE &&
      Date.now() <= sessionKeyInfo.sessionKeyExpiry.getTime()
    );
  }

  /**
   * Mark session key as expired
   */
  private async markAsExpired(sessionKeyInfo: SessionKeyInfo): Promise<void> {
    try {
      await this.databaseAdapter.updateSessionKeyWithParams(
        sessionKeyInfo.userId,
        sessionKeyInfo.sessionKeyAddress,
        {
          sessionState: SessionState.EXPIRED,
        },
      );

      // Log audit event
      await this.logAuditEvent(
        sessionKeyInfo.userId,
        AuditAction.SESSION_KEY_EXPIRED,
        {
          sessionKeyAddress: sessionKeyInfo.sessionKeyAddress,
        },
      );
    } catch (error) {
      // Log error but don't throw to avoid breaking the main flow
      console.error(
        "Failed to mark session key as expired:",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Log audit event
   */
  private async logAuditEvent(
    userId: string,
    action: AuditAction,
    details: Record<string, any>,
  ): Promise<void> {
    if (!this.config.enableAuditLogging) {
      return;
    }

    try {
      const auditEvent: AuditEvent = {
        id: randomBytes(16).toString("hex"),
        userId,
        action,
        timestamp: new Date(),
        details,
      };

      await this.databaseAdapter.logAuditEvent(auditEvent);
    } catch (error) {
      // Log error but don't throw to avoid breaking the main flow
      console.error(
        "Failed to log audit event:",
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}
