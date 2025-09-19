import { getAbstraxionBackend } from "./abstraxion-backend";
import { prisma } from "./database";

export class KeyRotationManager {
  private static readonly ROTATION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private static rotationTimer: NodeJS.Timeout | null = null;

  /**
   * Start automatic key rotation monitoring
   */
  static startRotationMonitoring(): void {
    if (this.rotationTimer) {
      return; // Already running
    }

    this.rotationTimer = setInterval(async () => {
      await this.checkAndRotateKeys();
    }, this.ROTATION_CHECK_INTERVAL);

    console.log("Key rotation monitoring started");
  }

  /**
   * Stop automatic key rotation monitoring
   */
  static stopRotationMonitoring(): void {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
      console.log("Key rotation monitoring stopped");
    }
  }

  /**
   * Check and rotate keys that need rotation
   */
  private static async checkAndRotateKeys(): Promise<void> {
    try {
      const now = new Date();
      const refreshThreshold = parseInt(
        process.env.REFRESH_THRESHOLD_MS || "3600000",
      ); // 1 hour

      // Find session keys that need rotation
      const sessionKeys = await prisma.sessionKey.findMany({
        where: {
          sessionState: "ACTIVE",
          sessionKeyExpiry: {
            gte: now, // Not expired yet
            lte: new Date(now.getTime() + refreshThreshold), // Within refresh threshold
          },
        },
      });

      for (const sessionKey of sessionKeys) {
        try {
          await this.rotateSessionKey(sessionKey.userId);
          console.log(`Rotated session key for user: ${sessionKey.userId}`);
        } catch (error) {
          console.error(
            `Failed to rotate session key for user ${sessionKey.userId}:`,
            error,
          );
        }
      }

      // Clean up expired session keys
      await this.cleanupExpiredKeys();
    } catch (error) {
      console.error("Error during key rotation check:", error);
    }
  }

  /**
   * Rotate a specific session key
   */
  static async rotateSessionKey(userId: string): Promise<void> {
    const abstraxionBackend = getAbstraxionBackend();

    try {
      // Refresh the session key
      const newSessionKey = await abstraxionBackend.refreshSessionKey(userId);

      if (newSessionKey) {
        console.log(`Successfully rotated session key for user: ${userId}`);
      } else {
        console.log(`No rotation needed for user: ${userId}`);
      }
    } catch (error) {
      console.error(`Failed to rotate session key for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Clean up expired session keys
   */
  private static async cleanupExpiredKeys(): Promise<void> {
    const now = new Date();

    const expiredKeys = await prisma.sessionKey.findMany({
      where: {
        sessionKeyExpiry: {
          lt: now,
        },
        sessionState: {
          not: "REVOKED",
        },
      },
    });

    for (const key of expiredKeys) {
      await prisma.sessionKey.update({
        where: { id: key.id },
        data: { sessionState: "EXPIRED" },
      });
    }

    if (expiredKeys.length > 0) {
      console.log(`Marked ${expiredKeys.length} expired session keys`);
    }
  }

  /**
   * Force rotation of all active session keys
   */
  static async forceRotateAllKeys(): Promise<void> {
    const activeKeys = await prisma.sessionKey.findMany({
      where: {
        sessionState: "ACTIVE",
      },
    });

    for (const key of activeKeys) {
      try {
        await this.rotateSessionKey(key.userId);
      } catch (error) {
        console.error(
          `Failed to force rotate key for user ${key.userId}:`,
          error,
        );
      }
    }
  }

  /**
   * Get rotation statistics
   */
  static async getRotationStats(): Promise<{
    totalActiveKeys: number;
    keysNeedingRotation: number;
    expiredKeys: number;
  }> {
    const now = new Date();
    const refreshThreshold = parseInt(
      process.env.REFRESH_THRESHOLD_MS || "3600000",
    );

    const [totalActiveKeys, keysNeedingRotation, expiredKeys] =
      await Promise.all([
        prisma.sessionKey.count({
          where: { sessionState: "ACTIVE" },
        }),
        prisma.sessionKey.count({
          where: {
            sessionState: "ACTIVE",
            sessionKeyExpiry: {
              gte: now,
              lte: new Date(now.getTime() + refreshThreshold),
            },
          },
        }),
        prisma.sessionKey.count({
          where: {
            sessionKeyExpiry: {
              lt: now,
            },
            sessionState: {
              not: "REVOKED",
            },
          },
        }),
      ]);

    return {
      totalActiveKeys,
      keysNeedingRotation,
      expiredKeys,
    };
  }
}
