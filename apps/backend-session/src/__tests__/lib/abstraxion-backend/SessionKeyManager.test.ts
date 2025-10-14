import { SessionKeyManager } from "../../../lib/xion/backend/services/SessionKeyManager";
import { TestDatabaseAdapter } from "../../../lib/xion/backend/adapters/TestDatabaseAdapter";
import { EncryptionService } from "../../../lib/xion/backend/services/EncryptionService";
import {
  SessionState,
  AuditAction,
  XionKeypair,
} from "../../../lib/xion/backend/types";
import {
  UserIdRequiredError,
  SessionKeyNotFoundError,
  SessionKeyInvalidError,
  SessionKeyStorageError,
  SessionKeyRevocationError,
  SessionKeyRefreshError,
} from "../../../lib/xion/backend/types/errors";
import { EncryptionError } from "../../../lib/xion/backend/types";

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

    it("should not log audit events when disabled", async () => {
      const sessionKeyManagerDisabled = new SessionKeyManager(databaseAdapter, {
        encryptionKey: EncryptionService.generateEncryptionKey(),
        sessionKeyExpiryMs: 24 * 60 * 60 * 1000,
        refreshThresholdMs: 60 * 60 * 1000,
        enableAuditLogging: false,
      });

      const userId = "user123";
      const sessionKey =
        await sessionKeyManagerDisabled.generateSessionKeypair();

      await sessionKeyManagerDisabled.createPendingSessionKey(
        userId,
        sessionKey,
      );

      const auditLogs = await databaseAdapter.getAuditLogs(userId);
      expect(auditLogs.length).toBe(0);
    });

    it("should handle audit logging errors gracefully", async () => {
      // Mock database adapter to throw error on audit logging
      const mockDatabaseAdapter = {
        ...databaseAdapter,
        logAuditEvent: jest
          .fn()
          .mockRejectedValue(new Error("Audit logging failed")),
        addNewSessionKey: jest.fn().mockResolvedValue(undefined),
      } as any;

      const sessionKeyManagerWithError = new SessionKeyManager(
        mockDatabaseAdapter,
        {
          encryptionKey: EncryptionService.generateEncryptionKey(),
          sessionKeyExpiryMs: 24 * 60 * 60 * 1000,
          refreshThresholdMs: 60 * 60 * 1000,
          enableAuditLogging: true,
        },
      );

      const userId = "user123";
      const sessionKey =
        await sessionKeyManagerWithError.generateSessionKeypair();

      // Should not throw error even if audit logging fails
      await expect(
        sessionKeyManagerWithError.createPendingSessionKey(userId, sessionKey),
      ).resolves.not.toThrow();
    });
  });

  describe("markAsExpired", () => {
    it("should mark session key as expired", async () => {
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

      // Call getLastSessionKeyInfo which should mark as expired
      const result = await sessionKeyManager.getLastSessionKeyInfo(userId);
      expect(result).toBeNull();

      // Check that the session key was marked as expired
      const updatedKey = await databaseAdapter.getSessionKey(
        userId,
        "xion1testaddress",
      );
      expect(updatedKey!.sessionState).toBe(SessionState.EXPIRED);
    });

    it("should handle markAsExpired errors gracefully", async () => {
      const userId = "user123";
      const pastTime = new Date(Date.now() - 25 * 60 * 60 * 1000);
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

      // Mock database adapter to throw error on update
      const mockDatabaseAdapter = {
        ...databaseAdapter,
        updateSessionKeyWithParams: jest
          .fn()
          .mockRejectedValue(new Error("Update failed")),
      } as any;

      const sessionKeyManagerWithError = new SessionKeyManager(
        mockDatabaseAdapter,
        {
          encryptionKey: EncryptionService.generateEncryptionKey(),
          sessionKeyExpiryMs: 24 * 60 * 60 * 1000,
          refreshThresholdMs: 60 * 60 * 1000,
          enableAuditLogging: true,
        },
      );

      // Should not throw error even if markAsExpired fails
      const result =
        await sessionKeyManagerWithError.getLastSessionKeyInfo(userId);
      expect(result).toBeNull();
    });
  });

  describe("getSessionKeypair with SessionKeyInfo parameter", () => {
    it("should work with SessionKeyInfo object", async () => {
      const userId = "user123";
      const sessionKey = await sessionKeyManager.generateSessionKeypair();
      await sessionKeyManager.createPendingSessionKey(userId, sessionKey);

      const sessionKeyInfo = await databaseAdapter.getLastSessionKey(userId);
      expect(sessionKeyInfo).toBeDefined();

      const retrieved = await sessionKeyManager.getSessionKeypair(
        sessionKeyInfo!,
      );
      expect(retrieved).toBeDefined();
      expect(retrieved).toHaveProperty("getAccounts");
      expect(retrieved).toHaveProperty("serialize");
    });

    it("should throw error for null SessionKeyInfo", async () => {
      await expect(
        sessionKeyManager.getSessionKeypair(null as any),
      ).rejects.toThrow(SessionKeyNotFoundError);
    });
  });

  describe("validateSessionKey with SessionKeyInfo parameter", () => {
    it("should work with SessionKeyInfo object", async () => {
      const futureTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
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

      const isValid =
        await sessionKeyManager.validateSessionKey(sessionKeyInfo);
      expect(isValid).toBe(true);
    });

    it("should return false for null SessionKeyInfo", async () => {
      // validateSessionKey expects a string or SessionKeyInfo, null should throw
      await expect(
        sessionKeyManager.validateSessionKey(null as any),
      ).rejects.toThrow(UserIdRequiredError);
    });
  });

  describe("revokeActiveSessionKeys", () => {
    it("should revoke all active session keys", async () => {
      const userId = "user123";

      // Create multiple session keys
      const sessionKey1 = await sessionKeyManager.generateSessionKeypair();
      const sessionKey2 = await sessionKeyManager.generateSessionKeypair();

      await sessionKeyManager.createPendingSessionKey(userId, sessionKey1);
      await sessionKeyManager.createPendingSessionKey(userId, sessionKey2);

      // Activate both session keys
      await sessionKeyManager.storeGrantedSessionKey(
        userId,
        sessionKey1.address,
        "xion1granter1",
      );
      await sessionKeyManager.storeGrantedSessionKey(
        userId,
        sessionKey2.address,
        "xion1granter2",
      );

      // Revoke all active session keys
      await sessionKeyManager.revokeActiveSessionKeys(userId);

      // Check that both are revoked
      const activeKeys = await databaseAdapter.getActiveSessionKeys(userId);
      expect(activeKeys.length).toBe(0);
    });

    it("should handle case when no active session keys exist", async () => {
      const userId = "user123";

      // Should not throw error
      await expect(
        sessionKeyManager.revokeActiveSessionKeys(userId),
      ).resolves.not.toThrow();
    });

    it("should throw error for empty userId", async () => {
      await expect(
        sessionKeyManager.revokeActiveSessionKeys(""),
      ).rejects.toThrow(UserIdRequiredError);
    });
  });

  describe("refreshIfNeeded edge cases", () => {
    it("should handle database errors gracefully", async () => {
      const userId = "user123";

      // Mock database adapter to throw error
      const mockDatabaseAdapter = {
        ...databaseAdapter,
        getLastSessionKey: jest
          .fn()
          .mockRejectedValue(new Error("Database error")),
      } as any;

      const sessionKeyManagerWithError = new SessionKeyManager(
        mockDatabaseAdapter,
        {
          encryptionKey: EncryptionService.generateEncryptionKey(),
          sessionKeyExpiryMs: 24 * 60 * 60 * 1000,
          refreshThresholdMs: 60 * 60 * 1000,
          enableAuditLogging: true,
        },
      );

      await expect(
        sessionKeyManagerWithError.refreshIfNeeded(userId),
      ).rejects.toThrow(SessionKeyRefreshError);
    });

    it("should handle decryption errors during refresh", async () => {
      const userId = "user123";
      const sessionKey = await sessionKeyManager.generateSessionKeypair();

      // Create session key with invalid encrypted material
      const invalidSessionKeyInfo = {
        userId,
        sessionKeyAddress: sessionKey.address,
        sessionKeyMaterial: "invalid-encrypted-data",
        sessionKeyExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
        sessionPermissions: {},
        sessionState: SessionState.ACTIVE,
        metaAccountAddress: "xion1metaaccount",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await databaseAdapter.storeSessionKey(invalidSessionKeyInfo);

      await expect(sessionKeyManager.refreshIfNeeded(userId)).rejects.toThrow(
        EncryptionError,
      );
    });
  });

  describe("storeGrantedSessionKey edge cases", () => {
    it("should throw error for non-pending session key", async () => {
      const userId = "user123";
      const sessionKey = await sessionKeyManager.generateSessionKeypair();

      // Create and activate session key
      await sessionKeyManager.createPendingSessionKey(userId, sessionKey);
      await sessionKeyManager.storeGrantedSessionKey(
        userId,
        sessionKey.address,
        "xion1granter1",
      );

      // Try to store granted session key again (should fail because it's already active)
      await expect(
        sessionKeyManager.storeGrantedSessionKey(
          userId,
          sessionKey.address,
          "xion1granter2",
        ),
      ).rejects.toThrow(SessionKeyInvalidError);
    });

    it("should handle database errors during storeGrantedSessionKey", async () => {
      const userId = "user123";
      const sessionKey = await sessionKeyManager.generateSessionKeypair();

      await sessionKeyManager.createPendingSessionKey(userId, sessionKey);

      // Mock database adapter to throw error
      const mockDatabaseAdapter = {
        ...databaseAdapter,
        updateSessionKeyWithParams: jest
          .fn()
          .mockRejectedValue(new Error("Update failed")),
      } as any;

      const sessionKeyManagerWithError = new SessionKeyManager(
        mockDatabaseAdapter,
        {
          encryptionKey: EncryptionService.generateEncryptionKey(),
          sessionKeyExpiryMs: 24 * 60 * 60 * 1000,
          refreshThresholdMs: 60 * 60 * 1000,
          enableAuditLogging: true,
        },
      );

      await expect(
        sessionKeyManagerWithError.storeGrantedSessionKey(
          userId,
          sessionKey.address,
          "xion1granter",
        ),
      ).rejects.toThrow(SessionKeyStorageError);
    });
  });

  describe("generateSessionKeypair edge cases", () => {
    it("should generate valid session keypair", async () => {
      const keypair = await sessionKeyManager.generateSessionKeypair();

      expect(keypair).toBeDefined();
      expect(keypair.address).toBeDefined();
      expect(keypair.serializedKeypair).toBeDefined();
      expect(typeof keypair.address).toBe("string");
      expect(typeof keypair.serializedKeypair).toBe("string");
    });
  });

  describe("createPendingSessionKey edge cases", () => {
    it("should handle database errors during creation", async () => {
      const userId = "user123";
      const sessionKey = await sessionKeyManager.generateSessionKeypair();

      // Mock database adapter to throw error
      const mockDatabaseAdapter = {
        ...databaseAdapter,
        addNewSessionKey: jest
          .fn()
          .mockRejectedValue(new Error("Database error")),
      } as any;

      const sessionKeyManagerWithError = new SessionKeyManager(
        mockDatabaseAdapter,
        {
          encryptionKey: EncryptionService.generateEncryptionKey(),
          sessionKeyExpiryMs: 24 * 60 * 60 * 1000,
          refreshThresholdMs: 60 * 60 * 1000,
          enableAuditLogging: true,
        },
      );

      await expect(
        sessionKeyManagerWithError.createPendingSessionKey(userId, sessionKey),
      ).rejects.toThrow(SessionKeyStorageError);
    });

    it("should handle encryption errors during creation", async () => {
      const userId = "user123";
      const sessionKey = await sessionKeyManager.generateSessionKeypair();

      // Mock encryption service to throw error
      const mockEncryptionService = {
        encryptSessionKey: jest
          .fn()
          .mockRejectedValue(new Error("Encryption failed")),
      };

      const sessionKeyManagerWithError = new SessionKeyManager(
        databaseAdapter,
        {
          encryptionKey: EncryptionService.generateEncryptionKey(),
          sessionKeyExpiryMs: 24 * 60 * 60 * 1000,
          refreshThresholdMs: 60 * 60 * 1000,
          enableAuditLogging: true,
        },
      );

      // Replace the encryption service
      (sessionKeyManagerWithError as any).encryptionService =
        mockEncryptionService;

      await expect(
        sessionKeyManagerWithError.createPendingSessionKey(userId, sessionKey),
      ).rejects.toThrow(SessionKeyStorageError);
    });
  });
});
