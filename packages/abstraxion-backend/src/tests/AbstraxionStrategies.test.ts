import { IncomingMessage } from "node:http";
import {
  DatabaseStorageStrategy,
  DatabaseRedirectStrategy,
} from "../adapters/AbstraxionStategies";
import { SessionKeyManager } from "../services/SessionKeyManager";
import { TestDatabaseAdapter } from "./TestDatabaseAdapter";
import { EncryptionService } from "../services/EncryptionService";
import { SessionState } from "../types";
import {
  InvalidStorageKeyError,
  SessionKeyInvalidError,
  SessionKeyNotFoundError,
} from "../types/errors";

describe("AbstraxionStrategies", () => {
  describe("DatabaseStorageStrategy", () => {
    let storageStrategy: DatabaseStorageStrategy;
    let sessionKeyManager: SessionKeyManager;
    let databaseAdapter: TestDatabaseAdapter;
    const userId = "test-user-123";

    beforeEach(() => {
      databaseAdapter = new TestDatabaseAdapter();
      sessionKeyManager = new SessionKeyManager(databaseAdapter, {
        encryptionKey: EncryptionService.generateEncryptionKey(),
        sessionKeyExpiryMs: 24 * 60 * 60 * 1000, // 24 hours
        refreshThresholdMs: 60 * 60 * 1000, // 1 hour
        enableAuditLogging: true,
      });
      storageStrategy = new DatabaseStorageStrategy(userId, sessionKeyManager);
    });

    afterEach(async () => {
      await databaseAdapter.close();
    });

    describe("getItem", () => {
      it("should get granter account from active session key", async () => {
        // Create a pending session key first
        const sessionKey = await sessionKeyManager.generateSessionKeypair();
        await sessionKeyManager.createPendingSessionKey(userId, sessionKey);

        // Store granted session key to make it active
        const granterAddress = "xion1granter123";
        await sessionKeyManager.storeGrantedSessionKey(
          userId,
          sessionKey.address,
          granterAddress,
        );

        const result = await storageStrategy.getItem(
          "xion-authz-granter-account",
        );
        expect(result).toBe(granterAddress);
      });

      it("should get temp account from active session key", async () => {
        // Create a pending session key first
        const sessionKey = await sessionKeyManager.generateSessionKeypair();
        await sessionKeyManager.createPendingSessionKey(userId, sessionKey);

        // Store granted session key to make it active
        const granterAddress = "xion1granter123";
        await sessionKeyManager.storeGrantedSessionKey(
          userId,
          sessionKey.address,
          granterAddress,
        );

        const result = await storageStrategy.getItem("xion-authz-temp-account");
        expect(result).toBe(sessionKey.address);
      });

      it("should throw InvalidStorageKeyError for invalid key", async () => {
        await expect(storageStrategy.getItem("invalid-key")).rejects.toThrow(
          InvalidStorageKeyError,
        );
        await expect(storageStrategy.getItem("invalid-key")).rejects.toThrow(
          "Invalid storage key: invalid-key@getItem",
        );
      });

      it("should throw SessionKeyNotFoundError when no session key exists", async () => {
        await expect(
          storageStrategy.getItem("xion-authz-granter-account"),
        ).rejects.toThrow(SessionKeyNotFoundError);
        await expect(
          storageStrategy.getItem("xion-authz-granter-account"),
        ).rejects.toThrow(`Session key not found for user: ${userId}`);
      });

      it("should throw SessionKeyNotFoundError when session key is not active", async () => {
        // Create a pending session key (not active)
        const sessionKey = await sessionKeyManager.generateSessionKeypair();
        await sessionKeyManager.createPendingSessionKey(userId, sessionKey);

        await expect(
          storageStrategy.getItem("xion-authz-granter-account"),
        ).rejects.toThrow(SessionKeyNotFoundError);
      });

      it("should throw SessionKeyNotFoundError when session key is expired", async () => {
        // Create a session key and manually set it as expired
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

        await expect(
          storageStrategy.getItem("xion-authz-granter-account"),
        ).rejects.toThrow(SessionKeyNotFoundError);
      });
    });

    describe("setItem", () => {
      it("should set temp account by creating pending session key", async () => {
        const sessionKey = await sessionKeyManager.generateSessionKeypair();
        const serializedKeypair = sessionKey.serializedKeypair;

        await storageStrategy.setItem(
          "xion-authz-temp-account",
          serializedKeypair,
        );

        const sessionKeyInfo =
          await sessionKeyManager.getLastSessionKeyInfo(userId);
        expect(sessionKeyInfo).toBeDefined();
        expect(sessionKeyInfo!.sessionKeyAddress).toBe(sessionKey.address);
        expect(sessionKeyInfo!.sessionState).toBe(SessionState.PENDING);
      });

      it("should set granter account by updating pending session key to active", async () => {
        // First create a pending session key
        const sessionKey = await sessionKeyManager.generateSessionKeypair();
        await sessionKeyManager.createPendingSessionKey(userId, sessionKey);

        const granterAddress = "xion1granter123";
        await storageStrategy.setItem(
          "xion-authz-granter-account",
          granterAddress,
        );

        const sessionKeyInfo =
          await sessionKeyManager.getLastSessionKeyInfo(userId);
        expect(sessionKeyInfo).toBeDefined();
        expect(sessionKeyInfo!.metaAccountAddress).toBe(granterAddress);
        expect(sessionKeyInfo!.sessionState).toBe(SessionState.ACTIVE);
      });

      it("should throw SessionKeyInvalidError when trying to set granter account without pending session key", async () => {
        const granterAddress = "xion1granter123";

        await expect(
          storageStrategy.setItem("xion-authz-granter-account", granterAddress),
        ).rejects.toThrow(SessionKeyInvalidError);
        await expect(
          storageStrategy.setItem("xion-authz-granter-account", granterAddress),
        ).rejects.toThrow("Session key is not in PENDING state");
      });

      it("should throw SessionKeyInvalidError when trying to set granter account with non-pending session key", async () => {
        // Create and activate a session key
        const sessionKey = await sessionKeyManager.generateSessionKeypair();
        await sessionKeyManager.createPendingSessionKey(userId, sessionKey);
        await sessionKeyManager.storeGrantedSessionKey(
          userId,
          sessionKey.address,
          "xion1granter123",
        );

        const granterAddress = "xion1granter456";

        await expect(
          storageStrategy.setItem("xion-authz-granter-account", granterAddress),
        ).rejects.toThrow(SessionKeyInvalidError);
      });

      it("should throw InvalidStorageKeyError for invalid key", async () => {
        await expect(
          storageStrategy.setItem("invalid-key", "value"),
        ).rejects.toThrow(InvalidStorageKeyError);
        await expect(
          storageStrategy.setItem("invalid-key", "value"),
        ).rejects.toThrow("Invalid storage key: invalid-key@setItem");
      });

      it("should handle deserialization errors for temp account", async () => {
        const invalidSerializedKeypair = "invalid-serialized-keypair";

        await expect(
          storageStrategy.setItem(
            "xion-authz-temp-account",
            invalidSerializedKeypair,
          ),
        ).rejects.toThrow();
      });
    });

    describe("removeItem", () => {
      it("should remove temp account by revoking active session keys", async () => {
        // Create and activate a session key
        const sessionKey = await sessionKeyManager.generateSessionKeypair();
        await sessionKeyManager.createPendingSessionKey(userId, sessionKey);
        await sessionKeyManager.storeGrantedSessionKey(
          userId,
          sessionKey.address,
          "xion1granter123",
        );

        await storageStrategy.removeItem("xion-authz-temp-account");

        const sessionKeyInfo =
          await sessionKeyManager.getLastSessionKeyInfo(userId);
        expect(sessionKeyInfo).toBeDefined();
        expect(sessionKeyInfo!.sessionState).toBe(SessionState.REVOKED);
      });

      it("should remove granter account by revoking active session keys", async () => {
        // Create and activate a session key
        const sessionKey = await sessionKeyManager.generateSessionKeypair();
        await sessionKeyManager.createPendingSessionKey(userId, sessionKey);
        await sessionKeyManager.storeGrantedSessionKey(
          userId,
          sessionKey.address,
          "xion1granter123",
        );

        await storageStrategy.removeItem("xion-authz-granter-account");

        const sessionKeyInfo =
          await sessionKeyManager.getLastSessionKeyInfo(userId);
        expect(sessionKeyInfo).toBeDefined();
        expect(sessionKeyInfo!.sessionState).toBe(SessionState.REVOKED);
      });

      it("should throw InvalidStorageKeyError for invalid key", async () => {
        await expect(storageStrategy.removeItem("invalid-key")).rejects.toThrow(
          InvalidStorageKeyError,
        );
        await expect(storageStrategy.removeItem("invalid-key")).rejects.toThrow(
          "Invalid storage key: invalid-key@removeItem",
        );
      });

      it("should handle removal when no session keys exist", async () => {
        // Should not throw error even if no session keys exist
        await expect(
          storageStrategy.removeItem("xion-authz-temp-account"),
        ).resolves.not.toThrow();
      });
    });
  });

  describe("DatabaseRedirectStrategy", () => {
    let redirectStrategy: DatabaseRedirectStrategy;
    let mockRequest: IncomingMessage;
    let mockOnRedirectMethod: jest.Mock;

    beforeEach(() => {
      mockOnRedirectMethod = jest.fn();
      mockRequest = {
        url: "/test-path?param1=value1&param2=value2",
        headers: {
          host: "example.com",
          "x-forwarded-proto": "https",
        },
      } as unknown as IncomingMessage;
      redirectStrategy = new DatabaseRedirectStrategy(
        mockRequest,
        mockOnRedirectMethod,
      );
    });

    describe("getCurrentUrl", () => {
      it("should return URL with x-forwarded-proto when available", async () => {
        const url = await redirectStrategy.getCurrentUrl();
        expect(url).toBe(
          "https://example.com/test-path?param1=value1&param2=value2",
        );
      });

      it("should return URL with http when x-forwarded-proto is not available", async () => {
        mockRequest.headers = { host: "example.com" };
        const url = await redirectStrategy.getCurrentUrl();
        expect(url).toBe(
          "http://example.com/test-path?param1=value1&param2=value2",
        );
      });

      it("should handle missing host header", async () => {
        mockRequest.headers = {};
        const url = await redirectStrategy.getCurrentUrl();
        expect(url).toBe(
          "http://localhost/test-path?param1=value1&param2=value2",
        );
      });

      it("should handle missing url", async () => {
        mockRequest.url = undefined;
        const url = await redirectStrategy.getCurrentUrl();
        expect(url).toBe("https://example.comundefined");
      });
    });

    describe("redirect", () => {
      it("should call onRedirectMethod when provided", async () => {
        const redirectUrl = "https://example.com/redirect";
        await redirectStrategy.redirect(redirectUrl);
        expect(mockOnRedirectMethod).toHaveBeenCalledWith(redirectUrl);
      });

      it("should not throw error when onRedirectMethod is not provided", async () => {
        const redirectStrategyWithoutMethod = new DatabaseRedirectStrategy(
          mockRequest,
        );
        const redirectUrl = "https://example.com/redirect";
        await expect(
          redirectStrategyWithoutMethod.redirect(redirectUrl),
        ).resolves.not.toThrow();
      });
    });

    describe("getUrlParameter", () => {
      it("should return parameter value when it exists", async () => {
        const paramValue = await redirectStrategy.getUrlParameter("param1");
        expect(paramValue).toBe("value1");
      });

      it("should return null when parameter does not exist", async () => {
        const paramValue =
          await redirectStrategy.getUrlParameter("nonexistent");
        expect(paramValue).toBeNull();
      });

      it("should return null when url is not available", async () => {
        mockRequest.url = undefined;
        const paramValue = await redirectStrategy.getUrlParameter("param1");
        expect(paramValue).toBeNull();
      });

      it("should handle empty parameter value", async () => {
        mockRequest.url = "/test-path?emptyParam=";
        const paramValue = await redirectStrategy.getUrlParameter("emptyParam");
        expect(paramValue).toBe("");
      });

      it("should handle URL with hash", async () => {
        mockRequest.url = "/test-path?param1=value1#hash";
        const paramValue = await redirectStrategy.getUrlParameter("param1");
        expect(paramValue).toBe("value1");
      });
    });

    describe("cleanUrlParameters", () => {
      it("should resolve without doing anything", async () => {
        await expect(
          redirectStrategy.cleanUrlParameters(["param1", "param2"]),
        ).resolves.not.toThrow();
      });

      it("should handle empty parameter list", async () => {
        await expect(
          redirectStrategy.cleanUrlParameters([]),
        ).resolves.not.toThrow();
      });
    });

    describe("private getUrl method", () => {
      it("should handle different protocol scenarios", () => {
        // Test with x-forwarded-proto
        mockRequest.headers = {
          host: "example.com",
          "x-forwarded-proto": "https",
        };
        mockRequest.url = "/test";
        const url1 = (redirectStrategy as any).getUrl();
        expect(url1.protocol).toBe("https:");

        // Test without x-forwarded-proto
        mockRequest.headers = { host: "example.com" };
        const url2 = (redirectStrategy as any).getUrl();
        expect(url2.protocol).toBe("http:");
      });

      it("should handle missing host", () => {
        mockRequest.headers = {};
        mockRequest.url = "/test";
        const url = (redirectStrategy as any).getUrl();
        expect(url.host).toBe("undefined");
      });

      it("should handle relative URL", () => {
        mockRequest.headers = { host: "example.com" };
        mockRequest.url = "/test?param=value";
        const url = (redirectStrategy as any).getUrl();
        expect(url.pathname).toBe("/test");
        expect(url.searchParams.get("param")).toBe("value");
      });
    });
  });

  describe("Integration tests", () => {
    let storageStrategy: DatabaseStorageStrategy;
    let sessionKeyManager: SessionKeyManager;
    let databaseAdapter: TestDatabaseAdapter;
    const userId = "integration-test-user";

    beforeEach(() => {
      databaseAdapter = new TestDatabaseAdapter();
      sessionKeyManager = new SessionKeyManager(databaseAdapter, {
        encryptionKey: EncryptionService.generateEncryptionKey(),
        sessionKeyExpiryMs: 24 * 60 * 60 * 1000,
        refreshThresholdMs: 60 * 60 * 1000,
        enableAuditLogging: true,
      });
      storageStrategy = new DatabaseStorageStrategy(userId, sessionKeyManager);
    });

    afterEach(async () => {
      await databaseAdapter.close();
    });

    it("should complete full workflow: create temp account, set granter, get both accounts, then remove", async () => {
      // 1. Create temp account
      const sessionKey = await sessionKeyManager.generateSessionKeypair();
      await storageStrategy.setItem(
        "xion-authz-temp-account",
        sessionKey.serializedKeypair,
      );

      // 2. Set granter account (should activate the session key)
      const granterAddress = "xion1granter123";
      await storageStrategy.setItem(
        "xion-authz-granter-account",
        granterAddress,
      );

      // 3. Get both accounts
      const retrievedTempAccount = await storageStrategy.getItem(
        "xion-authz-temp-account",
      );
      const retrievedGranterAccount = await storageStrategy.getItem(
        "xion-authz-granter-account",
      );

      expect(retrievedTempAccount).toBe(sessionKey.address);
      expect(retrievedGranterAccount).toBe(granterAddress);

      // 4. Remove both accounts
      await storageStrategy.removeItem("xion-authz-temp-account");
      await storageStrategy.removeItem("xion-authz-granter-account");

      // 5. Verify session key is revoked
      const sessionKeyInfo =
        await sessionKeyManager.getLastSessionKeyInfo(userId);
      expect(sessionKeyInfo).toBeDefined();
      expect(sessionKeyInfo!.sessionState).toBe(SessionState.REVOKED);
    });

    it("should handle multiple session keys correctly", async () => {
      // Create first session key
      const sessionKey1 = await sessionKeyManager.generateSessionKeypair();
      await storageStrategy.setItem(
        "xion-authz-temp-account",
        sessionKey1.serializedKeypair,
      );
      await storageStrategy.setItem(
        "xion-authz-granter-account",
        "xion1granter1",
      );

      // Create second session key (should revoke first one)
      const sessionKey2 = await sessionKeyManager.generateSessionKeypair();
      await storageStrategy.setItem(
        "xion-authz-temp-account",
        sessionKey2.serializedKeypair,
      );
      await storageStrategy.setItem(
        "xion-authz-granter-account",
        "xion1granter2",
      );

      // Should get the latest session key
      const retrievedTempAccount = await storageStrategy.getItem(
        "xion-authz-temp-account",
      );
      const retrievedGranterAccount = await storageStrategy.getItem(
        "xion-authz-granter-account",
      );

      expect(retrievedTempAccount).toBe(sessionKey2.address);
      expect(retrievedGranterAccount).toBe("xion1granter2");
    });
  });
});
