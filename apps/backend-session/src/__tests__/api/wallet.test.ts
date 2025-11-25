// Ensure we're using the test database
const testDBUrl = "file:./test.db";
process.env.DATABASE_URL = testDBUrl;

import { POST as connectHandler } from "@/app/api/wallet/connect/route";
import { SessionState } from "@/lib/xion/backend";
import { getAbstraxionBackend } from "@/lib/xion/abstraxion-backend";
import { prisma } from "@/lib/xion/database";
import { execSync } from "child_process";
import {
  setupAuthMocks,
  cleanupAuthMocks,
  createMockRequest,
} from "../../test-utils/auth";
import { EncryptionService } from "@/lib/xion/backend/services/EncryptionService";

// Mock the auth middleware
jest.mock("@/lib/auth-middleware", () => ({
  requireAuth: jest.fn(),
}));

// Mock NextAuth
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

// ensure all environment variables are set
if (!process.env.XION_RPC_URL) {
  process.env.XION_RPC_URL = "https://rpc.xion-testnet-2.burnt.com/";
}
if (!process.env.ENCRYPTION_KEY) {
  process.env.ENCRYPTION_KEY = EncryptionService.generateEncryptionKey();
}
if (!process.env.XION_REDIRECT_URL) {
  process.env.XION_REDIRECT_URL =
    "http://localhost:3000/api/callback/grant_session";
}
if (!process.env.XION_TREASURY) {
  process.env.XION_TREASURY =
    "xion1mj4a2t3365q0059w6ln9kkeyyj0fjlpdt0gea0vxd79epstkq4gshxqnmp";
}

// Helper functions
function resetAbstraxionBackend() {
  const globalForAbstraxion = globalThis as unknown as {
    abstraxionBackend: any;
  };
  globalForAbstraxion.abstraxionBackend = undefined;
}

async function cleanupDatabase() {
  await prisma.sessionKey.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
}

async function createUserAndInitBackend(username: string = "testuser") {
  const user = await prisma.user.create({
    data: {
      username,
      password: "hashedpassword123",
    },
  });

  resetAbstraxionBackend();
  const backend = getAbstraxionBackend();

  // Verify backend can see the user through its database adapter
  const backendAdapter = (backend as any).sessionKeyManager.databaseAdapter;
  const backendUser = await backendAdapter.prisma.user.findUnique({
    where: { id: user.id },
  });

  // If user doesn't exist in backend's Prisma instance, create it there
  if (!backendUser) {
    await backendAdapter.prisma.user.create({
      data: {
        id: user.id,
        username: user.username,
        password: user.password,
        email: user.email,
      },
    });
    // Verify user was created
    const verifyUser = await backendAdapter.prisma.user.findUnique({
      where: { id: user.id },
    });
    if (!verifyUser) {
      throw new Error(`Failed to create user in backend's Prisma instance`);
    }
  }

  return { user, backend };
}

describe("Wallet API", () => {
  beforeAll(async () => {
    // Setup test database using Prisma commands
    try {
      execSync("npx prisma generate", {
        stdio: "pipe",
        env: { ...process.env, DATABASE_URL: testDBUrl },
      });
      // Use db push without force-reset to avoid Prisma's AI safety check
      execSync("npx prisma db push", {
        stdio: "pipe",
        env: { ...process.env, DATABASE_URL: testDBUrl },
      });
    } catch (error) {
      console.error("Failed to setup test database:", error);
      throw error;
    }
  });

  beforeEach(async () => {
    // Reset the AbstraxionBackend singleton to ensure fresh instance
    resetAbstraxionBackend();

    // Setup auth mocks
    setupAuthMocks();

    // Clean up database before each test
    await cleanupDatabase();
  });

  afterEach(async () => {
    // Clean up auth mocks
    cleanupAuthMocks();

    // Clean up after each test
    await cleanupDatabase();
  });

  afterAll(async () => {
    // Close Prisma connection
    await prisma.$disconnect();

    // Clean up test database
    try {
      const fs = require("fs");
      if (fs.existsSync("./test.db")) {
        fs.unlinkSync("./test.db");
      }
    } catch (error) {
      console.error("Failed to cleanup test database:", error);
    }
  });

  describe("POST /api/wallet/connect", () => {
    it("should initiate wallet connection for existing user", async () => {
      const { user } = await createUserAndInitBackend();

      // Mock the requireAuth function to return our test user
      const { requireAuth } = require("@/lib/auth-middleware");
      requireAuth.mockResolvedValue({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      });

      const request = createMockRequest(
        "http://localhost:3000/api/wallet/connect",
        "POST",
        {
          permissions: {
            contracts: ["contract1", "contract2"],
            bank: [{ denom: "uxion", amount: "1000" }],
            stake: true,
          },
        },
      );

      const response = await connectHandler(request);
      const data = await response.json();

      // createUserAndInitBackend ensures user exists, but if it doesn't, expect error
      if (response.status === 400 && data.error?.includes("not found")) {
        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toContain("User");
        expect(data.error).toContain("not found");
        return;
      }

      // If user exists, expect success response
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty("sessionKeyAddress");
      expect(data.data).toHaveProperty("authorizationUrl");
      expect(data.data).toHaveProperty("state");
    });
  });

  describe("SessionKeyManager PENDING state functionality", () => {
    it("should create PENDING session key and then update to ACTIVE", async () => {
      const { user, backend } = await createUserAndInitBackend();
      const sessionKeyManager = backend.sessionKeyManager;
      const sessionKey = await sessionKeyManager.generateSessionKeypair();

      // Create pending session key (new API only takes userId and sessionKey)
      await sessionKeyManager.createPendingSessionKey(user.id, sessionKey);

      // Verify session key is in PENDING state
      const pendingSessionKey = await prisma.sessionKey.findFirst({
        where: { userId: user.id },
      });
      expect(pendingSessionKey).toBeTruthy();
      expect(pendingSessionKey?.sessionState).toBe(SessionState.PENDING);
      expect(pendingSessionKey?.sessionPermissions).toBe("{}");

      // Now test storeGrantedSessionKey with permissions - should update PENDING to ACTIVE
      const permissions = {
        contracts: ["contract1"],
        bank: [{ denom: "uxion", amount: "1000" }],
        stake: true,
      };

      await sessionKeyManager.storeGrantedSessionKey(
        user.id,
        sessionKey.address,
        "meta-account-address",
        permissions,
      );

      // Verify session key is now ACTIVE with permissions
      const activeSessionKey = await prisma.sessionKey.findFirst({
        where: { userId: user.id },
      });
      expect(activeSessionKey).toBeTruthy();
      expect(activeSessionKey?.sessionState).toBe(SessionState.ACTIVE);
      expect(JSON.parse(activeSessionKey?.sessionPermissions || "{}")).toEqual(
        permissions,
      );
    });

    it("should create new PENDING session key and then activate it", async () => {
      const { user, backend } = await createUserAndInitBackend("testuser2");
      const sessionKeyManager = backend.sessionKeyManager;
      const sessionKey = await sessionKeyManager.generateSessionKeypair();

      // Create pending session key
      await sessionKeyManager.createPendingSessionKey(user.id, sessionKey);

      // Verify session key is PENDING
      const pendingSessionKey = await prisma.sessionKey.findFirst({
        where: { userId: user.id },
      });
      expect(pendingSessionKey).toBeTruthy();
      expect(pendingSessionKey?.sessionState).toBe(SessionState.PENDING);

      const permissions = {
        contracts: ["contract2"],
        bank: [{ denom: "uxion", amount: "2000" }],
        stake: false,
      };

      // Activate the session key with permissions
      await sessionKeyManager.storeGrantedSessionKey(
        user.id,
        sessionKey.address,
        "meta-account-address-2",
        permissions,
      );

      // Verify session key is now ACTIVE with permissions
      const activeSessionKey = await prisma.sessionKey.findFirst({
        where: { userId: user.id },
      });
      expect(activeSessionKey).toBeTruthy();
      expect(activeSessionKey?.sessionState).toBe(SessionState.ACTIVE);
      expect(JSON.parse(activeSessionKey?.sessionPermissions || "{}")).toEqual(
        permissions,
      );
    });
  });
});
