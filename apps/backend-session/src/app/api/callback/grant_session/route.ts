import { getAbstraxionBackend } from "@/lib/xion/abstraxion-backend";
import { grantSessionCallbackSchema } from "@/lib/validation";
import { createApiWrapper, handleRedirectResponse } from "@/lib/api-wrapper";
import { ApiException } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export const GET = createApiWrapper(
  async (context) => {
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
    schema: grantSessionCallbackSchema,
    schemaType: "query",
    rateLimit: "strict",
    allowedMethods: ["GET"],
  },
);
