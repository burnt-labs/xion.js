/**
 * Permission formatting utilities for treasury contracts
 * Extracted from dashboard utils/query-treasury-contract.ts
 */

import type { Coin } from "cosmjs-types/cosmos/base/v1beta1/coin";
import { GenericAuthorization } from "cosmjs-types/cosmos/authz/v1beta1/authz";
import { StakeAuthorization } from "cosmjs-types/cosmos/staking/v1beta1/authz";
import { SendAuthorization } from "cosmjs-types/cosmos/bank/v1beta1/authz";
import { TransferAuthorization } from "cosmjs-types/ibc/applications/transfer/v1/authz";
import {
  AuthorizationTypes,
  type DecodedReadableAuthorization,
  type HumanContractExecAuth,
  formatCoinArray as formatCoinArrayCore,
  parseCoinString as parseCoinStringCore,
} from "@burnt-labs/abstraxion-core";
import type { PermissionDescription } from "../../types/treasury";

// Re-export types from abstraxion-core for backward compatibility
export type { DecodedReadableAuthorization, HumanContractExecAuth };
export { AuthorizationTypes };

export const DENOM_DECIMALS = {
  xion: 6,
  usdc: 6,
} as const;

export const DENOM_DISPLAY_MAP = {
  xion: "XION",
  usdc: "USDC",
} as const;

/**
 * Parses a coin string (e.g., "1000000uxion" or "1000000uxion,2000000usdc") into denom and amount
 * Re-exported from @burnt-labs/abstraxion-core for convenience
 */
export const parseCoinString = parseCoinStringCore;

/**
 * Formats an array of Coin objects into a comma-separated string
 * Re-exported from @burnt-labs/abstraxion-core for convenience
 */
export const formatCoinArray = formatCoinArrayCore;

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
    const contracts: (string | undefined)[] = [];

    switch (decodedGrant.type) {
      case AuthorizationTypes.Generic: {
        description = `Permission to ${
          CosmosAuthzPermission[(decodedGrant.data as GenericAuthorization).msg]
        }`;
        break;
      }
      case AuthorizationTypes.Send: {
        const sendAuth = decodedGrant.data as SendAuthorization;

        // Validate spend limits - only negative amounts are invalid (throw error)
        // Invalid/NaN amounts will be handled gracefully by formatXionAmount
        for (const limit of sendAuth.spendLimit) {
          const numAmount = Number(limit.amount);
          if (!isNaN(numAmount) && numAmount < 0) {
            throw new Error(
              `Invalid SendAuthorization: spend limit has invalid amount "${limit.amount}" for denom "${limit.denom}"`,
            );
          }
        }

        const spendLimit = sendAuth.spendLimit
          .map((limit: Coin) => formatXionAmount(limit.amount, limit.denom))
          .join(", ");
        const allowList = sendAuth.allowList.join(", ");
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
        const contractAuth = decodedGrant.data as HumanContractExecAuth;

        // Handle empty grants gracefully - return empty contracts array
        if (!contractAuth?.grants || contractAuth.grants.length === 0) {
          break;
        }

        // Case-insensitive comparison for bech32 addresses
        const normalizedAccount = account.toLowerCase();
        contractAuth.grants.forEach((grant) => {
          // Handle missing address gracefully - include undefined in contracts array
          if (!grant.address) {
            contracts.push(undefined);
            return;
          }

          // Still throw for critical security issue: contract address equals account
          if (grant.address.toLowerCase() === normalizedAccount) {
            throw new Error(
              `Misconfigured treasury contract: contract address "${grant.address}" cannot be the same as granter account "${account}"`,
            );
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
