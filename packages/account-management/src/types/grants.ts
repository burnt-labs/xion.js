import type {
  AllowedMsgAllowance,
  PeriodicAllowance,
} from "cosmjs-types/cosmos/feegrant/v1beta1/feegrant";

export type SpendLimit = { denom: string; amount: string };

export type ContractGrantDescription =
  | string
  | {
      address: string;
      amounts: SpendLimit[];
    };

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

/**
 * Grant creation configuration
 * Used for configuring authorization grants from smart account to session keypair
 */
export interface GrantConfig {
  /** Treasury contract address (if using treasury-based grants) */
  treasury?: string;
  
  /** Manual contract grant descriptions */
  contracts?: Array<string | { address: string; amounts: Array<{ denom: string; amount: string }> }>;
  
  /** Bank spend limits */
  bank?: Array<{ denom: string; amount: string }>;
  
  /** Enable staking permissions */
  stake?: boolean;
  
  /** Fee granter address */
  feeGranter?: string;
  
  /** DaoDao indexer URL for treasury queries */
  daodaoIndexerUrl?: string;
}
