import { NextRequest } from "next/server";
import { getAbstraxionBackend } from "@/lib/xion/abstraxion-backend";
import { connectWalletSchema } from "@/lib/validation";
import { createWalletApiWrapper } from "@/lib/api-wrapper";
import { ApiContext } from "@/lib/api-middleware";

export const dynamic = "force-dynamic";

export const POST = createWalletApiWrapper(
  async (context: ApiContext & { validatedData: any; user: any }) => {
    const { validatedData, user } = context;
    const { permissions, grantedRedirectUrl } = validatedData;

    // Get AbstraxionBackend instance
    const abstraxionBackend = getAbstraxionBackend();

    // Initiate wallet connection
    const result = await abstraxionBackend.connectInit(
      user.id,
      permissions,
      grantedRedirectUrl,
    );

    return result;
  },
  {
    schema: connectWalletSchema,
    schemaType: "body",
    rateLimit: "strict",
    allowedMethods: ["POST"],
  },
);
