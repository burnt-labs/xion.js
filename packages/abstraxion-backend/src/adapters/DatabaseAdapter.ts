import {
  DatabaseAdapter,
  SessionKeyInfo,
  AuditEvent,
  Permissions,
  SessionState,
} from "../types";

/**
 * Abstract base class for database adapters
 * Provides common functionality and ensures consistent interface
 *
 * Each project should implement their own concrete database adapter
 * by extending this base class and implementing all abstract methods.
 */
export abstract class BaseDatabaseAdapter implements DatabaseAdapter {
  /**
   * Get session key information by user ID
   */
  abstract getLastSessionKey(userId: string): Promise<SessionKeyInfo | null>;

  /**
   * Get the active session key for a user
   */
  abstract getActiveSessionKeys(userId: string): Promise<SessionKeyInfo[]>;

  /**
   * Store session key information
   */
  abstract storeSessionKey(sessionKeyInfo: SessionKeyInfo): Promise<void>;

  /**
   * Add new pending session key
   */
  abstract addNewPendingSessionKey(
    userId: string,
    updates: Pick<
      SessionKeyInfo,
      "sessionKeyAddress" | "sessionKeyMaterial" | "sessionKeyExpiry"
    >,
  ): Promise<void>;

  /**
   * Update session key with specific parameters (userId + sessionKeyAddress are required)
   */
  abstract updateSessionKeyWithParams(
    userId: string,
    sessionKeyAddress: string,
    updates: Partial<
      Pick<
        SessionKeyInfo,
        "sessionState" | "sessionPermissions" | "metaAccountAddress"
      >
    >,
  ): Promise<void>;

  /**
   * Revoke a specific session key by userId and sessionKeyAddress
   */
  abstract revokeSessionKey(
    userId: string,
    sessionKeyAddress: string,
  ): Promise<boolean>;

  /**
   * Revoke all active session keys for a user
   */
  abstract revokeActiveSessionKeys(userId: string): Promise<void>;

  /**
   * Log audit event
   */
  abstract logAuditEvent(event: AuditEvent): Promise<void>;

  /**
   * Get audit logs for a user
   */
  abstract getAuditLogs(userId: string, limit?: number): Promise<AuditEvent[]>;

  /**
   * Health check for database connection
   */
  abstract healthCheck(): Promise<boolean>;

  /**
   * Close database connection
   */
  abstract close(): Promise<void>;
}
