/**
 * Pure cryptographic utilities for wallet account creation
 * Extracted from AA API - can be used without calling the API
 */

export * from "./salt";
export * from "./address";
export * from "./signature";
export * from "./authenticator-validation";
export * from "./normalize";
export * from "./signature-verification";
export * from "./hex-validation";

// Re-export types from the types module for backward compatibility
export type { AuthenticatorType, AuthenticatorInfo, SmartAccount, ContractInfo } from "../types/account";
export { AUTHENTICATOR_TYPE } from "../types/account";
