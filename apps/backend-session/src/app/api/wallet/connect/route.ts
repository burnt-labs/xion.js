import { getAbstraxionBackend } from "@/lib/xion/abstraxion-backend";
import { connectWalletSchema } from "@/lib/validation";
import { createApiWrapper } from "@/lib/api-wrapper";
import { requireAuth } from "@/lib/auth-middleware";

export const dynamic = "force-dynamic";

export const POST = createApiWrapper(
  async (context) => {
    const { validatedData } = context;
    const { permissions, grantedRedirectUrl } = validatedData;

    // Get authenticated user from session
    const authContext = await requireAuth(context.request);
    const { user } = authContext;

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
