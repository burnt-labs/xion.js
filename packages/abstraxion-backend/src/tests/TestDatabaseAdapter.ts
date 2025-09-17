import { BaseDatabaseAdapter } from "../adapters/DatabaseAdapter";
import { SessionKeyInfo, AuditEvent, SessionState } from "../types";

/**
 * Test database adapter for unit testing
 * NOT suitable for production use
 */
export class TestDatabaseAdapter extends BaseDatabaseAdapter {
  private sessionKeys: Map<string, SessionKeyInfo[]> = new Map();
  private auditLogs: AuditEvent[] = [];

  async getLastSessionKey(userId: string): Promise<SessionKeyInfo | null> {
    const userKeys = this.sessionKeys.get(userId) || [];
    return userKeys.length > 0 ? userKeys[userKeys.length - 1] : null;
  }

  async getActiveSessionKeys(userId: string): Promise<SessionKeyInfo[]> {
    const userKeys = this.sessionKeys.get(userId) || [];
    return userKeys.filter((key) => key.sessionState === SessionState.ACTIVE);
  }

  async storeSessionKey(sessionKeyInfo: SessionKeyInfo): Promise<void> {
    const userKeys = this.sessionKeys.get(sessionKeyInfo.userId) || [];
    userKeys.push(sessionKeyInfo);
    this.sessionKeys.set(sessionKeyInfo.userId, userKeys);
  }

  async addNewPendingSessionKey(
    userId: string,
    updates: Pick<
      SessionKeyInfo,
      "sessionKeyAddress" | "sessionKeyMaterial" | "sessionKeyExpiry"
    >,
  ): Promise<void> {
    const userKeys = this.sessionKeys.get(userId) || [];
    const newKey: SessionKeyInfo = {
      userId,
      sessionKeyAddress: updates.sessionKeyAddress,
      sessionKeyMaterial: updates.sessionKeyMaterial,
      sessionKeyExpiry: updates.sessionKeyExpiry,
      sessionPermissions: [],
      sessionState: SessionState.PENDING,
      metaAccountAddress: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    userKeys.push(newKey);
    this.sessionKeys.set(userId, userKeys);
  }

  async updateSessionKeyWithParams(
    userId: string,
    sessionKeyAddress: string,
    updates: Partial<
      Pick<
        SessionKeyInfo,
        "sessionState" | "sessionPermissions" | "metaAccountAddress"
      >
    >,
  ): Promise<void> {
    const userKeys = this.sessionKeys.get(userId) || [];
    const keyIndex = userKeys.findIndex(
      (key) => key.sessionKeyAddress === sessionKeyAddress,
    );
    if (keyIndex !== -1) {
      userKeys[keyIndex] = {
        ...userKeys[keyIndex],
        ...updates,
        updatedAt: new Date(),
      };
      this.sessionKeys.set(userId, userKeys);
    }
  }

  async revokeSessionKey(
    userId: string,
    sessionKeyAddress: string,
  ): Promise<boolean> {
    const userKeys = this.sessionKeys.get(userId) || [];
    const keyIndex = userKeys.findIndex(
      (key) => key.sessionKeyAddress === sessionKeyAddress,
    );
    if (keyIndex !== -1) {
      userKeys[keyIndex].sessionState = SessionState.REVOKED;
      this.sessionKeys.set(userId, userKeys);
      return true;
    }
    return false;
  }

  async revokeActiveSessionKeys(userId: string): Promise<void> {
    const userKeys = this.sessionKeys.get(userId) || [];
    userKeys.forEach((key) => {
      if (key.sessionState === SessionState.ACTIVE) {
        key.sessionState = SessionState.REVOKED;
      }
    });
    this.sessionKeys.set(userId, userKeys);
  }

  async logAuditEvent(event: AuditEvent): Promise<void> {
    this.auditLogs.push(event);
  }

  async getAuditLogs(userId: string, limit?: number): Promise<AuditEvent[]> {
    const userLogs = this.auditLogs
      .filter((log) => log.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return limit ? userLogs.slice(0, limit) : userLogs;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async close(): Promise<void> {
    this.sessionKeys.clear();
    this.auditLogs = [];
  }

  // Helper methods for testing
  async getSessionKey(userId: string): Promise<SessionKeyInfo | null> {
    return this.getLastSessionKey(userId);
  }

  async updateSessionKey(
    userId: string,
    updates: Partial<SessionKeyInfo>,
  ): Promise<void> {
    const userKeys = this.sessionKeys.get(userId) || [];
    if (userKeys.length > 0) {
      const lastKey = userKeys[userKeys.length - 1];
      const updated = { ...lastKey, ...updates, updatedAt: new Date() };
      userKeys[userKeys.length - 1] = updated;
      this.sessionKeys.set(userId, userKeys);
    }
  }
}
