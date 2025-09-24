import { SessionKeyManager } from "../services/SessionKeyManager";
import { TestDatabaseAdapter } from "./TestDatabaseAdapter";
import { EncryptionService } from "../services/EncryptionService";
import { SessionState, AuditAction, XionKeypair } from "../types";
import {
  UserIdRequiredError,
  SessionKeyNotFoundError,
  SessionKeyInvalidError,
  SessionKeyStorageError,
  SessionKeyRetrievalError,
  SessionKeyRevocationError,
  SessionKeyRefreshError,
} from "../types/errors";

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

  describe("createPendingSessionKey", () => {
    it("should create pending session key with encrypted private key", async () => {
      const userId = "user123";
      const sessionKey: XionKeypair = {
        address: "xion1testaddress",
        serializedKeypair: "test-serialized-keypair",
      };

      await sessionKeyManager.createPendingSessionKey(userId, sessionKey);

      const stored = await databaseAdapter.getLastSessionKey(userId);
      expect(stored).toBeDefined();
      expect(stored!.userId).toBe(userId);
      expect(stored!.sessionKeyAddress).toBe(sessionKey.address);
      expect(stored!.sessionKeyMaterial).not.toBe(sessionKey.serializedKeypair); // Should be encrypted
      expect(stored!.sessionState).toBe(SessionState.PENDING);
    });

    it("should throw error for empty userId", async () => {
      const sessionKey: XionKeypair = {
        address: "xion1testaddress",
        serializedKeypair: "test-serialized-keypair",
      };

      await expect(
        sessionKeyManager.createPendingSessionKey("", sessionKey),
      ).rejects.toThrow(UserIdRequiredError);
    });
  });

  describe("getSessionKeypair", () => {
    it("should retrieve and decrypt session key", async () => {
      const userId = "user123";
      // Generate a real session keypair for testing
      const sessionKey = await sessionKeyManager.generateSessionKeypair();

      await sessionKeyManager.createPendingSessionKey(userId, sessionKey);

      const retrieved = await sessionKeyManager.getSessionKeypair(userId);
      expect(retrieved).toBeDefined();
      expect(retrieved).toHaveProperty("getAccounts");
      expect(retrieved).toHaveProperty("serialize");
    });

    it("should throw error for non-existent user", async () => {
      await expect(
        sessionKeyManager.getSessionKeypair("nonexistent"),
      ).rejects.toThrow(SessionKeyNotFoundError);
    });

    it("should throw error for expired session key", async () => {
      const userId = "user123";
      const sessionKey = await sessionKeyManager.generateSessionKeypair();

      await sessionKeyManager.createPendingSessionKey(userId, sessionKey);

      // Store with past expiry time
      const pastTime = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      const sessionKeyInfo = {
        userId,
        sessionKeyAddress: sessionKey.address,
        sessionKeyMaterial:
          await sessionKeyManager.encryptionService.encryptSessionKey(
            sessionKey.serializedKeypair,
          ),
        sessionKeyExpiry: pastTime,
        sessionPermissions: {},
        sessionState: SessionState.ACTIVE,
        metaAccountAddress: "xion1metaaccount",
        createdAt: pastTime,
        updatedAt: pastTime,
      };

      await databaseAdapter.storeSessionKey(sessionKeyInfo);

      await expect(sessionKeyManager.getSessionKeypair(userId)).rejects.toThrow(
        SessionKeyNotFoundError,
      );
    });
  });

  describe("validateSessionKey", () => {
    it("should return false for pending session key", async () => {
      const userId = "user123";
      const sessionKey = await sessionKeyManager.generateSessionKeypair();

      await sessionKeyManager.createPendingSessionKey(userId, sessionKey);

      const isValid = await sessionKeyManager.validateSessionKey(userId);
      expect(isValid).toBe(false); // Should be false because it's PENDING, not ACTIVE
    });

    it("should return false for expired session key", async () => {
      const userId = "user123";
      const pastTime = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      const sessionKeyInfo = {
        userId,
        sessionKeyAddress: "xion1testaddress",
        sessionKeyMaterial: "encrypted-key",
        sessionKeyExpiry: pastTime,
        sessionPermissions: {},
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

    it("should throw error for empty userId", async () => {
      await expect(sessionKeyManager.validateSessionKey("")).rejects.toThrow(
        UserIdRequiredError,
      );
    });
  });

  describe("revokeSessionKey", () => {
    it("should revoke session key", async () => {
      const userId = "user123";
      const sessionKey = await sessionKeyManager.generateSessionKeypair();

      await sessionKeyManager.createPendingSessionKey(userId, sessionKey);

      await sessionKeyManager.revokeSessionKey(userId, sessionKey.address);

      const retrieved = await sessionKeyManager.getLastSessionKeyInfo(userId);
      expect(retrieved).toBeDefined();
      expect(retrieved!.sessionState).toBe(SessionState.REVOKED);
    });

    it("should throw error for empty userId", async () => {
      await expect(
        sessionKeyManager.revokeSessionKey("", "xion1testaddress"),
      ).rejects.toThrow(UserIdRequiredError);
    });

    it("should throw error for empty sessionKeyAddress", async () => {
      await expect(
        sessionKeyManager.revokeSessionKey("user123", ""),
      ).rejects.toThrow("Session key address is required");
    });
  });

  describe("refreshIfNeeded", () => {
    it("should refresh session key when near expiry", async () => {
      const userId = "user123";
      const sessionKey = await sessionKeyManager.generateSessionKeypair();

      // Store with near expiry time (30 minutes from now)
      const nearExpiryTime = new Date(Date.now() + 30 * 60 * 1000);
      const sessionKeyInfo = {
        userId,
        sessionKeyAddress: sessionKey.address,
        sessionKeyMaterial:
          await sessionKeyManager.encryptionService.encryptSessionKey(
            sessionKey.serializedKeypair,
          ),
        sessionKeyExpiry: nearExpiryTime,
        sessionPermissions: {},
        sessionState: SessionState.ACTIVE,
        metaAccountAddress: "xion1metaaccount",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await databaseAdapter.storeSessionKey(sessionKeyInfo);

      const refreshed = await sessionKeyManager.refreshIfNeeded(userId);
      expect(refreshed).toBeDefined();
      expect(refreshed!.address).not.toBe(sessionKey.address); // Should be new address
    });

    it("should not refresh session key when not near expiry", async () => {
      const userId = "user123";
      const sessionKey = await sessionKeyManager.generateSessionKeypair();

      await sessionKeyManager.createPendingSessionKey(userId, sessionKey);

      const refreshed = await sessionKeyManager.refreshIfNeeded(userId);
      expect(refreshed).toBeDefined();
      expect(refreshed!.address).toBe(sessionKey.address); // Should be same address
    });

    it("should throw error for empty userId", async () => {
      await expect(sessionKeyManager.refreshIfNeeded("")).rejects.toThrow(
        UserIdRequiredError,
      );
    });
  });

  describe("storeGrantedSessionKey", () => {
    it("should update pending session key to active with permissions", async () => {
      const userId = "user123";
      const sessionKey = await sessionKeyManager.generateSessionKeypair();

      await sessionKeyManager.createPendingSessionKey(userId, sessionKey);

      const permissions = {
        contracts: ["xion1contract1"],
        bank: [{ denom: "uxion", amount: "1000000" }],
        stake: true,
      };
      const granterAddress = "xion1metaaccount";

      await sessionKeyManager.storeGrantedSessionKey(
        userId,
        sessionKey.address,
        granterAddress,
        permissions,
      );

      const stored = await databaseAdapter.getSessionKey(
        userId,
        sessionKey.address,
      );
      expect(stored).toBeDefined();
      expect(stored!.sessionState).toBe(SessionState.ACTIVE);
      expect(stored!.metaAccountAddress).toBe(granterAddress);
      expect(stored!.sessionPermissions).toEqual(permissions);
    });

    it("should throw error for non-existent session key", async () => {
      await expect(
        sessionKeyManager.storeGrantedSessionKey(
          "user123",
          "nonexistent-address",
          "xion1metaaccount",
        ),
      ).rejects.toThrow(SessionKeyNotFoundError);
    });

    it("should throw error for empty userId", async () => {
      await expect(
        sessionKeyManager.storeGrantedSessionKey(
          "",
          "xion1testaddress",
          "xion1metaaccount",
        ),
      ).rejects.toThrow(UserIdRequiredError);
    });
  });

  describe("generateSessionKeypair", () => {
    it("should generate valid session keypair", async () => {
      const keypair = await sessionKeyManager.generateSessionKeypair();

      expect(keypair).toBeDefined();
      expect(keypair.address).toBeDefined();
      expect(keypair.serializedKeypair).toBeDefined();
      expect(typeof keypair.address).toBe("string");
      expect(typeof keypair.serializedKeypair).toBe("string");
    });
  });

  describe("getLastSessionKeyInfo", () => {
    it("should return session key info without decrypting", async () => {
      const userId = "user123";
      const sessionKey = await sessionKeyManager.generateSessionKeypair();

      await sessionKeyManager.createPendingSessionKey(userId, sessionKey);

      const info = await sessionKeyManager.getLastSessionKeyInfo(userId);
      expect(info).toBeDefined();
      expect(info!.userId).toBe(userId);
      expect(info!.sessionKeyAddress).toBe(sessionKey.address);
      expect(info!.sessionState).toBe(SessionState.PENDING);
    });

    it("should return null for non-existent user", async () => {
      const info = await sessionKeyManager.getLastSessionKeyInfo("nonexistent");
      expect(info).toBeNull();
    });

    it("should throw error for empty userId", async () => {
      await expect(sessionKeyManager.getLastSessionKeyInfo("")).rejects.toThrow(
        UserIdRequiredError,
      );
    });
  });

  describe("isExpired and isActive", () => {
    it("should correctly identify expired session key", () => {
      const pastTime = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      const sessionKeyInfo = {
        userId: "user123",
        sessionKeyAddress: "xion1testaddress",
        sessionKeyMaterial: "encrypted-key",
        sessionKeyExpiry: pastTime,
        sessionPermissions: {},
        sessionState: SessionState.ACTIVE,
        metaAccountAddress: "xion1metaaccount",
        createdAt: pastTime,
        updatedAt: pastTime,
      };

      expect(sessionKeyManager.isExpired(sessionKeyInfo)).toBe(true);
      expect(sessionKeyManager.isActive(sessionKeyInfo)).toBe(false);
    });

    it("should correctly identify active session key", () => {
      const futureTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
      const sessionKeyInfo = {
        userId: "user123",
        sessionKeyAddress: "xion1testaddress",
        sessionKeyMaterial: "encrypted-key",
        sessionKeyExpiry: futureTime,
        sessionPermissions: {},
        sessionState: SessionState.ACTIVE,
        metaAccountAddress: "xion1metaaccount",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(sessionKeyManager.isExpired(sessionKeyInfo)).toBe(false);
      expect(sessionKeyManager.isActive(sessionKeyInfo)).toBe(true);
    });
  });

  describe("audit logging", () => {
    it("should log audit events when enabled", async () => {
      const userId = "user123";
      const sessionKey = await sessionKeyManager.generateSessionKeypair();

      await sessionKeyManager.createPendingSessionKey(userId, sessionKey);

      const auditLogs = await databaseAdapter.getAuditLogs(userId);
      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs[0].action).toBe(AuditAction.SESSION_KEY_CREATED);
    });
  });
});
