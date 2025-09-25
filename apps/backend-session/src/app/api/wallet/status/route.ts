import { NextRequest } from "next/server";
import { getAbstraxionBackend } from "@/lib/xion/abstraxion-backend";
import { statusSchema } from "@/lib/validation";
import { createWalletApiWrapper } from "@/lib/api-wrapper";
import { ApiContext } from "@/lib/api-middleware";

export const dynamic = "force-dynamic";

export const GET = createWalletApiWrapper(
  async (context: ApiContext & { validatedData: any; user: any }) => {
    const { user } = context;

    // Get AbstraxionBackend instance
    const abstraxionBackend = getAbstraxionBackend();

    // Check status
    const result = await abstraxionBackend.checkStatus(user.id);

    return result;
  },
  {
    schema: statusSchema,
    schemaType: "query",
    rateLimit: "normal",
    allowedMethods: ["GET"],
  },
);
