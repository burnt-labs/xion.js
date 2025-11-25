// Ensure we're using the test database
const testDBUrl = "file:./test.db";
process.env.DATABASE_URL = testDBUrl;

import { PrismaDatabaseAdapter } from "@/lib/xion/database";
import { prisma } from "@/lib/xion/database";
import { execSync } from "child_process";
import { SessionState } from "@/lib/xion/backend";

describe("PrismaDatabaseAdapter", () => {
  let adapter: PrismaDatabaseAdapter;

  beforeAll(async () => {
    // Setup test database using Prisma commands
    try {
      execSync("npx prisma generate", {
        stdio: "pipe",
        env: { ...process.env, DATABASE_URL: testDBUrl },
      });
      execSync("npx prisma db push", {
        stdio: "pipe",
        env: { ...process.env, DATABASE_URL: testDBUrl },
      });
    } catch (error) {
      console.error("Failed to setup test database:", error);
      throw error;
    }

    adapter = new PrismaDatabaseAdapter(prisma);
  });

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.sessionKey.deleteMany();
    await prisma.auditLog.deleteMany();
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

  describe("getSessionKey", () => {
    it("should retrieve session key by unique sessionKeyAddress and verify userId", async () => {
      // Create a user
      const user = await prisma.user.create({
        data: {
          username: `testuser-${Date.now()}-${Math.random()}`,
          password: "hashedpassword",
        },
      });

      // Create a session key
      const sessionKeyAddress = `xion1test-${Date.now()}-${Math.random()}`;
      await prisma.sessionKey.create({
        data: {
          user: { connect: { id: user.id } },
          sessionKeyAddress,
          sessionKeyMaterial: "encrypted-material",
          sessionKeyExpiry: new Date(Date.now() + 86400000),
          sessionPermissions: "{}",
          sessionState: SessionState.ACTIVE,
          metaAccountAddress: "xion1meta123",
        },
      });

      // Retrieve session key
      const result = await adapter.getSessionKey(user.id, sessionKeyAddress);

      expect(result).not.toBeNull();
      expect(result?.sessionKeyAddress).toBe(sessionKeyAddress);
      expect(result?.userId).toBe(user.id);
    });

    it("should return null when session key does not exist", async () => {
      const user = await prisma.user.create({
        data: {
          username: `testuser-${Date.now()}-${Math.random()}`,
          password: "hashedpassword",
        },
      });

      const result = await adapter.getSessionKey(
        user.id,
        "nonexistent-address",
      );

      expect(result).toBeNull();
    });

    it("should return null when session key belongs to different user", async () => {
      // Create two users
      const user1 = await prisma.user.create({
        data: {
          username: "user1",
          password: "hashedpassword",
        },
      });

      const user2 = await prisma.user.create({
        data: {
          username: "user2",
          password: "hashedpassword",
        },
      });

      // Create session key for user1
      const sessionKeyAddress = `xion1test-${Date.now()}-${Math.random()}`;
      await prisma.sessionKey.create({
        data: {
          user: { connect: { id: user1.id } },
          sessionKeyAddress,
          sessionKeyMaterial: "encrypted-material",
          sessionKeyExpiry: new Date(Date.now() + 86400000),
          sessionPermissions: "{}",
          sessionState: SessionState.ACTIVE,
          metaAccountAddress: "xion1meta123",
        },
      });

      // Try to retrieve with user2's id (should return null due to userId mismatch)
      const result = await adapter.getSessionKey(user2.id, sessionKeyAddress);

      expect(result).toBeNull();
    });
  });

  describe("revokeSessionKey", () => {
    it("should revoke session key by unique sessionKeyAddress and verify userId", async () => {
      const user = await prisma.user.create({
        data: {
          username: `testuser-${Date.now()}-${Math.random()}`,
          password: "hashedpassword",
        },
      });

      const sessionKeyAddress = `xion1test-${Date.now()}-${Math.random()}`;
      await prisma.sessionKey.create({
        data: {
          user: { connect: { id: user.id } },
          sessionKeyAddress,
          sessionKeyMaterial: "encrypted-material",
          sessionKeyExpiry: new Date(Date.now() + 86400000),
          sessionPermissions: "{}",
          sessionState: SessionState.ACTIVE,
          metaAccountAddress: "xion1meta123",
        },
      });

      const result = await adapter.revokeSessionKey(user.id, sessionKeyAddress);

      expect(result).toBe(true);

      // Verify the session key was revoked
      const sessionKey = await prisma.sessionKey.findUnique({
        where: { sessionKeyAddress },
      });
      expect(sessionKey?.sessionState).toBe(SessionState.REVOKED);
    });

    it("should return false when session key does not exist", async () => {
      const user = await prisma.user.create({
        data: {
          username: `testuser-${Date.now()}-${Math.random()}`,
          password: "hashedpassword",
        },
      });

      const result = await adapter.revokeSessionKey(
        user.id,
        "nonexistent-address",
      );

      expect(result).toBe(false);
    });

    it("should return false when session key belongs to different user", async () => {
      const user1 = await prisma.user.create({
        data: {
          username: "user1",
          password: "hashedpassword",
        },
      });

      const user2 = await prisma.user.create({
        data: {
          username: "user2",
          password: "hashedpassword",
        },
      });

      const sessionKeyAddress = `xion1test-${Date.now()}-${Math.random()}`;
      await prisma.sessionKey.create({
        data: {
          user: { connect: { id: user1.id } },
          sessionKeyAddress,
          sessionKeyMaterial: "encrypted-material",
          sessionKeyExpiry: new Date(Date.now() + 86400000),
          sessionPermissions: "{}",
          sessionState: SessionState.ACTIVE,
          metaAccountAddress: "xion1meta123",
        },
      });

      const result = await adapter.revokeSessionKey(
        user2.id,
        sessionKeyAddress,
      );

      expect(result).toBe(false);

      // Verify the session key was NOT revoked
      const sessionKey = await prisma.sessionKey.findUnique({
        where: { sessionKeyAddress },
      });
      expect(sessionKey?.sessionState).toBe(SessionState.ACTIVE);
    });
  });

  describe("updateSessionKeyWithParams", () => {
    it("should update session key by unique sessionKeyAddress and verify userId", async () => {
      const user = await prisma.user.create({
        data: {
          username: `testuser-${Date.now()}-${Math.random()}`,
          password: "hashedpassword",
        },
      });

      const sessionKeyAddress = `xion1test-${Date.now()}-${Math.random()}`;
      await prisma.sessionKey.create({
        data: {
          user: { connect: { id: user.id } },
          sessionKeyAddress,
          sessionKeyMaterial: "encrypted-material",
          sessionKeyExpiry: new Date(Date.now() + 86400000),
          sessionPermissions: "{}",
          sessionState: SessionState.PENDING,
          metaAccountAddress: "xion1meta123",
        },
      });

      await adapter.updateSessionKeyWithParams(user.id, sessionKeyAddress, {
        sessionState: SessionState.ACTIVE,
        sessionPermissions: { send: true },
      });

      // Verify the session key was updated
      const sessionKey = await prisma.sessionKey.findUnique({
        where: { sessionKeyAddress },
      });
      expect(sessionKey?.sessionState).toBe(SessionState.ACTIVE);
      expect(JSON.parse(sessionKey?.sessionPermissions || "{}")).toEqual({
        send: true,
      });
    });

    it("should throw error when session key does not exist", async () => {
      const user = await prisma.user.create({
        data: {
          username: `testuser-${Date.now()}-${Math.random()}`,
          password: "hashedpassword",
        },
      });

      await expect(
        adapter.updateSessionKeyWithParams(user.id, "nonexistent-address", {
          sessionState: SessionState.ACTIVE,
        }),
      ).rejects.toThrow();
    });

    it("should throw error when session key belongs to different user", async () => {
      const user1 = await prisma.user.create({
        data: {
          username: "user1",
          password: "hashedpassword",
        },
      });

      const user2 = await prisma.user.create({
        data: {
          username: "user2",
          password: "hashedpassword",
        },
      });

      const sessionKeyAddress = `xion1test-${Date.now()}-${Math.random()}`;
      await prisma.sessionKey.create({
        data: {
          user: { connect: { id: user1.id } },
          sessionKeyAddress,
          sessionKeyMaterial: "encrypted-material",
          sessionKeyExpiry: new Date(Date.now() + 86400000),
          sessionPermissions: "{}",
          sessionState: SessionState.PENDING,
          metaAccountAddress: "xion1meta123",
        },
      });

      await expect(
        adapter.updateSessionKeyWithParams(user2.id, sessionKeyAddress, {
          sessionState: SessionState.ACTIVE,
        }),
      ).rejects.toThrow();

      // Verify the session key was NOT updated
      const sessionKey = await prisma.sessionKey.findUnique({
        where: { sessionKeyAddress },
      });
      expect(sessionKey?.sessionState).toBe(SessionState.PENDING);
    });
  });
});
