/**
 * AA API exports
 * Types are exported from @burnt-labs/signers
 */

export * from "./client";
export * from "./createAccount";
export {
  AccountCreationError,
  checkAddressAlignment,
  diagnoseCreateFailure,
} from "./createAccountDiagnostics";

// Re-export API types from @burnt-labs/signers for convenience.
// `RegistrationConfigResponse` is intentionally absent: ./client already
// re-exports it, and naming it twice makes the duplicate a compile error the
// day one of the two sources changes.
export type {
  AddressResponse,
  CheckResponse,
  CreateEthWalletRequest,
  CreateSecp256k1Request,
  CreateJWTRequest,
  CreateAccountResponse,
  AccountType,
} from "@burnt-labs/signers";
