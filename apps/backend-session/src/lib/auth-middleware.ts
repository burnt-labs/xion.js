import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ApiException } from "@/lib/api-response";

export interface AuthenticatedContext {
  user: {
    id: string;
    username: string;
    email?: string;
  };
}

/**
 * Middleware to require authentication for API routes
 */
export async function requireAuth(
  request: NextRequest,
): Promise<AuthenticatedContext> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new ApiException("Authentication required", 401, "UNAUTHORIZED");
  }

  if (!session.user.id || !session.user.username) {
    throw new ApiException("Invalid session data", 401, "INVALID_SESSION");
  }

  return {
    user: {
      id: session.user.id,
      username: session.user.username,
      email: session.user.email || undefined,
    },
  };
}

/**
 * Higher-order function to wrap API handlers with authentication
 */
export function withAuth<T = any>(
  handler: (
    context: AuthenticatedContext & { validatedData?: any },
  ) => Promise<T>,
) {
  return async (request: NextRequest, validatedData?: any) => {
    const authContext = await requireAuth(request);
    return await handler({ ...authContext, validatedData });
  };
}
