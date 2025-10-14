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
  public abstract getLastSessionKey(
    userId: string,
  ): Promise<SessionKeyInfo | null>;

  /**
   * Get the session key for a user by sessionKeyAddress
   */
  public abstract getSessionKey(
    userId: string,
    sessionKeyAddress: string,
  ): Promise<SessionKeyInfo | null>;

  /**
   * Get the active session key for a user
   */
  public abstract getActiveSessionKeys(
    userId: string,
  ): Promise<SessionKeyInfo[]>;

  /**
   * Revoke a specific session key by userId and sessionKeyAddress
   */
  public abstract revokeSessionKey(
    userId: string,
    sessionKeyAddress: string,
  ): Promise<boolean>;

  /**
   * Revoke all active session keys for a user
   */
  public abstract revokeActiveSessionKeys(userId: string): Promise<void>;

  /**
   * Add new pending session key
   */
  public abstract addNewSessionKey(
    userId: string,
    updates: Pick<
      SessionKeyInfo,
      "sessionKeyAddress" | "sessionKeyMaterial" | "sessionKeyExpiry"
    >,
    activeState?: Pick<
      SessionKeyInfo,
      "metaAccountAddress" | "sessionPermissions"
    >,
  ): Promise<void>;

  /**
   * Update session key with specific parameters (userId + sessionKeyAddress are required)
   */
  public abstract updateSessionKeyWithParams(
    userId: string,
    sessionKeyAddress: string,
    updates: Partial<
      Pick<
        SessionKeyInfo,
        | "sessionState"
        | "sessionPermissions"
        | "metaAccountAddress"
        | "sessionKeyExpiry"
      >
    >,
  ): Promise<void>;

  /**
   * Log audit event
   */
  public abstract logAuditEvent(event: AuditEvent): Promise<void>;

  /**
   * Get audit logs for a user
   */
  public abstract getAuditLogs(
    userId: string,
    limit?: number,
  ): Promise<AuditEvent[]>;

  /**
   * Health check for database connection
   */
  public abstract healthCheck(): Promise<boolean>;

  /**
   * Close database connection
   */
  public abstract close(): Promise<void>;
}
