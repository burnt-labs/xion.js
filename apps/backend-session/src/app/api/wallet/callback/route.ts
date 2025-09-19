import { NextRequest } from "next/server";
import { getAbstraxionBackend } from "@/lib/abstraxion-backend";
import { callbackSchema } from "@/lib/validation";
import { createWalletApiWrapper } from "@/lib/api-wrapper";
import { ApiContext } from "@/lib/api-middleware";
import { ApiException } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export const POST = createWalletApiWrapper(
  async (context: ApiContext & { validatedData: any; user: any }) => {
    const { validatedData, user } = context;
    const { granted, granter, state } = validatedData;

    // Get AbstraxionBackend instance
    const abstraxionBackend = getAbstraxionBackend();

    // Handle callback
    const result = await abstraxionBackend.handleCallback({
      granted,
      granter,
      state,
      userId: user.id,
    });

    if (!result.success) {
      throw new ApiException(
        result.error || "Callback failed",
        400,
        "CALLBACK_FAILED",
      );
    }

    return result;
  },
  {
    schema: callbackSchema,
    schemaType: "body",
    rateLimit: "strict",
    allowedMethods: ["POST"],
  },
);
