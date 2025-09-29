import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Hash passwords for test users
  const hashedPassword = await bcrypt.hash("password123", 12);

  // Create sample users
  const users = await Promise.all([
    prisma.user.upsert({
      where: { username: "alice" },
      update: {},
      create: {
        username: "alice",
        email: "alice@example.com",
        password: hashedPassword,
      },
    }),
    prisma.user.upsert({
      where: { username: "bob" },
      update: {},
      create: {
        username: "bob",
        email: "bob@example.com",
        password: hashedPassword,
      },
    }),
    prisma.user.upsert({
      where: { username: "charlie" },
      update: {},
      create: {
        username: "charlie",
        email: "charlie@example.com",
        password: hashedPassword,
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
