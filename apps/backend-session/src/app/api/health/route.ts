import { NextRequest } from "next/server";
import { prisma } from "@/lib/xion/database";
import { createHealthApiWrapper } from "@/lib/api-wrapper";
import { ApiContext } from "@/lib/api-middleware";

export const dynamic = "force-dynamic";

export const GET = createHealthApiWrapper(
  async (context: ApiContext) => {
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
