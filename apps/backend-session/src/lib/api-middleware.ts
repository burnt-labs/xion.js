import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { checkRateLimit, checkStrictRateLimit } from "@/lib/rate-limit";
import {
  createRateLimitResponse,
  getClientIP,
  ApiException,
} from "@/lib/api-response";

// Re-export ApiException for convenience
export { ApiException } from "@/lib/api-response";

export interface ApiMiddlewareOptions {
  rateLimit?: "normal" | "strict" | "none";
  requireAuth?: boolean;
  allowedMethods?: string[];
}

export interface ApiContext {
  request: NextRequest;
  ip: string;
  userId?: string;
  user?: any;
}

/**
 * API middleware for common functionality
 */
export async function withApiMiddleware(
  request: NextRequest,
  handler: (context: ApiContext) => Promise<NextResponse>,
  options: ApiMiddlewareOptions = {},
): Promise<NextResponse> {
  const {
    rateLimit = "normal",
    requireAuth = false,
    allowedMethods = ["GET", "POST", "PUT", "DELETE", "PATCH"],
  } = options;

  try {
    // Check allowed methods
    const method = request.method;
    if (!allowedMethods.includes(method)) {
      throw new ApiException("Method not allowed", 405, "METHOD_NOT_ALLOWED");
    }

    // Extract client IP
    const ip = getClientIP(request);

    // Apply rate limiting
    if (rateLimit !== "none") {
      const rateLimitCheck =
        rateLimit === "strict"
          ? await checkStrictRateLimit(ip)
          : await checkRateLimit(ip);

      if (!rateLimitCheck.allowed) {
        return createRateLimitResponse();
      }
    }

    // Create context
    const context: ApiContext = {
      request,
      ip,
    };

    // Call the actual handler
    return await handler(context);
  } catch (error) {
    console.error("API middleware error:", error);

    if (error instanceof ApiException) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
          timestamp: new Date().toISOString(),
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

/**
 * Higher-order function to wrap API handlers with middleware
 */
export function createApiHandler(
  handler: (context: ApiContext) => Promise<NextResponse>,
  options: ApiMiddlewareOptions = {},
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    return withApiMiddleware(request, handler, options);
  };
}

/**
 * Utility function to handle common API operations
 */
export async function handleApiRequest<T>(
  request: NextRequest,
  handler: (context: ApiContext) => Promise<T>,
  options: ApiMiddlewareOptions = {},
): Promise<NextResponse> {
  const wrappedHandler = async (context: ApiContext): Promise<NextResponse> => {
    try {
      const result = await handler(context);

      // If the result is already a NextResponse, return it directly
      if (result instanceof NextResponse) {
        return result;
      }

      return NextResponse.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("API handler error:", error);

      if (error instanceof ApiException) {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
            code: error.code,
            timestamp: new Date().toISOString(),
          },
          { status: error.status },
        );
      }

      if (error instanceof Error) {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString(),
          },
          { status: 400 },
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: "Internal server error",
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      );
    }
  };

  return withApiMiddleware(request, wrappedHandler, options);
}
