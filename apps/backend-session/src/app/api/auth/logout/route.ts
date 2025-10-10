import { createStandardApiHandler } from "@/lib/api-wrapper";

export const POST = createStandardApiHandler(
  async () => {
    // NextAuth.js handles logout through its built-in endpoints
    // This endpoint provides a consistent API response
    return {
      success: true,
      message: "Logout successful",
    };
  },
  {
    rateLimit: "normal",
    allowedMethods: ["POST"],
  },
);
