export interface GrantsResponse {
  grants: Grant[];
  pagination: Pagination;
}

export interface Grant {
  granter: string;
  grantee: string;
  authorization: Authorization;
  expiration: string;
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
  remaining: string;
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
