import { PrismaClient, type Prisma } from "@prisma/client";
import type {
  SessionKeyInfo,
  AuditEvent,
  Permissions,
  AuditAction,
} from "@burnt-labs/abstraxion-backend";
import {
  BaseDatabaseAdapter,
  SessionState,
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

  async getSessionKey(
    userId: string,
    sessionKeyAddress: string,
  ): Promise<SessionKeyInfo | null> {
    const sessionKey = await this.prisma.sessionKey.findUnique({
      where: {
        userId,
        sessionKeyAddress,
      },
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

  async addNewSessionKey(
    userId: string,
    updates: Pick<
      SessionKeyInfo,
      "sessionKeyAddress" | "sessionKeyMaterial" | "sessionKeyExpiry"
    >,
    activeState?: Pick<
      SessionKeyInfo,
      "metaAccountAddress" | "sessionPermissions"
    >,
  ): Promise<void> {
    const updateData: Prisma.SessionKeyCreateInput = {
      user: {
        connect: {
          id: userId,
        },
      },
      sessionKeyAddress: updates.sessionKeyAddress,
      sessionKeyMaterial: updates.sessionKeyMaterial,
      sessionKeyExpiry: updates.sessionKeyExpiry,
      sessionState: SessionState.PENDING,
      sessionPermissions: JSON.stringify({}), // Empty permissions for pending state
      metaAccountAddress: "", // Will be set when activated
    };
    if (activeState) {
      updateData.sessionState = SessionState.ACTIVE;
      updateData.metaAccountAddress = activeState.metaAccountAddress;
      updateData.sessionPermissions = JSON.stringify(
        activeState.sessionPermissions,
      );
    }
    // Then create the new pending session key
    await this.prisma.sessionKey.create({
      data: updateData,
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

  async getAuditLogs(userId: string, limit = 50): Promise<AuditEvent[]> {
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
