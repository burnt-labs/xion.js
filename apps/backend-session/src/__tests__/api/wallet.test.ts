import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { NextRequest } from "next/server";
import { POST as connectHandler } from "@/app/api/wallet/connect/route";
import { POST as callbackHandler } from "@/app/api/wallet/callback/route";
import { prisma } from "@/lib/database";
import { SessionState } from "@burnt-labs/abstraxion-backend";

describe("Wallet API", () => {
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
      const sessionKeyManager = (
        await import("@/lib/abstraxion-backend")
      ).getAbstraxionBackend().sessionKeyManager;
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
      const sessionKeyManager = (
        await import("@/lib/abstraxion-backend")
      ).getAbstraxionBackend().sessionKeyManager;
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
