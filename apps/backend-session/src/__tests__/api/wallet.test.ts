// Ensure we're using the test database
const testDBUrl = "file:./test.db";
process.env.DATABASE_URL = testDBUrl;

import { NextRequest } from "next/server";
import { POST as connectHandler } from "@/app/api/wallet/connect/route";
import { SessionState } from "@burnt-labs/abstraxion-backend";
import { getAbstraxionBackend } from "@/lib/abstraxion-backend";
import { prisma } from "@/lib/database";
import { execSync } from "child_process";

// ensure all environment variables are set
if (!process.env.XION_RPC_URL) {
  process.env.XION_RPC_URL = "https://rpc.xion-testnet.burnt.com";
}
if (!process.env.XION_DASHBOARD_URL) {
  process.env.XION_DASHBOARD_URL = "https://dashboard.xion-testnet.burnt.com";
}
if (!process.env.ENCRYPTION_KEY) {
  process.env.ENCRYPTION_KEY = "your-base64-encoded-aes-256-key-here";
}
if (!process.env.XION_REDIRECT_URL) {
  process.env.XION_REDIRECT_URL = "http://localhost:3000/api/wallet/callback";
}
if (!process.env.XION_TREASURY) {
  process.env.XION_TREASURY = "xion1treasury123...";
}

describe("Wallet API", () => {
  beforeAll(async () => {
    // Setup test database using Prisma commands
    try {
      execSync("npx prisma generate", {
        stdio: "pipe",
        env: { ...process.env, DATABASE_URL: testDBUrl },
      });
      execSync("npx prisma db push --force-reset", {
        stdio: "pipe",
        env: { ...process.env, DATABASE_URL: testDBUrl },
      });
    } catch (error) {
      console.error("Failed to setup test database:", error);
      throw error;
    }
  });

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.sessionKey.deleteMany();
    await prisma.user.deleteMany();
  });

  afterEach(async () => {
    // Clean up after each test
    await prisma.sessionKey.deleteMany();
    await prisma.user.deleteMany();
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
      // First create a user
      const user = await prisma.user.create({
        data: { username: "testuser" },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/wallet/connect",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: "testuser",
            permissions: {
              contracts: ["contract1", "contract2"],
              bank: [{ denom: "uxion", amount: "1000" }],
              stake: true,
            },
          }),
        },
      );

      const response = await connectHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty("sessionKeyAddress");
      expect(data.data).toHaveProperty("authorizationUrl");
      expect(data.data).toHaveProperty("state");
    });
  });

  describe("SessionKeyManager PENDING state functionality", () => {
    it("should create PENDING session key and then update to ACTIVE", async () => {
      // First create a user
      const user = await prisma.user.create({
        data: { username: "testuser" },
      });

      // Get SessionKeyManager instance
      const backend = getAbstraxionBackend();
      const sessionKeyManager = backend.sessionKeyManager;
      const sessionKey = await sessionKeyManager.generateSessionKey();

      // Create pending session key
      await sessionKeyManager.createPendingSessionKey(
        user.id,
        sessionKey,
        "meta-account-address",
      );

      // Verify session key is in PENDING state
      const pendingSessionKey = await prisma.sessionKey.findFirst({
        where: { userId: user.id },
      });
      expect(pendingSessionKey).toBeTruthy();
      expect(pendingSessionKey?.sessionState).toBe(SessionState.PENDING);
      expect(pendingSessionKey?.sessionPermissions).toBe("{}");

      // Now test storeSessionKey with permissions - should update PENDING to ACTIVE
      const permissions = {
        contracts: ["contract1"],
        bank: [{ denom: "uxion", amount: "1000" }],
        stake: true,
      };

      await sessionKeyManager.storeSessionKey(
        user.id,
        sessionKey,
        permissions,
        "meta-account-address",
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

    it("should create new ACTIVE session key when no existing session key", async () => {
      // First create a user
      const user = await prisma.user.create({
        data: { username: "testuser2" },
      });

      // Get SessionKeyManager instance
      const sessionKeyManager = getAbstraxionBackend().sessionKeyManager;
      const sessionKey = await sessionKeyManager.generateSessionKey();

      const permissions = {
        contracts: ["contract2"],
        bank: [{ denom: "uxion", amount: "2000" }],
        stake: false,
      };

      // Store session key directly - should create as ACTIVE
      await sessionKeyManager.storeSessionKey(
        user.id,
        sessionKey,
        permissions,
        "meta-account-address-2",
      );

      // Verify session key is ACTIVE with permissions
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
