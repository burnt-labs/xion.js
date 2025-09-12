import { BaseDatabaseAdapter } from '../adapters/DatabaseAdapter';
import { SessionKeyInfo, AuditEvent } from '../types';

/**
 * Test database adapter for unit testing
 * NOT suitable for production use
 */
export class TestDatabaseAdapter extends BaseDatabaseAdapter {
  private sessionKeys: Map<string, SessionKeyInfo> = new Map();
  private auditLogs: AuditEvent[] = [];

  async storeSessionKey(sessionKeyInfo: SessionKeyInfo): Promise<void> {
    this.sessionKeys.set(sessionKeyInfo.userId, sessionKeyInfo);
  }

  async getSessionKey(userId: string): Promise<SessionKeyInfo | null> {
    return this.sessionKeys.get(userId) || null;
  }

  async updateSessionKey(userId: string, updates: Partial<SessionKeyInfo>): Promise<void> {
    const existing = this.sessionKeys.get(userId);
    if (existing) {
      const updated = { ...existing, ...updates, updatedAt: Date.now() };
      this.sessionKeys.set(userId, updated);
    }
  }

  async deleteSessionKey(userId: string): Promise<void> {
    this.sessionKeys.delete(userId);
  }

  async logAuditEvent(event: AuditEvent): Promise<void> {
    this.auditLogs.push(event);
  }

  async getAuditLogs(userId: string, limit?: number): Promise<AuditEvent[]> {
    const userLogs = this.auditLogs
      .filter(log => log.userId === userId)
      .sort((a, b) => b.timestamp - a.timestamp);
    
    return limit ? userLogs.slice(0, limit) : userLogs;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async close(): Promise<void> {
    this.sessionKeys.clear();
    this.auditLogs = [];
  }
}
