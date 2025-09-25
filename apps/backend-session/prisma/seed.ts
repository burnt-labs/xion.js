import { PrismaClient } from "@prisma/client";

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

  console.log("🎉 Database seed completed successfully!");
  console.log("\n📊 Summary:");
  console.log(`- Users: ${users.length}`);
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
