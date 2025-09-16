import { PrismaClient } from "@prisma/client";
import {
  BaseDatabaseAdapter,
  SessionKeyInfo,
  AuditEvent,
  AuditAction,
  SessionState,
  Permissions,
} from "@burnt-labs/abstraxion-backend";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export class PrismaDatabaseAdapter extends BaseDatabaseAdapter {
  constructor(private prisma: PrismaClient) {
    super();
  }

  async storeSessionKey(sessionKeyInfo: SessionKeyInfo): Promise<void> {
    // First, delete any existing session key for this user
    await this.prisma.sessionKey.deleteMany({
      where: { userId: sessionKeyInfo.userId },
    });

    // Then create the new session key
    await this.prisma.sessionKey.create({
      data: {
        userId: sessionKeyInfo.userId,
        sessionKeyAddress: sessionKeyInfo.sessionKeyAddress,
        sessionKeyMaterial: sessionKeyInfo.sessionKeyMaterial,
        sessionKeyExpiry: sessionKeyInfo.sessionKeyExpiry,
        sessionPermissions: JSON.stringify(sessionKeyInfo.sessionPermissions),
        sessionState: sessionKeyInfo.sessionState,
        metaAccountAddress: sessionKeyInfo.metaAccountAddress,
        createdAt: new Date(sessionKeyInfo.createdAt),
        updatedAt: new Date(sessionKeyInfo.updatedAt),
      },
    });
  }

  async getSessionKey(userId: string): Promise<SessionKeyInfo | null> {
    const sessionKey = await this.prisma.sessionKey.findFirst({
      where: { userId },
    });

    if (!sessionKey) {
      return null;
    }

    return {
      userId: sessionKey.userId,
      sessionKeyAddress: sessionKey.sessionKeyAddress,
      sessionKeyMaterial: sessionKey.sessionKeyMaterial,
      sessionKeyExpiry: sessionKey.sessionKeyExpiry,
      sessionPermissions: JSON.parse(sessionKey.sessionPermissions),
      sessionState: sessionKey.sessionState as SessionState,
      metaAccountAddress: sessionKey.metaAccountAddress,
      createdAt: sessionKey.createdAt.getTime(),
      updatedAt: sessionKey.updatedAt.getTime(),
    };
  }

  async getActiveSessionKey(userId: string): Promise<SessionKeyInfo | null> {
    const sessionKey = await this.prisma.sessionKey.findFirst({
      where: {
        userId,
        sessionState: SessionState.ACTIVE,
      },
    });

    if (!sessionKey) {
      return null;
    }

    return {
      userId: sessionKey.userId,
      sessionKeyAddress: sessionKey.sessionKeyAddress,
      sessionKeyMaterial: sessionKey.sessionKeyMaterial,
      sessionKeyExpiry: sessionKey.sessionKeyExpiry,
      sessionPermissions: JSON.parse(sessionKey.sessionPermissions),
      sessionState: sessionKey.sessionState as SessionState,
      metaAccountAddress: sessionKey.metaAccountAddress,
      createdAt: sessionKey.createdAt.getTime(),
      updatedAt: sessionKey.updatedAt.getTime(),
    };
  }

  async revokeSessionKey(
    userId: string,
    sessionKeyAddress: string,
  ): Promise<void> {
    await this.prisma.sessionKey.deleteMany({
      where: {
        userId,
        sessionKeyAddress,
      },
    });
  }

  async revokeActiveSessionKeys(userId: string): Promise<void> {
    await this.prisma.sessionKey.deleteMany({
      where: {
        userId,
        sessionState: SessionState.ACTIVE,
      },
    });
  }

  async addNewPendingSessionKey(
    userId: string,
    updates: Pick<
      SessionKeyInfo,
      "sessionKeyAddress" | "sessionKeyMaterial" | "sessionKeyExpiry"
    >,
  ): Promise<void> {
    // First, delete any existing session key for this user
    await this.prisma.sessionKey.deleteMany({
      where: { userId },
    });

    // Then create the new pending session key
    await this.prisma.sessionKey.create({
      data: {
        userId,
        sessionKeyAddress: updates.sessionKeyAddress,
        sessionKeyMaterial: updates.sessionKeyMaterial,
        sessionKeyExpiry: updates.sessionKeyExpiry,
        sessionState: SessionState.PENDING,
        sessionPermissions: JSON.stringify({}), // Empty permissions for pending state
        metaAccountAddress: "", // Will be set when activated
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async updateSessionKeyWithParams(
    userId: string,
    sessionKeyAddress: string,
    sessionPermissions: Permissions,
    sessionState: SessionState,
    metaAccountAddress: string,
  ): Promise<void> {
    await this.prisma.sessionKey.updateMany({
      where: {
        userId,
        sessionKeyAddress,
      },
      data: {
        sessionPermissions: JSON.stringify(sessionPermissions),
        sessionState,
        metaAccountAddress,
        updatedAt: new Date(),
      },
    });
  }

  async logAuditEvent(event: AuditEvent): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: event.userId,
        action: event.action,
        timestamp: new Date(event.timestamp),
        details: JSON.stringify(event.details),
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
      },
    });
  }

  async getAuditLogs(
    userId: string,
    limit: number = 50,
  ): Promise<AuditEvent[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { timestamp: "desc" },
      take: limit,
    });

    return logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      action: log.action as AuditAction,
      timestamp: log.timestamp,
      details: JSON.parse(log.details),
      ipAddress: log.ipAddress || undefined,
      userAgent: log.userAgent || undefined,
    }));
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
