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
      // Encrypt the private key
      const encryptedPrivateKey =
        await this.encryptionService.encryptSessionKey(sessionKey.privateKey);

      // Calculate expiry time
      const now = Date.now();
      const expiryTime = now + this.sessionKeyExpiryMs;

      // Create session key info
      const sessionKeyInfo: SessionKeyInfo = {
        userId,
        sessionKeyAddress: sessionKey.address,
        sessionKeyMaterial: encryptedPrivateKey,
        sessionKeyExpiry: expiryTime,
        sessionPermissions: this.permissionsToSessionPermissions(permissions),
        sessionState: SessionState.ACTIVE,
        metaAccountAddress,
        createdAt: now,
        updatedAt: now,
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
      const sessionKeyInfo = await this.databaseAdapter.getSessionKey(userId);

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
      const sessionKeyInfo = await this.databaseAdapter.getSessionKey(userId);

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
   * Revoke/delete session key
   */
  async revokeSessionKey(userId: string): Promise<void> {
    // Validate input parameters
    if (!userId) {
      throw new UserIdRequiredError();
    }

    try {
      const sessionKeyInfo = await this.databaseAdapter.getSessionKey(userId);

      if (sessionKeyInfo) {
        // Update state to revoked
        await this.databaseAdapter.updateSessionKey(userId, {
          sessionState: SessionState.REVOKED,
          updatedAt: Date.now(),
        });

        // Log audit event
        await this.logAuditEvent(userId, AuditAction.SESSION_KEY_REVOKED, {
          sessionKeyAddress: sessionKeyInfo.sessionKeyAddress,
        });
      }

      // Delete from database
      await this.databaseAdapter.deleteSessionKey(userId);
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
      const sessionKeyInfo = await this.databaseAdapter.getSessionKey(userId);

      if (!sessionKeyInfo) {
        return null;
      }

      // Check if near expiry
      const timeUntilExpiry = sessionKeyInfo.sessionKeyExpiry - Date.now();

      if (timeUntilExpiry <= this.refreshThresholdMs) {
        // Generate new session key
        const newSessionKey = await this.generateSessionKey();

        // Encrypt new private key
        const encryptedPrivateKey =
          await this.encryptionService.encryptSessionKey(
            newSessionKey.privateKey,
          );

        // Update session key info
        const now = Date.now();
        const newExpiryTime = now + this.sessionKeyExpiryMs;

        await this.databaseAdapter.updateSessionKey(userId, {
          sessionKeyAddress: newSessionKey.address,
          sessionKeyMaterial: encryptedPrivateKey,
          sessionKeyExpiry: newExpiryTime,
          updatedAt: now,
        });

        // Log audit event
        await this.logAuditEvent(userId, AuditAction.SESSION_KEY_REFRESHED, {
          oldSessionKeyAddress: sessionKeyInfo.sessionKeyAddress,
          newSessionKeyAddress: newSessionKey.address,
          newExpiryTime,
        });

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
      const sessionKeyInfo = await this.databaseAdapter.getSessionKey(userId);

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
   * Check if session key is expired
   */
  private isExpired(sessionKeyInfo: SessionKeyInfo): boolean {
    return Date.now() > sessionKeyInfo.sessionKeyExpiry;
  }

  /**
   * Mark session key as expired
   */
  private async markAsExpired(userId: string): Promise<void> {
    try {
      await this.databaseAdapter.updateSessionKey(userId, {
        sessionState: SessionState.EXPIRED,
        updatedAt: Date.now(),
      });

      // Log audit event
      await this.logAuditEvent(userId, AuditAction.SESSION_KEY_EXPIRED, {});
    } catch (error) {
      // Log error but don't throw to avoid breaking the main flow
      console.error(
        "Failed to mark session key as expired:",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Convert permissions to session permissions format
   */
  private permissionsToSessionPermissions(
    permissions: Permissions,
  ): Array<{ type: string; data: string }> {
    const sessionPermissions = [];

    if (permissions.contracts) {
      sessionPermissions.push({
        type: "contracts",
        data: JSON.stringify(permissions.contracts),
      });
    }

    if (permissions.bank) {
      sessionPermissions.push({
        type: "bank",
        data: JSON.stringify(permissions.bank),
      });
    }

    if (permissions.stake) {
      sessionPermissions.push({
        type: "stake",
        data: "true",
      });
    }

    if (permissions.treasury) {
      sessionPermissions.push({
        type: "treasury",
        data: permissions.treasury,
      });
    }

    if (permissions.expiry) {
      sessionPermissions.push({
        type: "expiry",
        data: permissions.expiry.toString(),
      });
    }

    return sessionPermissions;
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
        timestamp: Date.now(),
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
