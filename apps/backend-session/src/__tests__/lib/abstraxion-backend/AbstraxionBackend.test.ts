import { IncomingMessage } from "node:http";
import { AbstraxionBackend } from "../../../lib/xion/backend/AbstraxionBackend";
import { TestDatabaseAdapter } from "../../../lib/xion/backend/adapters/TestDatabaseAdapter";
import { EncryptionService } from "../../../lib/xion/backend/services/EncryptionService";
import { SessionState } from "../../../lib/xion/backend/types";
import {
  EncryptionKeyRequiredError,
  DatabaseAdapterRequiredError,
  RedirectUrlRequiredError,
  TreasuryRequiredError,
  RpcUrlRequiredError,
  UserIdRequiredError,
  StateRequiredError,
  GranterRequiredError,
  InvalidStateError,
  SessionKeyNotFoundError,
} from "../../../lib/xion/backend/types/errors";

// Mock the fetchConfig function
jest.mock("@burnt-labs/constants", () => ({
  fetchConfig: jest.fn().mockResolvedValue({
    dashboardUrl: "https://settings.testnet.burnt.com/",
  }),
  xionGasValues: {
    gasPrice: "0.001uxion",
  },
}));

// Mock the AbstraxionAuth class and SignArbSecp256k1HdWallet
jest.mock("@burnt-labs/abstraxion-core", () => ({
  AbstraxionAuth: jest.fn().mockImplementation(() => ({
    configureAbstraxionInstance: jest.fn(),
    login: jest.fn(),
    getLocalKeypair: jest.fn().mockResolvedValue({
      getAccounts: jest
        .fn()
        .mockResolvedValue([{ address: "xion1testaddress" }]),
    }),
    pollForGrants: jest.fn().mockResolvedValue(true),
  })),
  SignArbSecp256k1HdWallet: {
    generate: jest.fn().mockImplementation(() => {
      const randomId = Math.random().toString(36).substring(7);
      return Promise.resolve({
        address: `xion1testaddress${randomId}`,
        serializedKeypair: `test-serialized-keypair-${randomId}`,
        getAccounts: jest
          .fn()
          .mockResolvedValue([{ address: `xion1testaddress${randomId}` }]),
        serialize: jest
          .fn()
          .mockResolvedValue(`test-serialized-keypair-${randomId}`),
      });
    }),
    deserialize: jest.fn().mockReturnValue({
      getAccounts: jest
        .fn()
        .mockResolvedValue([{ address: "xion1testaddress" }]),
      serialize: jest.fn().mockResolvedValue("test-serialized-keypair"),
    }),
  },
  ContractGrantDescription: {},
  SpendLimit: {},
}));

describe("AbstraxionBackend", () => {
  let backend: AbstraxionBackend;
  let databaseAdapter: TestDatabaseAdapter;
  const testConfig = {
    rpcUrl: "https://rpc.xion-testnet-2.burnt.com",
    dashboardUrl: "https://settings.testnet.burnt.com/",
    redirectUrl: "https://myapp.com/callback",
    treasury: "xion1treasury123",
    encryptionKey: EncryptionService.generateEncryptionKey(),
    sessionKeyExpiryMs: 24 * 60 * 60 * 1000, // 24 hours
    refreshThresholdMs: 60 * 60 * 1000, // 1 hour
    enableAuditLogging: true,
  };

  beforeEach(() => {
    databaseAdapter = new TestDatabaseAdapter();
    backend = new AbstraxionBackend({
      ...testConfig,
      databaseAdapter,
    });
  });

  afterEach(async () => {
    await databaseAdapter.close();
    backend.close();
  });

  describe("constructor", () => {
    it("should create instance with valid configuration", () => {
      expect(backend).toBeDefined();
      expect(backend.sessionKeyManager).toBeDefined();
      expect(backend.gasPriceDefault).toBeDefined();
    });

    it("should throw error for missing encryption key", () => {
      expect(() => {
        new AbstraxionBackend({
          ...testConfig,
          databaseAdapter: databaseAdapter,
          encryptionKey: "",
        });
      }).toThrow(EncryptionKeyRequiredError);
    });

    it("should throw error for missing database adapter", () => {
      expect(() => {
        new AbstraxionBackend({
          ...testConfig,
          databaseAdapter: null as any,
        });
      }).toThrow(DatabaseAdapterRequiredError);
    });

    it("should throw error for missing redirect URL", () => {
      expect(() => {
        new AbstraxionBackend({
          ...testConfig,
          databaseAdapter: databaseAdapter,
          redirectUrl: "",
        });
      }).toThrow(RedirectUrlRequiredError);
    });

    it("should throw error for missing treasury", () => {
      expect(() => {
        new AbstraxionBackend({
          ...testConfig,
          databaseAdapter: databaseAdapter,
          treasury: "",
        });
      }).toThrow(TreasuryRequiredError);
    });

    it("should throw error for missing RPC URL", () => {
      expect(() => {
        new AbstraxionBackend({
          ...testConfig,
          databaseAdapter: databaseAdapter,
          rpcUrl: "",
        });
      }).toThrow(RpcUrlRequiredError);
    });

    it("should set different gas price for mainnet", () => {
      const mainnetBackend = new AbstraxionBackend({
        ...testConfig,
        databaseAdapter: databaseAdapter,
        rpcUrl: "https://rpc.xion-mainnet.burnt.com",
      });
      expect(mainnetBackend.gasPriceDefault).toBeDefined();
      mainnetBackend.close();
    });
  });

  describe("connectInit", () => {
    it("should initiate connection successfully", async () => {
      const userId = "user123";
      const permissions = {
        contracts: ["xion1contract1"],
        bank: [{ denom: "uxion", amount: "1000000" }],
        stake: true,
      };

      const result = await backend.connectInit(userId, permissions);

      expect(result).toBeDefined();
      expect(result.sessionKeyAddress).toBeDefined();
      expect(result.authorizationUrl).toBeDefined();
      expect(result.state).toBeDefined();
      expect(result.authorizationUrl).toContain("grantee=");
      expect(result.authorizationUrl).toContain("redirect_uri=");
      expect(result.authorizationUrl).toContain("treasury=");
      expect(result.authorizationUrl).toContain("state=");
    });

    it("should include permissions in authorization URL", async () => {
      const userId = "user123";
      const permissions = {
        contracts: ["xion1contract1", "xion1contract2"],
        bank: [{ denom: "uxion", amount: "1000000" }],
        stake: true,
      };

      const result = await backend.connectInit(userId, permissions);

      expect(result.authorizationUrl).toContain("contracts=");
      expect(result.authorizationUrl).toContain("bank=");
      expect(result.authorizationUrl).toContain("stake=true");
    });

    it("should handle empty permissions", async () => {
      const userId = "user123";
      const result = await backend.connectInit(userId);

      expect(result).toBeDefined();
      expect(result.authorizationUrl).toContain("treasury=");
      // Empty arrays are still included in URL as "contracts=[]" and "bank=[]"
      expect(result.authorizationUrl).toContain("contracts=%5B%5D");
      expect(result.authorizationUrl).toContain("bank=%5B%5D");
      expect(result.authorizationUrl).not.toContain("stake=");
    });

    it("should throw error for empty userId", async () => {
      await expect(backend.connectInit("")).rejects.toThrow(
        UserIdRequiredError,
      );
    });

    it("should store state in cache", async () => {
      const userId = "user123";
      const permissions = { contracts: ["xion1contract1"] };

      await backend.connectInit(userId, permissions);

      const stats = backend.getCacheStats();
      expect(stats.keys).toBe(1);
    });

    it("should create pending session key", async () => {
      const userId = "user123";
      await backend.connectInit(userId);

      const sessionKeyInfo =
        await backend.sessionKeyManager.getLastSessionKeyInfo(userId);
      expect(sessionKeyInfo).toBeDefined();
      expect(sessionKeyInfo!.sessionState).toBe(SessionState.PENDING);
    });

    it("should handle grantedRedirectUrl parameter", async () => {
      const userId = "user123";
      const grantedRedirectUrl = "https://custom-redirect.com/callback";

      const result = await backend.connectInit(userId, {}, grantedRedirectUrl);

      expect(result).toBeDefined();
      // The grantedRedirectUrl should be stored in state cache
      const stats = backend.getCacheStats();
      expect(stats.keys).toBe(1);
    });
  });

  describe("handleCallback", () => {
    let userId: string;
    let state: string;
    let sessionKeyAddress: string;

    beforeEach(async () => {
      userId = "user123";
      const result = await backend.connectInit(userId);
      state = result.state;
      sessionKeyAddress = result.sessionKeyAddress;
    });

    it("should handle successful callback", async () => {
      const callbackRequest = {
        granted: true,
        granter: "xion1granter123",
        state,
      };

      const result = await backend.handleCallback(callbackRequest);

      expect(result.success).toBe(true);
      expect(result.sessionKeyAddress).toBe(sessionKeyAddress);
      expect(result.metaAccountAddress).toBe("xion1granter123");
      expect(result.permissions).toBeDefined();
    });

    it("should handle denied callback", async () => {
      const callbackRequest = {
        granted: false,
        granter: "xion1granter123",
        state,
      };

      const result = await backend.handleCallback(callbackRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Authorization was not granted by user");
    });

    it("should throw error for missing state", async () => {
      const callbackRequest = {
        granted: true,
        granter: "xion1granter123",
        state: "",
      };

      await expect(backend.handleCallback(callbackRequest)).rejects.toThrow(
        StateRequiredError,
      );
    });

    it("should throw error for missing granter", async () => {
      const callbackRequest = {
        granted: true,
        granter: "",
        state,
      };

      await expect(backend.handleCallback(callbackRequest)).rejects.toThrow(
        GranterRequiredError,
      );
    });

    it("should throw error for invalid state", async () => {
      const callbackRequest = {
        granted: true,
        granter: "xion1granter123",
        state: "invalid-state",
      };

      const result = await backend.handleCallback(callbackRequest);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid state parameter");
    });

    it("should clean up state after successful callback", async () => {
      const callbackRequest = {
        granted: true,
        granter: "xion1granter123",
        state,
      };

      await backend.handleCallback(callbackRequest);

      const stats = backend.getCacheStats();
      expect(stats.keys).toBe(0);
    });

    it("should clean up state after denied callback", async () => {
      const callbackRequest = {
        granted: false,
        granter: "xion1granter123",
        state,
      };

      await backend.handleCallback(callbackRequest);

      const stats = backend.getCacheStats();
      expect(stats.keys).toBe(0);
    });

    it("should activate session key after successful callback", async () => {
      const callbackRequest = {
        granted: true,
        granter: "xion1granter123",
        state,
      };

      await backend.handleCallback(callbackRequest);

      const sessionKeyInfo =
        await backend.sessionKeyManager.getLastSessionKeyInfo(userId);
      expect(sessionKeyInfo).toBeDefined();
      expect(sessionKeyInfo!.sessionState).toBe(SessionState.ACTIVE);
      expect(sessionKeyInfo!.metaAccountAddress).toBe("xion1granter123");
    });

    it("should handle callback with custom permissions", async () => {
      const permissions = {
        contracts: ["xion1contract1"],
        bank: [{ denom: "uxion", amount: "1000000" }],
        stake: true,
      };

      // Recreate with permissions
      await backend.connectInit(userId, permissions);
      const newState = (await backend.connectInit(userId, permissions)).state;

      const callbackRequest = {
        granted: true,
        granter: "xion1granter123",
        state: newState,
      };

      const result = await backend.handleCallback(callbackRequest);

      expect(result.success).toBe(true);
      expect(result.permissions).toEqual({
        ...permissions,
        treasury: testConfig.treasury,
      });
    });

    it("should handle expired state", async () => {
      // Wait for state to expire (10 minutes TTL)
      // For testing, we'll manually clear the cache
      backend.clearCache();

      const callbackRequest = {
        granted: true,
        granter: "xion1granter123",
        state,
      };

      const result = await backend.handleCallback(callbackRequest);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid state parameter");
    });
  });

  describe("disconnect", () => {
    it("should disconnect successfully", async () => {
      const userId = "user123";

      // Create and activate a session key
      const initResult = await backend.connectInit(userId);
      await backend.handleCallback({
        granted: true,
        granter: "xion1granter123",
        state: initResult.state,
      });

      const result = await backend.disconnect(userId);

      expect(result.success).toBe(true);
    });

    it("should handle disconnect when no session key exists", async () => {
      const userId = "user123";
      const result = await backend.disconnect(userId);

      expect(result.success).toBe(true);
    });

    it("should throw error for empty userId", async () => {
      await expect(backend.disconnect("")).rejects.toThrow(UserIdRequiredError);
    });

    it("should revoke session key on disconnect", async () => {
      const userId = "user123";

      // Create and activate a session key
      const initResult = await backend.connectInit(userId);
      await backend.handleCallback({
        granted: true,
        granter: "xion1granter123",
        state: initResult.state,
      });

      await backend.disconnect(userId);

      const sessionKeyInfo =
        await backend.sessionKeyManager.getLastSessionKeyInfo(userId);
      expect(sessionKeyInfo).toBeDefined();
      expect(sessionKeyInfo!.sessionState).toBe(SessionState.REVOKED);
    });
  });

  describe("checkStatus", () => {
    it("should return not connected when no session key exists", async () => {
      const userId = "user123";
      const result = await backend.checkStatus(userId);

      expect(result.connected).toBe(false);
    });

    it("should return not connected when session key is invalid", async () => {
      const userId = "user123";

      // Create a pending session key (not active)
      await backend.connectInit(userId);

      const result = await backend.checkStatus(userId);

      expect(result.connected).toBe(false);
    });

    it("should return connected when session key is active", async () => {
      const userId = "user123";

      // Create and activate a session key
      const initResult = await backend.connectInit(userId);
      await backend.handleCallback({
        granted: true,
        granter: "xion1granter123",
        state: initResult.state,
      });

      const result = await backend.checkStatus(userId);

      expect(result.connected).toBe(true);
      expect(result.sessionKeyAddress).toBeDefined();
      expect(result.metaAccountAddress).toBe("xion1granter123");
      expect(result.permissions).toBeDefined();
      expect(result.expiresAt).toBeDefined();
      expect(result.state).toBe(SessionState.ACTIVE);
    });

    it("should throw error for empty userId", async () => {
      await expect(backend.checkStatus("")).rejects.toThrow(
        UserIdRequiredError,
      );
    });

    it("should handle errors gracefully", async () => {
      const userId = "user123";

      // Mock database error
      const mockError = new Error("Database error");
      jest
        .spyOn(databaseAdapter, "getLastSessionKey")
        .mockRejectedValue(mockError);

      const result = await backend.checkStatus(userId);

      expect(result.connected).toBe(false);
    });
  });

  describe("refreshSessionKey", () => {
    it("should refresh session key when near expiry", async () => {
      const userId = "user123";

      // Create and activate a session key
      const initResult = await backend.connectInit(userId);
      await backend.handleCallback({
        granted: true,
        granter: "xion1granter123",
        state: initResult.state,
      });

      // Mock near expiry time
      const sessionKeyInfo =
        await backend.sessionKeyManager.getLastSessionKeyInfo(userId);
      if (sessionKeyInfo) {
        // Set expiry to 30 minutes from now (within refresh threshold)
        const nearExpiryTime = new Date(Date.now() + 30 * 60 * 1000);
        await databaseAdapter.updateSessionKeyWithParams(
          userId,
          sessionKeyInfo.sessionKeyAddress,
          { sessionState: SessionState.ACTIVE },
        );
      }

      const result = await backend.refreshSessionKey(userId);

      expect(result).toBeDefined();
      expect(result!.address).toBeDefined();
    });

    it("should not refresh session key when not near expiry", async () => {
      const userId = "user123";

      // Create and activate a session key
      const initResult = await backend.connectInit(userId);
      await backend.handleCallback({
        granted: true,
        granter: "xion1granter123",
        state: initResult.state,
      });

      const result = await backend.refreshSessionKey(userId);

      expect(result).toBeDefined();
      expect(result!.address).toBeDefined();
    });

    it("should throw error for empty userId", async () => {
      await expect(backend.refreshSessionKey("")).rejects.toThrow(
        UserIdRequiredError,
      );
    });

    it("should return null when no session key exists", async () => {
      const userId = "user123";
      const result = await backend.refreshSessionKey(userId);

      expect(result).toBeNull();
    });
  });

  describe("startAbstraxionBackendAuth", () => {
    it("should start authentication with active session key", async () => {
      const userId = "user123";

      // Create and activate a session key
      const initResult = await backend.connectInit(userId);
      await backend.handleCallback({
        granted: true,
        granter: "xion1granter123",
        state: initResult.state,
      });

      const mockRequest = {
        url: "/test",
        headers: { host: "example.com" },
      } as unknown as IncomingMessage;

      const authz = await backend.startAbstraxionBackendAuth(
        userId,
        mockRequest,
      );

      expect(authz).toBeDefined();
      expect(authz.configureAbstraxionInstance).toBeDefined();
    });

    it("should throw error when no active session key exists", async () => {
      const userId = "user123";

      // Create only a pending session key
      await backend.connectInit(userId);

      await expect(backend.startAbstraxionBackendAuth(userId)).rejects.toThrow(
        SessionKeyNotFoundError,
      );
    });

    it("should work without request parameter", async () => {
      const userId = "user123";

      // Create and activate a session key
      const initResult = await backend.connectInit(userId);
      await backend.handleCallback({
        granted: true,
        granter: "xion1granter123",
        state: initResult.state,
      });

      const authz = await backend.startAbstraxionBackendAuth(userId);

      expect(authz).toBeDefined();
    });

    it("should pass options to AbstraxionAuth", async () => {
      const userId = "user123";

      // Create and activate a session key
      const initResult = await backend.connectInit(userId);
      await backend.handleCallback({
        granted: true,
        granter: "xion1granter123",
        state: initResult.state,
      });

      const options = {
        contracts: [
          {
            address: "xion1contract1",
            amounts: [{ denom: "uxion", amount: "1000000" }],
          },
        ],
        bank: [{ denom: "uxion", amount: "1000000" }],
        stake: true,
        indexerUrl: "https://indexer.xion.burnt.com",
        onRedirectMethod: jest.fn(),
      };

      const authz = await backend.startAbstraxionBackendAuth(
        userId,
        undefined,
        options,
      );

      expect(authz).toBeDefined();
      expect(authz.configureAbstraxionInstance).toHaveBeenCalledWith(
        testConfig.rpcUrl,
        options.contracts,
        options.stake,
        options.bank,
        testConfig.redirectUrl,
        testConfig.treasury,
        options.indexerUrl,
      );
    });
  });

  describe("cache management", () => {
    it("should provide cache statistics", () => {
      const stats = backend.getCacheStats();

      expect(stats).toBeDefined();
      expect(stats.keys).toBeDefined();
      expect(stats.hits).toBeDefined();
      expect(stats.misses).toBeDefined();
      expect(stats.ksize).toBeDefined();
      expect(stats.vsize).toBeDefined();
    });

    it("should clear cache", () => {
      backend.clearCache();

      const stats = backend.getCacheStats();
      expect(stats.keys).toBe(0);
    });

    it("should close cache on close", () => {
      const closeSpy = jest.spyOn(backend["_stateStore"], "close");

      backend.close();

      expect(closeSpy).toHaveBeenCalled();
    });
  });

  describe("buildAuthorizationUrl", () => {
    it("should build URL with all required parameters", async () => {
      const sessionKeyAddress = "xion1testaddress";
      const state = "test-state";
      const permissions = {
        contracts: ["xion1contract1"],
        bank: [{ denom: "uxion", amount: "1000000" }],
        stake: true,
      };

      const url = await (backend as any).buildAuthorizationUrl(
        sessionKeyAddress,
        state,
        permissions,
      );

      expect(url).toContain("state=test-state");
      expect(url).toContain("grantee=xion1testaddress");
      expect(url).toContain("redirect_uri=");
      expect(url).toContain("treasury=");
      expect(url).toContain("contracts=");
      expect(url).toContain("bank=");
      expect(url).toContain("stake=true");
    });

    it("should build URL without optional parameters", async () => {
      const sessionKeyAddress = "xion1testaddress";
      const state = "test-state";

      const url = await (backend as any).buildAuthorizationUrl(
        sessionKeyAddress,
        state,
      );

      expect(url).toContain("state=test-state");
      expect(url).toContain("grantee=xion1testaddress");
      expect(url).toContain("redirect_uri=");
      expect(url).toContain("treasury=");
      expect(url).not.toContain("contracts=");
      expect(url).not.toContain("bank=");
      expect(url).not.toContain("stake=");
    });
  });

  describe("error handling", () => {
    it("should handle unknown errors in connectInit", async () => {
      // Mock sessionKeyManager to throw unknown error
      const mockError = new Error("Unknown error");
      jest
        .spyOn(backend.sessionKeyManager, "generateSessionKeypair")
        .mockRejectedValue(mockError);

      await expect(backend.connectInit("user123")).rejects.toThrow(
        "Failed to initiate connection",
      );
    });

    it("should handle unknown errors in refreshSessionKey", async () => {
      // Mock sessionKeyManager to throw unknown error
      const mockError = new Error("Unknown error");
      jest
        .spyOn(backend.sessionKeyManager, "refreshIfNeeded")
        .mockRejectedValue(mockError);

      await expect(backend.refreshSessionKey("user123")).rejects.toThrow(
        "Failed to refresh session key",
      );
    });

    it("should handle errors in handleCallback gracefully", async () => {
      const callbackRequest = {
        granted: true,
        granter: "xion1granter123",
        userId: "user123",
        state: "invalid-state",
      };

      const result = await backend.handleCallback(callbackRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("integration tests", () => {
    it("should complete full authentication flow", async () => {
      const userId = "user123";
      const permissions = {
        contracts: ["xion1contract1"],
        bank: [{ denom: "uxion", amount: "1000000" }],
        stake: true,
      };

      // 1. Initiate connection
      const initResult = await backend.connectInit(userId, permissions);
      expect(initResult.sessionKeyAddress).toBeDefined();
      expect(initResult.authorizationUrl).toBeDefined();

      // 2. Handle callback
      const callbackResult = await backend.handleCallback({
        granted: true,
        granter: "xion1granter123",
        state: initResult.state,
      });
      expect(callbackResult.success).toBe(true);
      expect(callbackResult.sessionKeyAddress).toBe(
        initResult.sessionKeyAddress,
      );

      // 3. Check status
      const statusResult = await backend.checkStatus(userId);
      expect(statusResult.connected).toBe(true);
      expect(statusResult.sessionKeyAddress).toBe(initResult.sessionKeyAddress);

      // 4. Disconnect
      const disconnectResult = await backend.disconnect(userId);
      expect(disconnectResult.success).toBe(true);

      // 5. Check status after disconnect
      const finalStatusResult = await backend.checkStatus(userId);
      expect(finalStatusResult.connected).toBe(false);
    });

    it("should handle multiple users independently", async () => {
      const user1 = "user1";
      const user2 = "user2";

      // Create sessions for both users
      const init1 = await backend.connectInit(user1);
      const init2 = await backend.connectInit(user2);

      // Activate both sessions
      await backend.handleCallback({
        granted: true,
        granter: "xion1granter1",
        state: init1.state,
      });
      await backend.handleCallback({
        granted: true,
        granter: "xion1granter2",
        state: init2.state,
      });

      // Both should be connected
      const status1 = await backend.checkStatus(user1);
      const status2 = await backend.checkStatus(user2);

      expect(status1.connected).toBe(true);
      expect(status2.connected).toBe(true);
      expect(status1.sessionKeyAddress).not.toBe(status2.sessionKeyAddress);

      // Disconnect one user
      await backend.disconnect(user1);

      // Only user2 should be connected
      const finalStatus1 = await backend.checkStatus(user1);
      const finalStatus2 = await backend.checkStatus(user2);

      expect(finalStatus1.connected).toBe(false);
      expect(finalStatus2.connected).toBe(true);
    });
  });
});
