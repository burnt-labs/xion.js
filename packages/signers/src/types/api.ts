/**
 * AA API v2 types
 * Generated from OpenAPI schema - single source of truth
 *
 * These types are automatically generated from the AA API OpenAPI schema.
 * They are regenerated in CI to ensure they match the live API contract.
 *
 * To regenerate types locally:
 *   pnpm generate:types
 *
 * To regenerate from a specific environment:
 *   pnpm generate:types:testnet
 *   pnpm generate:types:mainnet
 */

// Re-export generated types from OpenAPI schema
export type {
  AddressResponse,
  CheckResponse,
  CreateEthWalletRequest,
  CreateSecp256k1Request,
  CreateJWTRequest,
  CreateAccountResponseV2,
  AccountType,
  ErrorResponse,
} from "./generated/api";

// Alias for backward compatibility
export type { CreateAccountResponseV2 as CreateAccountResponse } from "./generated/api";
