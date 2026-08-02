/**
 * AA API v2 types — HAND-WRITTEN. Edit this file.
 *
 * ⚠️ Despite living in generated/, this file is NOT generated and
 * `pnpm generate:types` will never overwrite it. Only its neighbour
 * api.generated.ts (the raw openapi-typescript output) is regenerated; that
 * one really must not be edited by hand.
 *
 * This is the façade over it: every type below is an alias that pulls one
 * request/response shape out of the generated `paths` tree, so the SDK imports
 * a stable name instead of a path expression. That means a schema change is
 * only half-adopted by regenerating — if the AA API renames an endpoint or
 * adds a type the SDK needs, the alias here has to be updated by hand or the
 * build breaks (renames) or silently misses the new surface (additions).
 */

import type { paths } from "./api.generated";

// Response types extracted from API paths
export type AddressResponse =
  paths["/api/v2/account/address/ethwallet/{address}"]["get"]["responses"]["200"]["content"]["application/json"];

export type CheckResponse =
  paths["/api/v2/account/check/ethwallet/{address}"]["get"]["responses"]["200"]["content"]["application/json"];

export type CreateAccountResponseV2 =
  paths["/api/v2/accounts/create/ethwallet"]["post"]["responses"]["200"]["content"]["application/json"];

// Request types extracted from API paths
export type CreateEthWalletRequest = NonNullable<
  paths["/api/v2/accounts/create/ethwallet"]["post"]["requestBody"]
>["content"]["application/json"];

export type CreateSecp256k1Request = NonNullable<
  paths["/api/v2/accounts/create/secp256k1"]["post"]["requestBody"]
>["content"]["application/json"];

export type CreateJWTRequest = NonNullable<
  paths["/api/v2/accounts/create/jwt"]["post"]["requestBody"]
>["content"]["application/json"];

// Registration discovery: valid code_id values + the worker's default target
export type RegistrationConfigResponse =
  paths["/api/v2/account/registration-config"]["get"]["responses"]["200"]["content"]["application/json"];

// Account type - union of authenticator types
export type AccountType = "ethwallet" | "secp256k1" | "jwt";

// Error response type
export type ErrorResponse =
  paths["/api/v2/accounts/create/ethwallet"]["post"]["responses"]["400"]["content"]["application/json"];

// Alias for backward compatibility
export type CreateAccountResponse = CreateAccountResponseV2;
