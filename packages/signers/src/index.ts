export { GasPrice } from "@cosmjs/stargate";
export { AAClient } from "./signers/utils/client";
export { AADirectSigner } from "./signers/direct-signer";
export { AAEthSigner } from "./signers/eth-signer";
export {
  AASigner,
  AADefaultSigner,
  AAAlgo,
  type AAccountData,
  type AddAuthenticator,
  type AddJwtAuthenticator,
  type AddSecp256K1Authenticator,
  type AddEd25519Authenticator,
  type AddEthWalletAuthenticator,
  type RemoveAuthenticator,
} from "./interfaces";
export { customAccountFromAny } from "./signers/utils";
export { createSignerFromSigningFunction } from "./signers/utils/signer-factory";
export type { CreateSignerParams } from "./signers/utils/signer-factory";

// Crypto utilities for smart account creation
export * from "./crypto";

// Fee and gas calculation utilities
export * from "./fees";

// Domain types (source of truth for account types)
export * from "./types/account";

// API types for AA API v2 interactions
export * from "./types/api";

// Generated protobuf types (source of truth)
export { AbstractAccount } from "./types/generated/abstractaccount/v1/account";
