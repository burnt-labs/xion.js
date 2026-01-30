import {
  AuthorizationTypes,
  ContractExecFilterTypes,
  ContractExecLimitTypes,
} from "@/utils/grant/constants";
import { GenericAuthorization } from "cosmjs-types/cosmos/authz/v1beta1/authz";
import { SendAuthorization } from "cosmjs-types/cosmos/bank/v1beta1/authz";
import { Coin } from "cosmjs-types/cosmos/base/v1beta1/coin";
import { StakeAuthorization } from "cosmjs-types/cosmos/staking/v1beta1/authz";
import { TransferAuthorization } from "cosmjs-types/ibc/applications/transfer/v1/authz";

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

/**
 * Treasury grant configuration returned from treasury contract
 * Matches the GrantConfig struct in contracts/contracts/treasury/src/grant.rs
 */
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

export interface DecodedExecuteContracts {
  address: string;
  limitType?: ContractExecLimitTypes;
  maxCalls?: string;
  maxFunds?: Coin[];
  filterType?: ContractExecFilterTypes;
  messages?: Uint8Array[];
  keys?: string[];
}

export interface HumanContractExecAuth {
  grants: DecodedExecuteContracts[];
}

export interface DecodedReadableAuthorization {
  type: AuthorizationTypes;
  data:
    | GenericAuthorization
    | SendAuthorization
    | TransferAuthorization
    | StakeAuthorization
    | HumanContractExecAuth
    | null;
}

// Re-export generated protobuf types from signers
export { AbstractAccount } from "@burnt-labs/signers";

// Iframe communication types
export * from "./iframe";
