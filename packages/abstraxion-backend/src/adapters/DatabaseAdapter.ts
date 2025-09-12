import { DatabaseAdapter, SessionKeyInfo, AuditEvent } from "../types";

/**
 * Abstract base class for database adapters
 * Provides common functionality and ensures consistent interface
 *
 * Each project should implement their own concrete database adapter
 * by extending this base class and implementing all abstract methods.
 */
export abstract class BaseDatabaseAdapter implements DatabaseAdapter {
  /**
   * Store session key information
   */
  abstract storeSessionKey(sessionKeyInfo: SessionKeyInfo): Promise<void>;

  /**
   * Get session key information by user ID
   */
  abstract getSessionKey(userId: string): Promise<SessionKeyInfo | null>;

  /**
   * Update session key information
   */
  abstract updateSessionKey(
    userId: string,
    updates: Partial<SessionKeyInfo>,
  ): Promise<void>;

  /**
   * Delete session key information
   */
  abstract deleteSessionKey(userId: string): Promise<void>;

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
