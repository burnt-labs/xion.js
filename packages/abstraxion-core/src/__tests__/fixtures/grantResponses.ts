import type { ChainGrant, GrantsResponse } from "@/types";
import {
  AuthorizationTypes,
  ContractExecLimitTypes,
  ContractExecFilterTypes,
} from "@/utils/grant/constants";

export const mockValidatorAddress =
  "xionvaloper1q5wtf79lrndrm4uxpxzsqnkahewen47qug7f4h";
export const mockAccountAddress =
  "xion15k0lncpkc93p79sl9fjfs0hwn7hjajsvclnv5k3xeguwe08yme9sttujm4";
export const mockContractAddress =
  "xion1z70cvc08qv5764zeg3dykcyymj5z6nu4sqr7x8vl4zjef2gyp69s9mmdka";

export const mockLegacyConfig = {
  grantContracts: [
    mockContractAddress,
    {
      address: mockContractAddress,
      amounts: [{ denom: "uxion", amount: "1000000" }],
    },
  ],
  stake: true,
  bank: [{ denom: "uxion", amount: "1000000" }],
};

export const mockGrantsResponse: GrantsResponse = {
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
            contract:
              "xion1z70cvc08qv5764zeg3dykcyymj5z6nu4sqr7x8vl4zjef2gyp69s9mmdka",
            limit: {
              "@type": "/cosmwasm.wasm.v1.MaxCallsLimit",
              remaining: "255",
            },
            filter: {
              "@type": "/cosmwasm.wasm.v1.AllowAllMessagesFilter",
            },
          },
          {
            contract:
              "xion1z70cvc08qv5764zeg3dykcyymj5z6nu4sqr7x8vl4zjef2gyp69s9mmdka",
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

export const mockChainGrants: ChainGrant[] = [
  {
    granter: mockAccountAddress,
    grantee: mockAccountAddress,
    authorization: {
      type: AuthorizationTypes.Send,
      data: { spendLimit: [{ denom: "uxion", amount: "1000000" }], allowList: [] } as any,
    },
    expiration: "2025-02-13T18:03:09Z",
  },
  {
    granter: mockAccountAddress,
    grantee: mockAccountAddress,
    authorization: {
      type: AuthorizationTypes.Generic,
      data: { msg: "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward" } as any,
    },
    expiration: "2025-02-13T18:03:09Z",
  },
  {
    granter: mockAccountAddress,
    grantee: mockAccountAddress,
    authorization: {
      type: AuthorizationTypes.Stake,
      data: { authorizationType: 3 } as any,
    },
    expiration: "2025-02-13T18:03:09Z",
  },
  {
    granter: mockAccountAddress,
    grantee: mockAccountAddress,
    authorization: {
      type: AuthorizationTypes.Generic,
      data: { msg: "/cosmos.staking.v1beta1.MsgCancelUnbondingDelegation" } as any,
    },
    expiration: "2025-02-13T18:03:09Z",
  },
  {
    granter: mockAccountAddress,
    grantee: mockAccountAddress,
    authorization: {
      type: AuthorizationTypes.Stake,
      data: { authorizationType: 1 } as any,
    },
    expiration: "2025-02-13T18:03:09Z",
  },
  {
    granter: mockAccountAddress,
    grantee: mockAccountAddress,
    authorization: {
      type: AuthorizationTypes.Stake,
      data: { authorizationType: 2 } as any,
    },
    expiration: "2025-02-13T18:03:09Z",
  },
  {
    granter: mockAccountAddress,
    grantee: mockAccountAddress,
    authorization: {
      type: AuthorizationTypes.ContractExecution,
      data: {
        grants: [
          {
            address: mockContractAddress,
            limitType: ContractExecLimitTypes.MaxCalls,
            maxCalls: "255",
            filterType: ContractExecFilterTypes.AllowAll,
          },
          {
            address: mockContractAddress,
            limitType: ContractExecLimitTypes.CombinedLimit,
            maxCalls: "255",
            maxFunds: [{ denom: "uxion", amount: "1000000" }],
            filterType: ContractExecFilterTypes.AllowAll,
          },
        ],
      },
    },
    expiration: "2025-02-13T18:03:09Z",
  },
];

export const mockGrantsResponseForTreasury: GrantsResponse = {
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
