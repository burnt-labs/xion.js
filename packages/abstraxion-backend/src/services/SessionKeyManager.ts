import { randomBytes } from "node:crypto";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import {
  SessionKeyInfo,
  SessionKey,
  Permissions,
  SessionState,
  DatabaseAdapter,
  AuditAction,
  AuditEvent,
  SessionKeyExpiredError,
  AbstraxionBackendError,
  UserIdRequiredError,
  SessionKeyGenerationError,
  SessionKeyStorageError,
  SessionKeyRetrievalError,
  SessionKeyRevocationError,
  SessionKeyRefreshError,
} from "../types";
import { EncryptionService } from "./EncryptionService";

export class SessionKeyManager {
  private readonly encryptionService: EncryptionService;
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
   * Store encrypted session key with permissions
   */
  async storeSessionKey(
    userId: string,
    sessionKey: SessionKey,
    permissions: Permissions,
    metaAccountAddress: string,
  ): Promise<void> {
    // Validate input parameters
    if (!userId) {
      throw new UserIdRequiredError();
    }

    try {
      // Check existing session key
      const existingSessionKey =
        await this.databaseAdapter.getLastSessionKey(userId);

      // Encrypt the private key
      const encryptedPrivateKey =
        await this.encryptionService.encryptSessionKey(sessionKey.privateKey);

      // Calculate expiry time
      const now = Date.now();
      const expiryTime = new Date(now + this.sessionKeyExpiryMs);

      if (!existingSessionKey || this.isExpired(existingSessionKey)) {
        // No existing session key or expired, create new one as ACTIVE
        const sessionKeyInfo: SessionKeyInfo = {
          userId,
          sessionKeyAddress: sessionKey.address,
          sessionKeyMaterial: encryptedPrivateKey,
          sessionKeyExpiry: expiryTime,
          sessionPermissions: permissions,
          sessionState: SessionState.ACTIVE,
          metaAccountAddress,
        };

        // Store in database
        await this.databaseAdapter.storeSessionKey(sessionKeyInfo);

        // Log audit event
        await this.logAuditEvent(userId, AuditAction.SESSION_KEY_CREATED, {
          sessionKeyAddress: sessionKey.address,
          metaAccountAddress,
          permissions,
          expiryTime,
        });
      } else if (existingSessionKey.sessionState === SessionState.PENDING) {
        // Update existing PENDING session key
        await this.databaseAdapter.updateSessionKeyWithParams(
          userId,
          sessionKey.address,
          {
            sessionState: SessionState.ACTIVE,
            metaAccountAddress,
            sessionPermissions: permissions,
          },
        );

        // Update the encrypted material and expiry
        // First update the session key with new parameters
        await this.databaseAdapter.updateSessionKeyWithParams(
          userId,
          sessionKey.address,
          {
            sessionState: SessionState.ACTIVE,
            metaAccountAddress,
            sessionPermissions: permissions,
          },
        );

        // Then update the material and expiry by replacing the session key
        const updatedSessionKeyInfo: SessionKeyInfo = {
          userId,
          sessionKeyAddress: sessionKey.address,
          sessionKeyMaterial: encryptedPrivateKey,
          sessionKeyExpiry: expiryTime,
          sessionPermissions: permissions,
          sessionState: SessionState.ACTIVE,
          metaAccountAddress,
        };

        await this.databaseAdapter.storeSessionKey(updatedSessionKeyInfo);

        // Log audit event
        await this.logAuditEvent(userId, AuditAction.SESSION_KEY_CREATED, {
          sessionKeyAddress: sessionKey.address,
          metaAccountAddress,
          permissions,
          expiryTime,
          previousState: SessionState.PENDING,
        });
      } else {
        // Existing active session key, replace it
        const sessionKeyInfo: SessionKeyInfo = {
          userId,
          sessionKeyAddress: sessionKey.address,
          sessionKeyMaterial: encryptedPrivateKey,
          sessionKeyExpiry: expiryTime,
          sessionPermissions: permissions,
          sessionState: SessionState.ACTIVE,
          metaAccountAddress,
        };

        // Store in database (this will replace the existing one)
        await this.databaseAdapter.storeSessionKey(sessionKeyInfo);

        // Log audit event
        await this.logAuditEvent(userId, AuditAction.SESSION_KEY_CREATED, {
          sessionKeyAddress: sessionKey.address,
          metaAccountAddress,
          permissions,
          expiryTime,
          replacedExisting: true,
        });
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
   * Retrieve and decrypt active session key
   */
  async getSessionKey(userId: string): Promise<SessionKey | null> {
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

      // Check if session key is expired
      if (this.isExpired(sessionKeyInfo)) {
        await this.markAsExpired(userId);
        throw new SessionKeyExpiredError(userId);
      }

      // Check if session key is active
      if (sessionKeyInfo.sessionState !== SessionState.ACTIVE) {
        return null;
      }

      // Decrypt the private key
      const decryptedPrivateKey =
        await this.encryptionService.decryptSessionKey(
          sessionKeyInfo.sessionKeyMaterial,
        );

      // Log audit event
      await this.logAuditEvent(userId, AuditAction.SESSION_KEY_ACCESSED, {
        sessionKeyAddress: sessionKeyInfo.sessionKeyAddress,
      });

      return {
        address: sessionKeyInfo.sessionKeyAddress,
        privateKey: decryptedPrivateKey,
        publicKey: "", // Will be derived from private key when needed
      };
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
  async validateSessionKey(userId: string): Promise<boolean> {
    // Validate input parameters
    if (!userId) {
      throw new UserIdRequiredError();
    }

    try {
      const sessionKeyInfo =
        await this.databaseAdapter.getLastSessionKey(userId);

      if (!sessionKeyInfo) {
        return false;
      }

      // Check if expired
      if (this.isExpired(sessionKeyInfo)) {
        await this.markAsExpired(userId);
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
      // Delete from database
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

      if (activeSessionKeys) {
        for (const key of activeSessionKeys) {
          // Log audit event
          await this.logAuditEvent(userId, AuditAction.SESSION_KEY_REVOKED, {
            sessionKeyAddress: key.sessionKeyAddress,
            reason: "All active session keys revoked",
          });
        }
      }

      // Delete all active session keys from database
      await this.databaseAdapter.revokeActiveSessionKeys(userId);
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
  async refreshIfNeeded(userId: string): Promise<SessionKey | null> {
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
        const newSessionKey = await this.generateSessionKey();
        this.createPendingSessionKey(
          userId,
          newSessionKey,
          sessionKeyInfo.metaAccountAddress,
        );
        return newSessionKey;
      }

      // Return existing session key
      return await this.getSessionKey(userId);
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
   * Get session key info without decrypting
   */
  async getSessionKeyInfo(userId: string): Promise<SessionKeyInfo | null> {
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
        await this.markAsExpired(userId);
        return null;
      }

      return sessionKeyInfo;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate a new session key
   */
  async generateSessionKey(): Promise<SessionKey> {
    try {
      // Generate wallet directly with default HD path
      const wallet = await DirectSecp256k1HdWallet.generate(12, {
        prefix: "xion",
      });

      // Get account info
      const accounts = await wallet.getAccounts();
      const account = accounts[0];

      return {
        address: account.address,
        privateKey: "", // Will be extracted from wallet when needed
        publicKey: Buffer.from(account.pubkey).toString("base64"),
        mnemonic: wallet.mnemonic,
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
    sessionKey: SessionKey,
    metaAccountAddress: string,
  ): Promise<void> {
    // Validate input parameters
    if (!userId) {
      throw new UserIdRequiredError();
    }

    try {
      // Encrypt the private key
      const encryptedPrivateKey =
        await this.encryptionService.encryptSessionKey(sessionKey.privateKey);

      // Calculate expiry time
      const now = Date.now();
      const expiryTime = new Date(now + this.sessionKeyExpiryMs);

      // Create pending session key
      await this.databaseAdapter.addNewPendingSessionKey(userId, {
        sessionKeyAddress: sessionKey.address,
        sessionKeyMaterial: encryptedPrivateKey,
        sessionKeyExpiry: expiryTime,
      });

      // Log audit event
      await this.logAuditEvent(userId, AuditAction.SESSION_KEY_CREATED, {
        sessionKeyAddress: sessionKey.address,
        metaAccountAddress,
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
   * Check if session key is expired
   */
  private isExpired(sessionKeyInfo: SessionKeyInfo): boolean {
    return Date.now() > sessionKeyInfo.sessionKeyExpiry.getTime();
  }

  /**
   * Mark session key as expired
   */
  private async markAsExpired(userId: string): Promise<void> {
    try {
      const sessionKeyInfo =
        await this.databaseAdapter.getLastSessionKey(userId);

      if (sessionKeyInfo) {
        await this.databaseAdapter.updateSessionKeyWithParams(
          userId,
          sessionKeyInfo.sessionKeyAddress,
          {
            sessionState: SessionState.EXPIRED,
          },
        );

        // Log audit event
        await this.logAuditEvent(userId, AuditAction.SESSION_KEY_EXPIRED, {
          sessionKeyAddress: sessionKeyInfo.sessionKeyAddress,
        });
      }
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
