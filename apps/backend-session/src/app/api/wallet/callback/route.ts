import { NextRequest, NextResponse } from "next/server";
import { getAbstraxionBackend } from "@/lib/xion/abstraxion-backend";
import { callbackSchema } from "@/lib/validation";
import {
  createWalletApiWrapper,
  handleRedirectResponse,
} from "@/lib/api-wrapper";
import { ApiContext } from "@/lib/api-middleware";
import { ApiException } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export const GET = createWalletApiWrapper(
  async (context: ApiContext & { validatedData: any; user: any }) => {
    const { validatedData } = context;
    const { granted, granter, state } = validatedData;

    // Get AbstraxionBackend instance
    const abstraxionBackend = getAbstraxionBackend();

    // Handle callback
    const result = await abstraxionBackend.handleCallback({
      granted,
      granter,
      state,
    });

    if (!result.success) {
      throw new ApiException(
        result.error || "Callback failed",
        400,
        "CALLBACK_FAILED",
      );
    }

    // Use the generic redirect handler
    return handleRedirectResponse(result, result.grantedRedirectUrl);
  },
  {
    schema: callbackSchema,
    schemaType: "query",
    rateLimit: "strict",
    allowedMethods: ["GET"],
  },
);
