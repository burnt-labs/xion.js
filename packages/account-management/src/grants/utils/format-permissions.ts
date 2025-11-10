/**
 * Permission formatting utilities for treasury contracts
 * Extracted from dashboard utils/query-treasury-contract.ts
 */

import type { Coin } from "cosmjs-types/cosmos/base/v1beta1/coin";
import { GenericAuthorization } from "cosmjs-types/cosmos/authz/v1beta1/authz";
import { StakeAuthorization } from "cosmjs-types/cosmos/staking/v1beta1/authz";
import { SendAuthorization } from "cosmjs-types/cosmos/bank/v1beta1/authz";
import { TransferAuthorization } from "cosmjs-types/ibc/applications/transfer/v1/authz";

export const DENOM_DECIMALS = {
  xion: 6,
  usdc: 6,
} as const;

export const DENOM_DISPLAY_MAP = {
  xion: "XION",
  usdc: "USDC",
} as const;

/**
 * Parses a coin string (e.g., "1000000uxion") into denom and amount
 */
export function parseCoinString(coinStr: string): Coin[] {
  const trimmed = coinStr.trim();
  if (!trimmed) return [];

  // Match pattern like "1000000uxion" or "1000000 uxion"
  const match = trimmed.match(/^(\d+)\s*([a-zA-Z][a-zA-Z0-9/]*)$/);
  if (!match) return [];

  return [
    {
      amount: match[1],
      denom: match[2],
    },
  ];
}

/**
 * Formats an array of Coin objects into a comma-separated string
 */
export function formatCoinArray(coins: Coin[]): string {
  return coins.map((coin) => `${coin.amount}${coin.denom}`).join(",");
}

/**
 * Formats a coin string (e.g. "1000000uxion") into a human readable format (e.g. "1 XION")
 * Can handle multiple coins separated by commas
 * @param coinStr The coin string to format
 * @param usdcDenom Optional USDC denom to use for formatting (network-specific)
 * @returns Formatted string of coins
 */
export function formatCoins(coinStr: string, usdcDenom?: string): string {
  if (!coinStr) return "";

  const formattedCoins = coinStr.split(",").map((singleCoin) => {
    const coin = parseCoinString(singleCoin)[0];
    if (!coin) return "";

    // Handle special case for USDC (if denom provided)
    if (usdcDenom && coin.denom === usdcDenom) {
      const amount = Number(coin.amount) / Math.pow(10, DENOM_DECIMALS.usdc);
      return `${amount} ${DENOM_DISPLAY_MAP.usdc}`;
    }

    // Handle regular denoms
    const baseDenom = coin.denom.startsWith("u")
      ? coin.denom.slice(1)
      : coin.denom;

    // Check if it's a known denom
    if (baseDenom in DENOM_DECIMALS) {
      // Only convert if the denom starts with 'u'
      if (coin.denom.startsWith("u")) {
        const decimals =
          DENOM_DECIMALS[baseDenom as keyof typeof DENOM_DECIMALS];
        const amount = Number(coin.amount) / Math.pow(10, decimals);
        const displayDenom =
          DENOM_DISPLAY_MAP[baseDenom as keyof typeof DENOM_DISPLAY_MAP] ??
          baseDenom.toUpperCase();
        return `${amount} ${displayDenom}`;
      }
    }

    // For unknown denoms, try to make a best effort to format them nicely
    return `${coin.amount} ${coin.denom.toUpperCase()}`;
  });

  return formattedCoins.filter(Boolean).join(", ");
}

/**
 * Formats a XION amount with its denom
 */
export function formatXionAmount(amount: string, denom: string): string {
  if (denom === "uxion") {
    // Handle invalid inputs
    const numAmount = Number(amount);
    if (isNaN(numAmount)) {
      return `${amount} ${denom}`;
    }

    // Handle negative numbers
    if (numAmount < 0) {
      return `${amount} ${denom}`;
    }

    const value = numAmount / Math.pow(10, 6);
    // Format with 6 decimal places and remove trailing zeros
    const formattedValue = value.toFixed(6).replace(/\.?0+$/, "");
    return `${formattedValue} XION`;
  }
  return `${amount} ${denom}`;
}

/**
 * Mapping of Cosmos message types to human-readable permission descriptions
 */
export const CosmosAuthzPermission: { [key: string]: string } = {
  "/cosmos.bank.v1beta1.MsgSend": "send tokens from your account",
  "/cosmos.staking.v1beta1.MsgDelegate": "delegate your tokens",
  "/cosmos.staking.v1beta1.MsgUndelegate": "undelegate your tokens",
  "/cosmos.staking.v1beta1.MsgBeginRedelegate": "redelegate your tokens",
  "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward":
    "withdraw your staking rewards",
  "/cosmos.gov.v1beta1.MsgVote": "vote on governance proposals on your behalf",
  "/ibc.applications.transfer.v1.MsgTransfer": "transfer your tokens via IBC",
  "/cosmos.authz.v1beta1.MsgExec": "execute transactions on your behalf",
  "/cosmos.authz.v1beta1.MsgRevoke": "revoke permissions",
  "/cosmos.crisis.v1beta1.MsgVerifyInvariant":
    "verify network invariants on your behalf",
  "/cosmos.evidence.v1beta1.MsgSubmitEvidence":
    "submit evidence on your behalf",
  "/cosmos.feegrant.v1beta1.MsgGrantAllowance":
    "manage fee allowances on your behalf",
  "/cosmos.feegrant.v1beta1.MsgRevokeAllowance":
    "revoke fee allowances on your behalf",
  "/cosmos.gov.v1beta1.MsgDeposit":
    "deposit tokens for governance proposals on your behalf",
  "/cosmos.gov.v1beta1.MsgSubmitProposal":
    "submit governance proposals on your behalf",
  "/cosmos.slashing.v1beta1.MsgUnjail": "unjail your validator",
  "/cosmos.vesting.v1beta1.MsgCreateVestingAccount":
    "create vesting accounts on your behalf",
  "/cosmwasm.wasm.v1.MsgStoreCode": "store smart contract code on your behalf",
  "/cosmwasm.wasm.v1.MsgInstantiateContract":
    "instantiate smart contracts on your behalf",
  "/cosmwasm.wasm.v1.MsgInstantiateContract2":
    "instantiate smart contracts on your behalf",
  "/cosmwasm.wasm.v1.MsgExecuteContract":
    "execute smart contracts on your behalf",
  "/cosmwasm.wasm.v1.MsgMigrateContract":
    "migrate smart contracts on your behalf",
  "/cosmwasm.wasm.v1.MsgUpdateAdmin":
    "update the admin of smart contracts on your behalf",
  "/cosmwasm.wasm.v1.MsgClearAdmin":
    "clear the admin of smart contracts on your behalf",
};

/**
 * Authorization types enum (should match abstraxion-core)
 */
export enum AuthorizationTypes {
  Generic = "GenericAuthorization",
  Send = "SendAuthorization",
  Stake = "StakeAuthorization",
  ContractExecution = "ContractExecutionAuthorization",
  IbcTransfer = "TransferAuthorization",
}

/**
 * Decoded authorization with human-readable type
 */
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

/**
 * Human-readable contract execution authorization
 */
export interface HumanContractExecAuth {
  grants: {
    address: string;
    limitType?: string;
    maxCalls?: string;
    maxFunds?: Coin[];
    filterType?: string;
    messages?: Uint8Array[];
    keys?: string[];
  }[];
}

/**
 * Permission description for display to users
 */
export interface PermissionDescription {
  authorizationDescription: string;
  dappDescription?: string;
  contracts?: string[];
}

/**
 * Generate human-readable permission descriptions from decoded grants
 * @param decodedGrants Array of decoded authorizations with dapp descriptions
 * @param account User's account address (to validate contract grants)
 * @param usdcDenom Optional USDC denom for formatting (network-specific)
 * @returns Array of permission descriptions
 */
export function generatePermissionDescriptions(
  decodedGrants: (DecodedReadableAuthorization & { dappDescription: string })[],
  account: string,
  usdcDenom?: string,
): PermissionDescription[] {
  return decodedGrants.map((decodedGrant) => {
    let description: string;
    const contracts: string[] = [];

    switch (decodedGrant.type) {
      case AuthorizationTypes.Generic: {
        description = `Permission to ${
          CosmosAuthzPermission[(decodedGrant.data as GenericAuthorization).msg]
        }`;
        break;
      }
      case AuthorizationTypes.Send: {
        const spendLimit = (decodedGrant.data as SendAuthorization).spendLimit
          .map((limit: Coin) => formatXionAmount(limit.amount, limit.denom))
          .join(", ");
        const allowList = (
          decodedGrant.data as SendAuthorization
        ).allowList.join(", ");
        description = `Permission to send tokens with spend limit: ${spendLimit} ${allowList && `and allow list: ${allowList}`}`;
        break;
      }
      case AuthorizationTypes.IbcTransfer: {
        const allocations = (decodedGrant.data as TransferAuthorization)
          .allocations;
        const formattedLimits = allocations.map((allocation) => {
          const limits = formatCoins(
            formatCoinArray(allocation.spendLimit),
            usdcDenom,
          );
          const allowList = allocation.allowList?.length
            ? ` to ${allocation.allowList.join(", ")}`
            : " to any channel";
          return `${limits}${allowList}`;
        });
        description = `Permission to transfer tokens via IBC with the following limits: ${formattedLimits.join("; ")}`;
        break;
      }
      case AuthorizationTypes.Stake: {
        const allowedValidators = (
          decodedGrant.data as StakeAuthorization
        ).allowList?.address?.join(", ");
        const deniedValidators = (
          decodedGrant.data as StakeAuthorization
        ).denyList?.address?.join(", ");
        const maxTokens = formatXionAmount(
          (decodedGrant.data as StakeAuthorization)?.maxTokens?.amount ?? "",
          (decodedGrant.data as StakeAuthorization)?.maxTokens?.denom ?? "",
        );
        description = `Permission to stake tokens ${
          allowedValidators
            ? `with allowed validators: ${allowedValidators}`
            : "without specified validators"
        } ${
          deniedValidators
            ? `, denying validators: ${deniedValidators}`
            : "without denied validators"
        } and max tokens: ${maxTokens}`;
        break;
      }
      case AuthorizationTypes.ContractExecution: {
        description = "Permission to execute smart contracts";
        (decodedGrant.data as HumanContractExecAuth)?.grants.map((grant) => {
          if (grant.address === account) {
            throw new Error("Misconfigured treasury contract");
          }
          contracts.push(grant.address);
        });
        break;
      }
      default:
        description = `Unknown Authorization Type: ${decodedGrant.type}`;
    }

    return {
      authorizationDescription: description,
      dappDescription: decodedGrant.dappDescription,
      contracts,
    };
  });
}
