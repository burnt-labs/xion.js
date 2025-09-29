import { getAbstraxionBackend } from "@/lib/xion/abstraxion-backend";
import { createApiWrapper } from "@/lib/api-wrapper";
import { requireAuth } from "@/lib/auth-middleware";

export const dynamic = "force-dynamic";

export const GET = createApiWrapper(
  async (context) => {
    // Get authenticated user from session
    const authContext = await requireAuth(context.request);
    const { user } = authContext;

    // Get AbstraxionBackend instance
    const abstraxionBackend = getAbstraxionBackend();

    // Check status
    const result = await abstraxionBackend.checkStatus(user.id);

    return result;
  },
  {
    rateLimit: "normal",
    allowedMethods: ["GET"],
  },
);
