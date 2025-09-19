import { NextRequest } from "next/server";
import { getAbstraxionBackend } from "@/lib/abstraxion-backend";
import { disconnectSchema } from "@/lib/validation";
import { createWalletApiWrapper } from "@/lib/api-wrapper";
import { ApiContext } from "@/lib/api-middleware";
import { ApiException } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export const DELETE = createWalletApiWrapper(
  async (context: ApiContext & { validatedData: any; user: any }) => {
    const { user } = context;

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
    schema: disconnectSchema,
    schemaType: "body",
    rateLimit: "normal",
    allowedMethods: ["DELETE"],
  },
);
