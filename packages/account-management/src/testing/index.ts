/**
 * @burnt-labs/account-management/testing
 *
 * Test utilities and mock data for @burnt-labs/account-management.
 * Import from this subpath in your tests to get type-safe mock data.
 *
 * @example
 * ```typescript
 * import {
 *   mockTreasuryConfigs,
 *   mockGrantConfigs,
 *   mockTreasuryContractResponses
 * } from '@burnt-labs/account-management/testing';
 *
 * const treasury = mockTreasuryConfigs.basic;
 * const grantConfig = mockGrantConfigs.genericExecute;
 * ```
 *
 * @packageDocumentation
 */

export {
  mockTreasuryParams,
  mockGrantTypeUrls,
  mockGrantConfigs,
  mockTreasuryConfigs,
  mockTreasuryContractResponses,
  mockDaoTreasuryResponses,
  mockPermissionDescriptions,
  testTreasuryAddresses,
} from "./fixtures.js";
