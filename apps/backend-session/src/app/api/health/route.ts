import { prisma } from "@/lib/xion/database";
import { createHealthApiWrapper } from "@/lib/api-wrapper";
import type { ApiContext } from "@/lib/api-middleware";

export const dynamic = "force-dynamic";

export const GET = createHealthApiWrapper(
  async (_context: ApiContext) => {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    return {
      status: "healthy",
      database: "connected",
    };
  },
  {
    allowedMethods: ["GET"],
  },
);
