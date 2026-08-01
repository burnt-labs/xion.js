/**
 * AA API exports
 * Types are exported from @burnt-labs/signers
 */

export * from "./client";
export * from "./createAccount";
export {
  AccountCreationError,
  diagnoseCreateFailure,
} from "./createAccountDiagnostics";

// Re-export API types from @burnt-labs/signers for convenience
export type {
  AddressResponse,
  CheckResponse,
  CreateEthWalletRequest,
  CreateSecp256k1Request,
  CreateJWTRequest,
  CreateAccountResponse,
  RegistrationConfigResponse,
  AccountType,
} from "@burnt-labs/signers";
