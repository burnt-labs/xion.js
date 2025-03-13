/**
 * @deprecated This package is deprecated and will no longer be maintained.
 * Please contact the Burnt Labs team for alternative solutions and migration guidance.
 */

console.warn(
  "Warning: @burnt-labs/signers package is deprecated and will no longer be maintained. Please contact the Burnt Labs team for alternative solutions and migration guidance."
);

export { GasPrice } from "@cosmjs/stargate";
export { AAClient } from "./signers/utils/client";
export { AADirectSigner } from "./signers/direct-signer";
export { AbstractAccountJWTSigner } from "./signers/jwt-signer";
export { AAEthSigner } from "./signers/eth-signer";
export {
  AASigner,
  AADefaultSigner,
  AAAlgo,
  type AAccountData,
} from "./interfaces";
export { customAccountFromAny } from "./signers/utils";
