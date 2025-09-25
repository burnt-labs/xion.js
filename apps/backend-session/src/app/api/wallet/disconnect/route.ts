import { getAbstraxionBackend } from "@/lib/xion/abstraxion-backend";
import { createApiWrapper } from "@/lib/api-wrapper";
import { requireAuth } from "@/lib/auth-middleware";
import { ApiException } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export const DELETE = createApiWrapper(
  async (context) => {
    // Get authenticated user from session
    const authContext = await requireAuth(context.request);
    const { user } = authContext;

    // Get AbstraxionBackend instance
    const abstraxionBackend = getAbstraxionBackend();

    // Disconnect wallet
    const result = await abstraxionBackend.disconnect(user.id);

    if (!result.success) {
      throw new ApiException(
        result.error || "Disconnect failed",
        400,
        "DISCONNECT_FAILED",
      );
    }

    return result;
  },
  {
    rateLimit: "normal",
    allowedMethods: ["DELETE"],
  },
);
