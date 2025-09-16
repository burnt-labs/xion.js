import { PrismaClient } from "@prisma/client";
import { SecurityManager } from "../src/lib/security";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Create sample users
  const users = await Promise.all([
    prisma.user.upsert({
      where: { username: "alice" },
      update: {},
      create: {
        username: "alice",
        email: "alice@example.com",
      },
    }),
    prisma.user.upsert({
      where: { username: "bob" },
      update: {},
      create: {
        username: "bob",
        email: "bob@example.com",
      },
    }),
    prisma.user.upsert({
      where: { username: "charlie" },
      update: {},
      create: {
        username: "charlie",
        email: "charlie@example.com",
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} users`);

  // Create sample session keys (for testing purposes)
  const now = Date.now();
  const oneDayFromNow = now + 24 * 60 * 60 * 1000;

  const sessionKeys = await Promise.all([
    prisma.sessionKey.upsert({
      where: { userId: users[0].id },
      update: {},
      create: {
        userId: users[0].id,
        sessionKeyAddress: "xion1alice-session-key-address",
        sessionKeyMaterial: await SecurityManager.encrypt(
          "encrypted-private-key-alice",
          process.env.ENCRYPTION_KEY || "test-key",
        ),
        sessionKeyExpiry: oneDayFromNow,
        sessionPermissions: JSON.stringify([
          { type: "contracts", data: "[]" },
          { type: "bank", data: "[]" },
          { type: "stake", data: "false" },
        ]),
        sessionState: "ACTIVE",
        metaAccountAddress: "xion1alice-meta-account",
        createdAt: now,
        updatedAt: now,
      },
    }),
    prisma.sessionKey.upsert({
      where: { userId: users[1].id },
      update: {},
      create: {
        userId: users[1].id,
        sessionKeyAddress: "xion1bob-session-key-address",
        sessionKeyMaterial: await SecurityManager.encrypt(
          "encrypted-private-key-bob",
          process.env.ENCRYPTION_KEY || "test-key",
        ),
        sessionKeyExpiry: oneDayFromNow,
        sessionPermissions: JSON.stringify([
          { type: "contracts", data: '["xion1contract1", "xion1contract2"]' },
          { type: "bank", data: '[{"denom": "uxion", "amount": "1000000"}]' },
          { type: "stake", data: "true" },
        ]),
        sessionState: "ACTIVE",
        metaAccountAddress: "xion1bob-meta-account",
        createdAt: now,
        updatedAt: now,
      },
    }),
  ]);

  console.log(`✅ Created ${sessionKeys.length} session keys`);

  // Create sample audit logs
  const auditLogs = await Promise.all([
    prisma.auditLog.create({
      data: {
        userId: users[0].id,
        action: "SESSION_KEY_CREATED",
        timestamp: now,
        details: JSON.stringify({
          sessionKeyAddress: "xion1alice-session-key-address",
          permissions: ["contracts", "bank", "stake"],
        }),
        ipAddress: "127.0.0.1",
        userAgent: "Mozilla/5.0 (Test Browser)",
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: users[1].id,
        action: "CONNECTION_INITIATED",
        timestamp: now - 60000, // 1 minute ago
        details: JSON.stringify({
          sessionKeyAddress: "xion1bob-session-key-address",
          authorizationUrl:
            "https://dashboard.xion-testnet.burnt.com/authorize",
        }),
        ipAddress: "192.168.1.100",
        userAgent: "Mozilla/5.0 (Test Browser)",
      },
    }),
  ]);

  console.log(`✅ Created ${auditLogs.length} audit logs`);

  console.log("🎉 Database seed completed successfully!");
  console.log("\n📊 Summary:");
  console.log(`- Users: ${users.length}`);
  console.log(`- Session Keys: ${sessionKeys.length}`);
  console.log(`- Audit Logs: ${auditLogs.length}`);
  console.log("\n🔑 Test users:");
  users.forEach((user) => {
    console.log(`  - ${user.username} (${user.email})`);
  });
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
