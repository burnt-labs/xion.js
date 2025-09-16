import { AbstraxionBackend } from "@burnt-labs/abstraxion-backend";
import { PrismaDatabaseAdapter } from "./database";
import { prisma } from "./database";

const globalForAbstraxion = globalThis as unknown as {
  abstraxionBackend: AbstraxionBackend | undefined;
};

export function getAbstraxionBackend(): AbstraxionBackend {
  if (globalForAbstraxion.abstraxionBackend) {
    return globalForAbstraxion.abstraxionBackend;
  }

  // ensure all environment variables are set
  if (!process.env.XION_RPC_URL) {
    throw new Error("XION_RPC_URL is not set");
  }
  if (!process.env.XION_DASHBOARD_URL) {
    throw new Error("XION_DASHBOARD_URL is not set");
  }
  if (!process.env.ENCRYPTION_KEY) {
    throw new Error("ENCRYPTION_KEY is not set");
  }

  const databaseAdapter = new PrismaDatabaseAdapter(prisma);

  const config = {
    rpcUrl: process.env.XION_RPC_URL!,
    dashboardUrl: process.env.XION_DASHBOARD_URL!,
    encryptionKey: process.env.ENCRYPTION_KEY!,
    databaseAdapter,
    sessionKeyExpiryMs: parseInt(
      process.env.SESSION_KEY_EXPIRY_MS || "86400000",
    ),
    refreshThresholdMs: parseInt(process.env.REFRESH_THRESHOLD_MS || "3600000"),
    enableAuditLogging: true,
  };

  globalForAbstraxion.abstraxionBackend = new AbstraxionBackend(config);
  return globalForAbstraxion.abstraxionBackend;
}
