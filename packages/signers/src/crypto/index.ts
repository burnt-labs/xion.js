/**
 * Pure cryptographic utilities for wallet account creation
 * Extracted from AA API - can be used without calling the API
 */

export * from "./salt";
export * from "./address";
export * from "./signature";

// Re-export AuthenticatorType and constants for convenience
export type { AuthenticatorType } from "./salt";
export { AUTHENTICATOR_TYPE } from "./salt";
