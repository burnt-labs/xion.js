/**
 * Mock grant responses for testing authorization flows
 */

import { TEST_ADDRESSES } from './addresses.js';

export interface GrantsResponse {
  grants: Array<{
    authorization: any;
    expiration: string;
  }>;
  pagination: {
    next_key: string | null;
    total: string;
  };
}

/**
 * Legacy config format for backward compatibility
 */
export const LEGACY_CONFIG = {
  grantContracts: [
    TEST_ADDRESSES.contract,
    {
      address: TEST_ADDRESSES.contract,
      amounts: [{ denom: "uxion", amount: "1000000" }],
    },
  ] as any[],
  stake: true,
  bank: [{ denom: "uxion", amount: "1000000" }],
};

/**
 * Standard mock grants response with all common grant types
 */
export const MOCK_GRANTS_RESPONSE: GrantsResponse = {
  grants: [
    {
      authorization: {
        "@type": "/cosmos.bank.v1beta1.SendAuthorization",
        spend_limit: [
          {
            denom: "uxion",
            amount: "1000000",
          },
        ],
        allow_list: [],
      },
      expiration: "2025-02-13T18:03:09Z",
    },
    {
      authorization: {
        "@type": "/cosmos.authz.v1beta1.GenericAuthorization",
        msg: "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward",
      },
      expiration: "2025-02-13T18:03:09Z",
    },
    {
      authorization: {
        "@type": "/cosmos.staking.v1beta1.StakeAuthorization",
        max_tokens: null,
        authorization_type: "AUTHORIZATION_TYPE_REDELEGATE",
      },
      expiration: "2025-02-13T18:03:09Z",
    },
    {
      authorization: {
        "@type": "/cosmos.authz.v1beta1.GenericAuthorization",
        msg: "/cosmos.staking.v1beta1.MsgCancelUnbondingDelegation",
      },
      expiration: "2025-02-13T18:03:09Z",
    },
    {
      authorization: {
        "@type": "/cosmos.staking.v1beta1.StakeAuthorization",
        max_tokens: null,
        authorization_type: "AUTHORIZATION_TYPE_DELEGATE",
      },
      expiration: "2025-02-13T18:03:09Z",
    },
    {
      authorization: {
        "@type": "/cosmos.staking.v1beta1.StakeAuthorization",
        max_tokens: null,
        authorization_type: "AUTHORIZATION_TYPE_UNDELEGATE",
      },
      expiration: "2025-02-13T18:03:09Z",
    },
    {
      authorization: {
        "@type": "/cosmwasm.wasm.v1.ContractExecutionAuthorization",
        grants: [
          {
            contract: TEST_ADDRESSES.contract,
            limit: {
              "@type": "/cosmwasm.wasm.v1.MaxCallsLimit",
              remaining: "255",
            },
            filter: {
              "@type": "/cosmwasm.wasm.v1.AllowAllMessagesFilter",
            },
          },
          {
            contract: TEST_ADDRESSES.contract,
            limit: {
              "@type": "/cosmwasm.wasm.v1.CombinedLimit",
              calls_remaining: "255",
              amounts: [
                {
                  denom: "uxion",
                  amount: "1000000",
                },
              ],
            },
            filter: {
              "@type": "/cosmwasm.wasm.v1.AllowAllMessagesFilter",
            },
          },
        ],
      },
      expiration: "2025-02-13T18:03:09Z",
    },
  ],
  pagination: {
    next_key: null,
    total: "7",
  },
};

/**
 * Treasury-specific grants response
 */
export const MOCK_TREASURY_GRANTS: GrantsResponse = {
  grants: [
    {
      authorization: {
        "@type": "/cosmos.authz.v1beta1.GenericAuthorization",
        msg: "/cosmwasm.wasm.v1.MsgSend",
      },
      expiration: "2025-02-13T18:03:09Z",
    },
  ],
  pagination: {
    next_key: null,
    total: "1",
  },
};

// Re-export for backward compatibility
export const mockValidatorAddress = TEST_ADDRESSES.validator;
export const mockAccountAddress = TEST_ADDRESSES.account;
export const mockContractAddress = TEST_ADDRESSES.contract;
export const mockLegacyConfig = LEGACY_CONFIG;
export const mockGrantsResponse = MOCK_GRANTS_RESPONSE;
export const mockGrantsResponseForTreasury = MOCK_TREASURY_GRANTS;
