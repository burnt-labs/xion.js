import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiRequest, ApiContext } from "@/lib/api-middleware";
import { ApiException } from "@/lib/api-response";

export interface ApiWrapperOptions {
  rateLimit?: "normal" | "strict" | "none";
  requireAuth?: boolean;
  allowedMethods?: string[];
  schema?: z.ZodSchema;
  schemaType?: "body" | "query" | "params";
}

/**
 * Generic API wrapper that handles common operations
 */
export function createApiWrapper<T = any>(
  handler: (context: ApiContext & { validatedData?: any }) => Promise<T>,
  options: ApiWrapperOptions = {},
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    return handleApiRequest(
      request,
      async (context) => {
        const { request, ip } = context;

        // Validate request data if schema is provided
        let validatedData: any = undefined;

        if (options.schema) {
          try {
            if (options.schemaType === "query") {
              const { searchParams } = new URL(request.url);
              const queryData = Object.fromEntries(searchParams.entries());
              validatedData = options.schema.parse(queryData);
            } else if (options.schemaType === "params") {
              // For dynamic routes, params would be passed separately
              // This is a placeholder for future implementation
              throw new ApiException(
                "Params validation not implemented yet",
                500,
              );
            } else {
              // Default to body validation
              const body = await request.json();
              validatedData = options.schema.parse(body);
            }
          } catch (error) {
            if (error instanceof z.ZodError) {
              const errorMessage = error.errors
                .map((err) => `${err.path.join(".")}: ${err.message}`)
                .join(", ");
              throw new ApiException(
                `Validation failed: ${errorMessage}`,
                400,
                "VALIDATION_ERROR",
              );
            }
            throw error;
          }
        }

        // Call the handler with validated data
        return await handler({ ...context, validatedData });
      },
      options,
    );
  };
}

/**
 * Specific wrapper for wallet operations
 */
export function createWalletApiWrapper<T = any>(
  handler: (
    context: ApiContext & { validatedData?: any; user?: any },
  ) => Promise<T>,
  options: Omit<ApiWrapperOptions, "rateLimit"> & {
    rateLimit?: "normal" | "strict";
  } = {},
) {
  return createApiWrapper(
    async (context) => {
      const { request, validatedData } = context;

      // Find user if username is provided
      let user: any = null;
      if (validatedData?.username) {
        const { prisma } = await import("@/lib/database");
        user = await prisma.user.findUnique({
          where: { username: validatedData.username },
        });

        if (!user) {
          throw new ApiException("User not found", 404, "USER_NOT_FOUND");
        }
      }

      return await handler({ ...context, user });
    },
    {
      rateLimit: "normal",
      ...options,
    },
  );
}

/**
 * Specific wrapper for health check operations
 */
export function createHealthApiWrapper<T = any>(
  handler: (context: ApiContext) => Promise<T>,
  options: Omit<ApiWrapperOptions, "rateLimit"> = {},
) {
  return createApiWrapper(handler, {
    rateLimit: "none",
    ...options,
  });
}

/**
 * Utility function to create standardized API handlers
 */
export function createStandardApiHandler<T = any>(
  handler: (
    context: ApiContext & { validatedData?: any; user?: any },
  ) => Promise<T>,
  options: ApiWrapperOptions = {},
) {
  return createApiWrapper(handler, {
    rateLimit: "normal",
    ...options,
  });
}

/**
 * Helper function to extract and validate user from request
 */
export async function getUserFromRequest(
  request: NextRequest,
  username?: string,
): Promise<any> {
  if (!username) {
    throw new ApiException("Username is required", 400, "MISSING_USERNAME");
  }

  const { prisma } = await import("@/lib/database");
  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) {
    throw new ApiException("User not found", 404, "USER_NOT_FOUND");
  }

  return user;
}

/**
 * Helper function to create or get user
 */
export async function createOrGetUser(username: string): Promise<any> {
  const { prisma } = await import("@/lib/database");

  let user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) {
    user = await prisma.user.create({
      data: { username },
    });
  }

  return user;
}
