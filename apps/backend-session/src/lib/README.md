# API Middleware System

This directory contains a unified API middleware system that provides consistent error handling, rate limiting, validation, and response formatting across all API routes.

## Features

- **Unified Response Format**: All API responses follow a consistent structure
- **Automatic Rate Limiting**: Built-in rate limiting with configurable levels
- **Request Validation**: Automatic validation using Zod schemas
- **Error Handling**: Centralized error handling with proper HTTP status codes
- **IP Extraction**: Automatic client IP extraction from various headers
- **Type Safety**: Full TypeScript support with proper typing

## Files

- `api-response.ts`: Response utilities and error classes
- `api-middleware.ts`: Core middleware functionality
- `api-wrapper.ts`: High-level wrapper functions for common use cases

## Usage Examples

### Basic API Route

```typescript
import { createApiWrapper } from "@/lib/api-wrapper";
import { z } from "zod";

const schema = z.object({
  name: z.string(),
  email: z.string().email(),
});

export const POST = createApiWrapper(
  async (context) => {
    const { validatedData } = context;
    // Your business logic here
    return { message: "Success", data: validatedData };
  },
  {
    schema,
    schemaType: "body",
    rateLimit: "normal",
    allowedMethods: ["POST"],
  }
);
```

### Wallet API Route

```typescript
import { createWalletApiWrapper } from "@/lib/api-wrapper";
import { connectWalletSchema } from "@/lib/validation";

export const POST = createWalletApiWrapper(
  async (context) => {
    const { validatedData, user } = context;
    // User is automatically found/created based on username
    // Your wallet logic here
    return result;
  },
  {
    schema: connectWalletSchema,
    schemaType: "body",
    rateLimit: "strict",
    allowedMethods: ["POST"],
  }
);
```

### Health Check Route

```typescript
import { createHealthApiWrapper } from "@/lib/api-wrapper";

export const GET = createHealthApiWrapper(
  async (context) => {
    // Health check logic
    return { status: "healthy", database: "connected" };
  },
  {
    allowedMethods: ["GET"],
  }
);
```

## Response Format

All API responses follow this structure:

### Success Response

```json
{
  "success": true,
  "data": { /* your data */ },
  "message": "Optional message",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Rate Limiting

Three levels of rate limiting are available:

- `"none"`: No rate limiting
- `"normal"`: Standard rate limiting
- `"strict"`: Strict rate limiting (for sensitive operations)

## Validation

Automatic validation is supported for:

- `"body"`: Request body validation
- `"query"`: Query parameters validation
- `"params"`: URL parameters validation (future)

## Error Handling

The system automatically handles:

- Validation errors (400)
- Rate limit exceeded (429)
- User not found (404)
- Internal server errors (500)
- Custom business logic errors

## Benefits

1. **Consistency**: All API routes follow the same patterns
2. **Reduced Boilerplate**: Common functionality is abstracted away
3. **Type Safety**: Full TypeScript support
4. **Maintainability**: Centralized error handling and validation
5. **Security**: Built-in rate limiting and IP extraction
6. **Developer Experience**: Easy to use and extend
