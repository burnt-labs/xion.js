import { PrismaClient, type Prisma } from "@prisma/client";
import {
  BaseDatabaseAdapter,
  SessionKeyInfo,
  AuditEvent,
  Permissions,
  SessionState,
  AuditAction,
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

  private parseSessionKeyInfo(
    sessionKeyInfo: Prisma.SessionKeyGetPayload<{}>,
  ): SessionKeyInfo {
    return {
      userId: sessionKeyInfo.userId,
      sessionKeyAddress: sessionKeyInfo.sessionKeyAddress,
      sessionKeyMaterial: sessionKeyInfo.sessionKeyMaterial,
      sessionKeyExpiry: sessionKeyInfo.sessionKeyExpiry,
      sessionPermissions: JSON.parse(
        sessionKeyInfo.sessionPermissions,
      ) as Permissions,
      sessionState: sessionKeyInfo.sessionState as SessionState,
      metaAccountAddress: sessionKeyInfo.metaAccountAddress,
      createdAt: sessionKeyInfo.createdAt,
      updatedAt: sessionKeyInfo.updatedAt,
    };
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
      },
    });
  }

  async getLastSessionKey(userId: string): Promise<SessionKeyInfo | null> {
    const sessionKey = await this.prisma.sessionKey.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    if (!sessionKey) {
      return null;
    }

    return this.parseSessionKeyInfo(sessionKey);
  }

  async getActiveSessionKeys(userId: string): Promise<SessionKeyInfo[]> {
    const sessionKeys = await this.prisma.sessionKey.findMany({
      where: {
        userId,
        sessionState: SessionState.ACTIVE,
      },
    });

    if (!sessionKeys) {
      return [];
    }

    return sessionKeys.map((sessionKey) =>
      this.parseSessionKeyInfo(sessionKey),
    );
  }

  async revokeSessionKey(
    userId: string,
    sessionKeyAddress: string,
  ): Promise<boolean> {
    const result = await this.prisma.sessionKey.update({
      where: {
        userId,
        sessionKeyAddress,
      },
      data: {
        sessionState: SessionState.REVOKED,
      },
    });
    return result !== null;
  }

  async revokeActiveSessionKeys(userId: string): Promise<void> {
    await this.prisma.sessionKey.updateMany({
      where: {
        userId,
        sessionState: SessionState.ACTIVE,
      },
      data: {
        sessionState: SessionState.REVOKED,
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
    updates: Partial<
      Pick<
        SessionKeyInfo,
        "sessionState" | "sessionPermissions" | "metaAccountAddress"
      >
    >,
  ): Promise<void> {
    const updateData: Prisma.SessionKeyUpdateInput = {};
    if (updates.sessionPermissions) {
      updateData.sessionPermissions = JSON.stringify(
        updates.sessionPermissions,
      );
    }
    if (updates.sessionState) {
      updateData.sessionState = updates.sessionState;
    }
    if (updates.metaAccountAddress) {
      updateData.metaAccountAddress = updates.metaAccountAddress;
    }

    await this.prisma.sessionKey.update({
      where: {
        userId,
        sessionKeyAddress,
      },
      data: updateData,
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
