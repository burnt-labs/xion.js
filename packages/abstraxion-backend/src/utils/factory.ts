import { AbstraxionBackend } from "../endpoints/AbstraxionBackend";
import { AbstraxionBackendConfig, DatabaseAdapter } from "../types";
import { EncryptionService } from "../encryption";

/**
 * Factory function to create AbstraxionBackend instance with validation
 */
export function createAbstraxionBackend(
  config: AbstraxionBackendConfig,
): AbstraxionBackend {
  // Validate required configuration
  validateConfig(config);

  // Validate encryption key
  if (!EncryptionService.validateEncryptionKey(config.encryptionKey)) {
    throw new Error(
      "Invalid encryption key format. Must be a base64-encoded 32-byte key.",
    );
  }

  return new AbstraxionBackend(config);
}

/**
 * Validate configuration object
 */
function validateConfig(config: AbstraxionBackendConfig): void {
  if (!config.rpcUrl) {
    throw new Error("RPC URL is required");
  }

  if (!config.dashboardUrl) {
    throw new Error("Dashboard URL is required");
  }

  if (!config.encryptionKey) {
    throw new Error("Encryption key is required");
  }

  if (!config.databaseAdapter) {
    throw new Error("Database adapter is required");
  }

  // Validate URLs
  try {
    new URL(config.rpcUrl);
  } catch {
    throw new Error("Invalid RPC URL format");
  }

  try {
    new URL(config.dashboardUrl);
  } catch {
    throw new Error("Invalid dashboard URL format");
  }

  // Validate optional configuration
  if (config.sessionKeyExpiryMs && config.sessionKeyExpiryMs <= 0) {
    throw new Error("Session key expiry must be positive");
  }

  if (config.refreshThresholdMs && config.refreshThresholdMs <= 0) {
    throw new Error("Refresh threshold must be positive");
  }

  if (
    config.refreshThresholdMs &&
    config.sessionKeyExpiryMs &&
    config.refreshThresholdMs >= config.sessionKeyExpiryMs
  ) {
    throw new Error("Refresh threshold must be less than session key expiry");
  }
}

/**
 * Create a default configuration with sensible defaults
 */
export function createDefaultConfig(
  rpcUrl: string,
  dashboardUrl: string,
  encryptionKey: string,
  databaseAdapter: DatabaseAdapter,
): AbstraxionBackendConfig {
  return {
    rpcUrl,
    dashboardUrl,
    encryptionKey,
    databaseAdapter,
    sessionKeyExpiryMs: 24 * 60 * 60 * 1000, // 24 hours
    refreshThresholdMs: 60 * 60 * 1000, // 1 hour
    enableAuditLogging: true,
  };
}
