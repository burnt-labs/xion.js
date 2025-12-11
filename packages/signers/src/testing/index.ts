/**
 * @burnt-labs/signers/testing
 *
 * Test utilities and mock data for @burnt-labs/signers.
 * Import from this subpath in your tests to get type-safe mock data.
 *
 * @example
 * ```typescript
 * import { AUTHENTICATOR_TYPE } from '@burnt-labs/signers';
 * import { mockAuthenticators, mockSmartAccounts } from '@burnt-labs/signers/testing';
 *
 * const testAuth = mockAuthenticators.secp256k1;
 * const testAccount = mockSmartAccounts.withSecp256k1;
 * ```
 *
 * @packageDocumentation
 */

export {
  mockAuthenticators,
  mockSmartAccounts,
  mockRpcResponses,
  mockIndexerResponses,
  testAccounts,
} from "./fixtures.js";
