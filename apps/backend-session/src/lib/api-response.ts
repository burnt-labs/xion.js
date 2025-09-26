import { NextResponse } from "next/server";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

export interface ApiError {
  message: string;
  status: number;
  code?: string;
}

export class ApiException extends Error {
  public status: number;
  public code?: string;

  constructor(message: string, status = 400, code?: string) {
    super(message);
    this.name = "ApiException";
    this.status = status;
    this.code = code;
  }
}

/**
 * Create a successful API response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  status = 200,
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };

  if (message) {
    response.message = message;
  }

  return NextResponse.json(response, { status });
}

/**
 * Create an error API response
 */
export function createErrorResponse(
  error: string | ApiException,
  status?: number,
  code?: string,
): NextResponse<ApiResponse> {
  let errorMessage: string;
  let errorStatus: number;
  let errorCode: string | undefined;

  if (error instanceof ApiException) {
    errorMessage = error.message;
    errorStatus = error.status;
    errorCode = error.code;
  } else {
    errorMessage = error;
    errorStatus = status || 400;
    errorCode = code;
  }

  const response: ApiResponse = {
    success: false,
    error: errorMessage,
    timestamp: new Date().toISOString(),
  };

  if (errorCode) {
    response.error = `${errorCode}: ${errorMessage}`;
  }

  return NextResponse.json(response, { status: errorStatus });
}

/**
 * Create a rate limit error response
 */
export function createRateLimitResponse(): NextResponse<ApiResponse> {
  return createErrorResponse(
    "Too many requests from this IP, please try again later.",
    429,
    "RATE_LIMIT_EXCEEDED",
  );
}

/**
 * Create a validation error response
 */
export function createValidationErrorResponse(
  message = "Validation failed",
): NextResponse<ApiResponse> {
  return createErrorResponse(message, 400, "VALIDATION_ERROR");
}

/**
 * Create a not found error response
 */
export function createNotFoundResponse(
  resource = "Resource",
): NextResponse<ApiResponse> {
  return createErrorResponse(`${resource} not found`, 404, "NOT_FOUND");
}

/**
 * Create an internal server error response
 */
export function createInternalErrorResponse(
  message = "Internal server error",
): NextResponse<ApiResponse> {
  return createErrorResponse(message, 500, "INTERNAL_ERROR");
}

/**
 * Extract client IP from request headers
 */
export function getClientIP(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  const cfConnectingIP = request.headers.get("cf-connecting-ip");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  return "unknown";
}
