import { Coin } from "cosmjs-types/cosmos/base/v1beta1/coin";

export interface GrantsResponse {
  grants: Grant[];
  pagination: Pagination;
}

export interface Grant {
  granter?: string;
  grantee?: string;
  authorization: any;
  expiration: string;
}

export interface TreasuryGrantConfig {
  description: string;
  authorization: {
    type_url: string;
    value: string;
  };
  optional: boolean;
}

export interface Authorization {
  "@type": string;
  grants: GrantAuthorization[];
}

export interface GrantAuthorization {
  contract: string;
  limit: Limit;
  filter: Filter;
}

export interface Limit {
  "@type": string;
  remaining?: string;
  calls_remaining?: string;
  amounts?: SpendLimit[];
}

export interface Filter {
  "@type": string;
}

export interface Pagination {
  next_key: null | string;
  total: string;
}

export type SpendLimit = { denom: string; amount: string };

export type ContractGrantDescription =
  | string
  | {
      address: string;
      amounts: SpendLimit[];
    };

// TODO: Is this the manufactored interface we want to stick with?
export interface DecodeAuthorizationResponse {
  msg?: string;
  spendLimit?: Coin[];
  allowList?: string[];
  authorizationType?: string;
  maxTokens?: Coin;
  denyList?: string[];
  contracts?: {
    contract: string;
    limitType?: string;
    maxCalls?: string;
    maxFunds?: Coin[];
    combinedLimits?: {
      maxCalls: string;
      maxFunds: Coin[];
    };
    filter?: {
      typeUrl: string;
      keys?: string[];
      messages?: Uint8Array[];
    };
  }[];
}
export interface AminoSignDoc {
  chain_id: string;
  account_number: string;
  sequence: string;
  fee: {
    amount: never[];
    gas: string;
  };
  msgs: {
    type: string;
    value: {
      signer: string;
      data: string;
    };
  }[];
  memo: string;
}
