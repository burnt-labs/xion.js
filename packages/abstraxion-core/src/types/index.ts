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

export interface DecodeAuthorizationResponse {
  msg?: string;
  spendLimit?: string;
  allowList?: string[];
  authorizationType?: string;
  maxTokens?: string;
  denyList?: string[];
  contracts?: {
    contract: string;
    limitType?: string;
    maxCalls?: string;
    maxFunds?: { denom: string; amount: string }[];
    combinedLimits?: {
      maxCalls: string;
      maxFunds: { denom: string; amount: string }[];
    };
    filter?: {
      typeUrl: string;
      keys?: string[];
      messages?: Uint8Array[];
    };
  }[];
}
