import { PrismaClient } from "@prisma/client";
import {
  BaseDatabaseAdapter,
  SessionKeyInfo,
  AuditEvent,
  AuditAction,
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

  async storeSessionKey(sessionKeyInfo: SessionKeyInfo): Promise<void> {
    await this.prisma.sessionKey.upsert({
      where: {
        userId: sessionKeyInfo.userId,
      },
      update: {
        sessionKeyAddress: sessionKeyInfo.sessionKeyAddress,
        sessionKeyMaterial: sessionKeyInfo.sessionKeyMaterial,
        sessionKeyExpiry: sessionKeyInfo.sessionKeyExpiry,
        sessionPermissions: JSON.stringify(sessionKeyInfo.sessionPermissions),
        sessionState: sessionKeyInfo.sessionState,
        metaAccountAddress: sessionKeyInfo.metaAccountAddress,
        createdAt: sessionKeyInfo.createdAt,
        updatedAt: sessionKeyInfo.updatedAt,
      },
      create: {
        userId: sessionKeyInfo.userId,
        sessionKeyAddress: sessionKeyInfo.sessionKeyAddress,
        sessionKeyMaterial: sessionKeyInfo.sessionKeyMaterial,
        sessionKeyExpiry: sessionKeyInfo.sessionKeyExpiry,
        sessionPermissions: JSON.stringify(sessionKeyInfo.sessionPermissions),
        sessionState: sessionKeyInfo.sessionState,
        metaAccountAddress: sessionKeyInfo.metaAccountAddress,
        createdAt: sessionKeyInfo.createdAt,
        updatedAt: sessionKeyInfo.updatedAt,
      },
    });
  }

  async getSessionKey(userId: string): Promise<SessionKeyInfo | null> {
    const sessionKey = await this.prisma.sessionKey.findUnique({
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
      createdAt: sessionKey.createdAt,
      updatedAt: sessionKey.updatedAt,
    };
  }

  async updateSessionKey(
    userId: string,
    updates: Partial<SessionKeyInfo>,
  ): Promise<void> {
    const updateData: any = { ...updates };

    if (updates.sessionPermissions) {
      updateData.sessionPermissions = JSON.stringify(
        updates.sessionPermissions,
      );
    }

    await this.prisma.sessionKey.update({
      where: { userId },
      data: {
        ...updateData,
        updatedAt: Date.now(),
      },
    });
  }

  async revokeSessionKey(userId: string): Promise<void> {
    await this.prisma.sessionKey.delete({
      where: { userId },
    });
  }

  async logAuditEvent(event: AuditEvent): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: event.userId,
        action: event.action,
        timestamp: event.timestamp,
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
