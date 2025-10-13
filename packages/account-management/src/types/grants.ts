import type {
  AllowedMsgAllowance,
  PeriodicAllowance,
} from "cosmjs-types/cosmos/feegrant/v1beta1/feegrant";

export interface BaseAllowance {
  "@type": string;
}

// ContractsAllowance Interface
export interface ContractsAllowance extends BaseAllowance {
  "@type": "/xion.v1.ContractsAllowance";
  allowance: PeriodicAllowance | BaseAllowance;
  contractAddresses: string[];
}

// MultiAnyAllowance Interface
export interface MultiAnyAllowance extends BaseAllowance {
  "@type": "/xion.v1.MultiAnyAllowance";
  allowances: (ContractsAllowance | AllowedMsgAllowance | BaseAllowance)[];
}

// Generic Allowance Type
export type Allowance =
  | PeriodicAllowance
  | AllowedMsgAllowance
  | ContractsAllowance
  | MultiAnyAllowance
  | BaseAllowance;

// Top-Level Allowance Response Interface
export interface AllowanceResponse {
  allowance: {
    granter: string;
    grantee: string;
    allowance: Allowance;
  };
}
