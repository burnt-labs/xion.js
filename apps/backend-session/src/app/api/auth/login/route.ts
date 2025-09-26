import { getServerSession } from "next-auth";
import { loginSchema, authOptions } from "@/lib/auth";
import { createStandardApiHandler } from "@/lib/api-wrapper";
import { ApiException } from "@/lib/api-response";

export const POST = createStandardApiHandler(
  async (_context) => {
    // This endpoint is mainly for API-based login
    // The actual authentication is handled by NextAuth.js
    // This endpoint can be used to get session information after login

    const session = await getServerSession(authOptions);

    if (!session) {
      throw new ApiException("Authentication required", 401, "UNAUTHORIZED");
    }

    return {
      message: "Login successful",
      user: session.user,
    };
  },
  {
    schema: loginSchema,
    schemaType: "body",
    rateLimit: "strict",
    allowedMethods: ["POST"],
  },
);
