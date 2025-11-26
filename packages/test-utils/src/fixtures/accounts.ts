/**
 * Mock account data for testing
 * Provides realistic account, authenticator, and smart account fixtures
 */

import { AUTHENTICATOR_TYPE } from "@burnt-labs/signers";
import type { AuthenticatorInfo, SmartAccount } from "@burnt-labs/signers";

/**
 * Mock authenticator data
 */
export const mockAuthenticators = {
  secp256k1: {
    id: "03a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5e5",
    type: AUTHENTICATOR_TYPE.Secp256K1,
    authenticatorIndex: 0,
  } as AuthenticatorInfo,

  ethWallet: {
    id: "0x742d35cc6634c0532925a3b844bc9e7595f0beb0",
    type: AUTHENTICATOR_TYPE.EthWallet,
    authenticatorIndex: 1,
  } as AuthenticatorInfo,

  passkey: {
    id: "passkey_credential_id_abc123",
    type: AUTHENTICATOR_TYPE.Passkey,
    authenticatorIndex: 2,
  } as AuthenticatorInfo,

  jwt: {
    id: "google-oauth2|1234567890",
    type: AUTHENTICATOR_TYPE.JWT,
    authenticatorIndex: 3,
  } as AuthenticatorInfo,
};

/**
 * Mock smart accounts
 */
export const mockSmartAccounts = {
  withSecp256k1: {
    id: "xion1z70cvc08qv5764zeg3dykcyymj5z6nu4sqr7x8",
    codeId: 1,
    authenticators: [mockAuthenticators.secp256k1],
  } as SmartAccount,

  withEthWallet: {
    id: "xion1k4epd8ntaq8c6m5hzddl6mt4pjxjzn2m7vfgvv",
    codeId: 1,
    authenticators: [mockAuthenticators.ethWallet],
  } as SmartAccount,

  withMultipleAuthenticators: {
    id: "xion1a7x8aj7k38geud8ze9c446z9uczcylw8qpc7dp",
    codeId: 1,
    authenticators: [
      mockAuthenticators.secp256k1,
      mockAuthenticators.ethWallet,
      mockAuthenticators.passkey,
    ],
  } as SmartAccount,

  withJWT: {
    id: "xion1m9l358xunhhwds0568za49mzhvuxx9ux82fcm9",
    codeId: 1,
    authenticators: [mockAuthenticators.jwt],
  } as SmartAccount,
};

/**
 * Mock RPC responses for account queries
 */
export const mockRpcResponses = {
  /**
   * Successful contract query response with authenticators
   */
  contractQuerySuccess: {
    data: {
      authenticators: [
        {
          id: mockAuthenticators.secp256k1.id,
          type: mockAuthenticators.secp256k1.type,
          authenticator_index: 0,
        },
      ],
    },
  },

  /**
   * Contract query response for non-existent contract
   */
  contractNotFound: {
    error: "contract: not found",
  },

  /**
   * Contract query response for account with multiple authenticators
   */
  multipleAuthenticators: {
    data: {
      authenticators: [
        {
          id: mockAuthenticators.secp256k1.id,
          type: mockAuthenticators.secp256k1.type,
          authenticator_index: 0,
        },
        {
          id: mockAuthenticators.ethWallet.id,
          type: mockAuthenticators.ethWallet.type,
          authenticator_index: 1,
        },
      ],
    },
  },
};

/**
 * Mock indexer responses (Numia/SubQuery format)
 */
export const mockIndexerResponses = {
  /**
   * Numia indexer response format
   */
  numia: {
    success: {
      accounts: [
        {
          account_address: mockSmartAccounts.withSecp256k1.id,
          code_id: 1,
          authenticators: [
            {
              authenticator_id: mockAuthenticators.secp256k1.id,
              authenticator_type: mockAuthenticators.secp256k1.type,
              authenticator_index: 0,
            },
          ],
        },
      ],
    },
    empty: {
      accounts: [],
    },
    error: {
      error: "Indexer unavailable",
      status: 503,
    },
  },

  /**
   * SubQuery GraphQL response format
   */
  subquery: {
    success: {
      data: {
        smartAccounts: {
          nodes: [
            {
              id: mockSmartAccounts.withSecp256k1.id,
              codeId: 1,
              authenticators: [
                {
                  id: mockAuthenticators.secp256k1.id,
                  type: mockAuthenticators.secp256k1.type,
                  authenticatorIndex: 0,
                },
              ],
            },
          ],
        },
      },
    },
    empty: {
      data: {
        smartAccounts: {
          nodes: [],
        },
      },
    },
    error: {
      errors: [
        {
          message: "GraphQL query failed",
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        },
      ],
    },
  },
};

/**
 * Known test account addresses for integration tests
 */
export const testAccounts = {
  /**
   * Test account on xion-testnet-2 (if available)
   * Replace with actual test account addresses
   */
  existing: "xion1z70cvc08qv5764zeg3dykcyymj5z6nu4sqr7x8",

  /**
   * Non-existent account (for negative testing)
   */
  nonExistent: "xion1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqnrql8a",

  /**
   * Test treasury address
   */
  treasury: "xion1sv6kdau6mvjlzkthdhpcl53e8zmhaltmgzz9jhxgkxhmpymla9gqrh0knw",
};
