import { SessionKeyManager } from "../services/SessionKeyManager";
import { TestDatabaseAdapter } from "./TestDatabaseAdapter";
import { EncryptionService } from "../services/EncryptionService";
import {
  SessionState,
  AuditAction,
  SessionKeyInfo,
  AuditEvent,
} from "../types";

describe("SessionKeyManager", () => {
  let sessionKeyManager: SessionKeyManager;
  let databaseAdapter: TestDatabaseAdapter;

  beforeEach(() => {
    databaseAdapter = new TestDatabaseAdapter();
    sessionKeyManager = new SessionKeyManager(databaseAdapter, {
      encryptionKey: EncryptionService.generateEncryptionKey(),
      sessionKeyExpiryMs: 24 * 60 * 60 * 1000, // 24 hours
      refreshThresholdMs: 60 * 60 * 1000, // 1 hour
      enableAuditLogging: true,
    });
  });

  afterEach(async () => {
    await databaseAdapter.close();
  });

  describe("storeSessionKey", () => {
    it("should store session key with encrypted private key", async () => {
      const userId = "user123";
      const sessionKey = {
        address: "xion1testaddress",
        privateKey: "test-private-key",
        publicKey: "test-public-key",
      };
      const permissions = {
        contracts: ["xion1contract1"],
        bank: [{ denom: "uxion", amount: "1000000" }],
        stake: true,
      };
      const metaAccountAddress = "xion1metaaccount";

      await sessionKeyManager.storeSessionKey(
        userId,
        sessionKey,
        permissions,
        metaAccountAddress,
      );

      const stored = await databaseAdapter.getSessionKey(userId);
      expect(stored).toBeDefined();
      expect(stored!.userId).toBe(userId);
      expect(stored!.sessionKeyAddress).toBe(sessionKey.address);
      expect(stored!.sessionKeyMaterial).not.toBe(sessionKey.privateKey); // Should be encrypted
      expect(stored!.sessionState).toBe(SessionState.ACTIVE);
      expect(stored!.metaAccountAddress).toBe(metaAccountAddress);
    });
  });

  describe("getSessionKey", () => {
    it("should retrieve and decrypt session key", async () => {
      const userId = "user123";
      const sessionKey = {
        address: "xion1testaddress",
        privateKey: "test-private-key",
        publicKey: "test-public-key",
      };
      const permissions = {
        contracts: ["xion1contract1"],
      };
      const metaAccountAddress = "xion1metaaccount";

      await sessionKeyManager.storeSessionKey(
        userId,
        sessionKey,
        permissions,
        metaAccountAddress,
      );

      const retrieved = await sessionKeyManager.getSessionKey(userId);
      expect(retrieved).toBeDefined();
      expect(retrieved!.address).toBe(sessionKey.address);
      expect(retrieved!.privateKey).toBe(sessionKey.privateKey);
    });

    it("should return null for non-existent user", async () => {
      const retrieved = await sessionKeyManager.getSessionKey("nonexistent");
      expect(retrieved).toBeNull();
    });

    it("should throw error for expired session key", async () => {
      const userId = "user123";
      const sessionKey = {
        address: "xion1testaddress",
        privateKey: "test-private-key",
        publicKey: "test-public-key",
      };

      // Store with past expiry time
      const pastTime = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
      const sessionKeyInfo = {
        userId,
        sessionKeyAddress: sessionKey.address,
        sessionKeyMaterial: "encrypted-key",
        sessionKeyExpiry: pastTime,
        sessionPermissions: [],
        sessionState: SessionState.ACTIVE,
        metaAccountAddress: "xion1metaaccount",
        createdAt: pastTime,
        updatedAt: pastTime,
      };

      await databaseAdapter.storeSessionKey(sessionKeyInfo);

      await expect(sessionKeyManager.getSessionKey(userId)).rejects.toThrow(
        "Session key expired",
      );
    });
  });

  describe("validateSessionKey", () => {
    it("should return true for valid session key", async () => {
      const userId = "user123";
      const sessionKey = {
        address: "xion1testaddress",
        privateKey: "test-private-key",
        publicKey: "test-public-key",
      };

      await sessionKeyManager.storeSessionKey(
        userId,
        sessionKey,
        {},
        "xion1metaaccount",
      );

      const isValid = await sessionKeyManager.validateSessionKey(userId);
      expect(isValid).toBe(true);
    });

    it("should return false for expired session key", async () => {
      const userId = "user123";
      const pastTime = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
      const sessionKeyInfo = {
        userId,
        sessionKeyAddress: "xion1testaddress",
        sessionKeyMaterial: "encrypted-key",
        sessionKeyExpiry: pastTime,
        sessionPermissions: [],
        sessionState: SessionState.ACTIVE,
        metaAccountAddress: "xion1metaaccount",
        createdAt: pastTime,
        updatedAt: pastTime,
      };

      await databaseAdapter.storeSessionKey(sessionKeyInfo);

      const isValid = await sessionKeyManager.validateSessionKey(userId);
      expect(isValid).toBe(false);
    });

    it("should return false for non-existent user", async () => {
      const isValid = await sessionKeyManager.validateSessionKey("nonexistent");
      expect(isValid).toBe(false);
    });
  });

  describe("revokeSessionKey", () => {
    it("should revoke and delete session key", async () => {
      const userId = "user123";
      const sessionKey = {
        address: "xion1testaddress",
        privateKey: "test-private-key",
        publicKey: "test-public-key",
      };

      await sessionKeyManager.storeSessionKey(
        userId,
        sessionKey,
        {},
        "xion1metaaccount",
      );

      await sessionKeyManager.revokeSessionKey(userId);

      const retrieved = await sessionKeyManager.getSessionKey(userId);
      expect(retrieved).toBeNull();
    });
  });

  describe("refreshIfNeeded", () => {
    it("should refresh session key when near expiry", async () => {
      const userId = "user123";
      const sessionKey = {
        address: "xion1testaddress",
        privateKey: "test-private-key",
        publicKey: "test-public-key",
      };

      // Store with near expiry time (30 minutes from now)
      const nearExpiryTime = Date.now() + 30 * 60 * 1000;
      const sessionKeyInfo = {
        userId,
        sessionKeyAddress: sessionKey.address,
        sessionKeyMaterial: "encrypted-key",
        sessionKeyExpiry: nearExpiryTime,
        sessionPermissions: [],
        sessionState: SessionState.ACTIVE,
        metaAccountAddress: "xion1metaaccount",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await databaseAdapter.storeSessionKey(sessionKeyInfo);

      const refreshed = await sessionKeyManager.refreshIfNeeded(userId);
      expect(refreshed).toBeDefined();
      expect(refreshed!.address).not.toBe(sessionKey.address); // Should be new address
    });

    it("should not refresh session key when not near expiry", async () => {
      const userId = "user123";
      const sessionKey = {
        address: "xion1testaddress",
        privateKey: "test-private-key",
        publicKey: "test-public-key",
      };

      await sessionKeyManager.storeSessionKey(
        userId,
        sessionKey,
        {},
        "xion1metaaccount",
      );

      const refreshed = await sessionKeyManager.refreshIfNeeded(userId);
      expect(refreshed).toBeDefined();
      expect(refreshed!.address).toBe(sessionKey.address); // Should be same address
    });
  });

  describe("audit logging", () => {
    it("should log audit events when enabled", async () => {
      const userId = "user123";
      const sessionKey = {
        address: "xion1testaddress",
        privateKey: "test-private-key",
        publicKey: "test-public-key",
      };

      await sessionKeyManager.storeSessionKey(
        userId,
        sessionKey,
        {},
        "xion1metaaccount",
      );

      const auditLogs = await databaseAdapter.getAuditLogs(userId);
      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs[0].action).toBe(AuditAction.SESSION_KEY_CREATED);
    });
  });
});
