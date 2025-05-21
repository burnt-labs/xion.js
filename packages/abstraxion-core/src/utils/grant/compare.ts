import { GenericAuthorization } from "cosmjs-types/cosmos/authz/v1beta1/authz";
import { SendAuthorization } from "cosmjs-types/cosmos/bank/v1beta1/authz";
import { StakeAuthorization } from "cosmjs-types/cosmos/staking/v1beta1/authz";
import {
  type ContractGrantDescription,
  type Grant,
  type GrantAuthorization,
  type HumanContractExecAuth,
  type SpendLimit,
} from "@/types";
import type { DecodedReadableAuthorization } from "@/types";
import {
  AuthorizationTypes,
  ContractExecLimitTypes,
} from "@/utils/grant/constants";

/**
 * Generic function that validates if a chain limit is less than or equal to an expected limit.
 * This is used to validate that on-chain limits have not increased beyond what was authorized.
 *
 * @template T - Type with denom and amount properties
 * @param {T[] | undefined} expectedLimit - The expected limit from the decoded authorization
 * @param {T[] | undefined} chainLimit - The actual limit from the chain
 * @returns {boolean} - Returns true if the chain limit is less than or equal to the expected limit
 */
export const isLimitValid = <T extends { denom: string; amount: string }>(
  expectedLimit: T[] | undefined,
  chainLimit: T[] | undefined,
): boolean => {
  if (!expectedLimit || !chainLimit) return false; // Check for undefined chainLimit

  // Create a map of denom -> amount from the expected limit
  const expectedLimits = new Map<string, bigint>();
  for (const item of expectedLimit) {
    expectedLimits.set(item.denom, BigInt(item.amount));
  }

  // Check each chain limit against the expected limit
  for (const item of chainLimit) {
    const expectedAmount = expectedLimits.get(item.denom);
    if (expectedAmount === undefined) return false; // Unexpected denom

    // Chain amount should be less than or equal to expected amount
    if (BigInt(item.amount) > expectedAmount) return false;
  }

  return true;
};

/**
 * Validates that decoded contract execution authorizations match the on-chain authorizations.
 * @param {DecodeAuthorizationResponse} treasuryAuth - The decoded authorization from treasury
 *        containing contract grants with their limits and filters
 * @param {DecodeAuthorizationResponse} chainAuth - The decoded on-chain authorization to validate against, containing
 *        grants with their respective limits and filters
 * @returns {boolean} Returns true if all contract execution authorizations match,
 *         false if any discrepancy is found
 */
export const validateContractExecution = (
  treasuryAuth: DecodedReadableAuthorization,
  chainAuth: DecodedReadableAuthorization,
): boolean => {
  // Safe way to make sure type assertion doesn't break things
  const treasuryGrants =
    treasuryAuth &&
    treasuryAuth.data &&
    (treasuryAuth.data as HumanContractExecAuth).grants
      ? (treasuryAuth.data as HumanContractExecAuth).grants
      : [];

  const chainGrants =
    chainAuth &&
    chainAuth.data &&
    (chainAuth.data as HumanContractExecAuth).grants
      ? (chainAuth.data as HumanContractExecAuth).grants
      : [];

  return treasuryGrants.every((treasuryGrant) => {
    const matchingChainGrants = chainGrants.filter((chainGrant) => {
      // Basic contract match
      if (chainGrant.address !== treasuryGrant.address) {
        return false;
      }

      // Filter validation
      if (treasuryGrant.filterType) {
        if (!chainGrant.filterType) {
          return false;
        }

        // Check filter type URL
        if (chainGrant.filterType !== treasuryGrant.filterType) {
          return false;
        }

        // Check keys array
        const decodedTreasuryKeys = treasuryGrant.keys || [];
        const decodedChainKeys = chainGrant.keys || [];
        if (decodedTreasuryKeys.length !== decodedChainKeys.length) {
          return false;
        }
        if (
          !decodedTreasuryKeys.every(
            (key, index) => key === decodedChainKeys[index],
          )
        ) {
          return false;
        }

        // Check messages array
        const decodedTreasuryMessages: Uint8Array[] =
          treasuryGrant.messages || [];
        const decodedChainMessages: Uint8Array[] = chainGrant.messages || [];
        if (decodedTreasuryMessages.length !== decodedChainMessages.length) {
          return false;
        }

        // Compare messages byte by byte
        const messagesMatch = decodedTreasuryMessages.every((msg, index) => {
          const chainMsg = decodedChainMessages[index];
          if (msg.length !== chainMsg.length) {
            return false;
          }
          for (let i = 0; i < msg.length; i++) {
            if (msg[i] !== chainMsg[i]) {
              return false;
            }
          }
          return true;
        });
        if (!messagesMatch) {
          return false;
        }
      } else if (chainGrant.filterType) {
        return false;
      }

      return true;
    });

    if (matchingChainGrants.length === 0) {
      return false;
    }

    const limitMatches = matchingChainGrants.some((matchingChainGrant) => {
      switch (treasuryGrant.limitType) {
        case ContractExecLimitTypes.MaxCalls:
          return (
            matchingChainGrant.limitType === ContractExecLimitTypes.MaxCalls &&
            Number(matchingChainGrant.maxCalls) <=
              Number(treasuryGrant.maxCalls)
          );

        case ContractExecLimitTypes.MaxFunds:
          return (
            matchingChainGrant.limitType === ContractExecLimitTypes.MaxFunds &&
            isLimitValid(treasuryGrant.maxFunds, matchingChainGrant.maxFunds)
          );

        case ContractExecLimitTypes.CombinedLimit:
          return (
            matchingChainGrant.limitType ===
              ContractExecLimitTypes.CombinedLimit &&
            Number(matchingChainGrant?.maxCalls) <=
              Number(treasuryGrant?.maxCalls) &&
            isLimitValid(treasuryGrant?.maxFunds, matchingChainGrant?.maxFunds)
          );

        default:
          return false;
      }
    });

    return limitMatches;
  });
};

/**
 * Compares treasury grant configurations with the grants on-chain to ensure they match.
 *
 * @param {DecodedReadableAuthorization[]} decodedChainConfigs - The decoded grants currently existing on-chain.
 * @param {DecodedReadableAuthorization[]} decodedTreasuryConfigs - The decoded treasury grant configurations to compare against.
 * @returns {boolean} - Returns `true` if all treasury grants match chain grants; otherwise, `false`.
 */
export function compareChainGrantsToTreasuryGrants(
  decodedChainConfigs: DecodedReadableAuthorization[],
  decodedTreasuryConfigs: DecodedReadableAuthorization[],
): boolean {
  // Number of grants must match
  if (decodedChainConfigs.length !== decodedTreasuryConfigs.length) {
    return false;
  }

  return decodedTreasuryConfigs.every((treasuryConfig) => {
    // For each treasury config, find an exactly matching chain config
    return decodedChainConfigs.some((chainConfig) => {
      const chainAuthType = chainConfig.type;
      const isTypeMatch = chainAuthType === treasuryConfig.type;

      if (!isTypeMatch) return false;

      if (chainAuthType === AuthorizationTypes.Generic) {
        return (
          (chainConfig.data as GenericAuthorization).msg ===
          (treasuryConfig.data as GenericAuthorization)?.msg
        );
      }

      if (chainAuthType === AuthorizationTypes.Send) {
        return (
          isLimitValid(
            (treasuryConfig.data as SendAuthorization).spendLimit,
            (chainConfig.data as SendAuthorization).spendLimit,
          ) &&
          JSON.stringify(
            (treasuryConfig.data as SendAuthorization).allowList,
          ) ===
            JSON.stringify((chainConfig.data as SendAuthorization).allowList)
        );
      }

      if (chainAuthType === AuthorizationTypes.Stake) {
        const treasuryStakeAuth = treasuryConfig.data as StakeAuthorization;
        const grantStakeAuth = chainConfig.data as StakeAuthorization;

        return (
          treasuryStakeAuth.authorizationType ===
            grantStakeAuth.authorizationType &&
          treasuryStakeAuth.maxTokens === grantStakeAuth.maxTokens &&
          JSON.stringify(treasuryStakeAuth.allowList) ===
            JSON.stringify(grantStakeAuth.allowList) &&
          JSON.stringify(treasuryStakeAuth.denyList) ===
            JSON.stringify(grantStakeAuth.denyList)
        );
      }

      if (chainAuthType === AuthorizationTypes.ContractExecution) {
        return validateContractExecution(treasuryConfig, chainConfig);
      }

      return false;
    });
  });
}

//   =============================== Legacy Config Utils ============================

// Helper function to count specific types of grants
const countGrantsOfType = (grants: Grant[], typeUrl: string): number => {
  return grants.filter(grant => grant.authorization["@type"] === typeUrl).length;
};

/**
 * Compares on-chain contract grants to ensure they match the specified grant contracts.
 *
 * @param {Grant[]} grants - The list of on-chain grants to compare.
 * @param {ContractGrantDescription[]} [grantContracts] - The optional list of contract grant descriptions to compare against.
 * @returns {boolean} - Returns `true` if all specified contract grants match; otherwise, `false`.
 */
export const compareContractGrants = (
  grants: Grant[],
  grantContracts?: ContractGrantDescription[],
): boolean => {
  const onChainContractGrants = grants.filter(
    (grant) =>
      grant.authorization["@type"] ===
      "/cosmwasm.wasm.v1.ContractExecutionAuthorization",
  );

  // If grantContracts is not provided or empty, there should be no on-chain contract grants of this type.
  if (!grantContracts || grantContracts.length === 0) {
    return onChainContractGrants.length === 0;
  }

  // Number of on-chain contract grants must match the number of configured grantContracts.
  if (onChainContractGrants.length !== grantContracts.length) {
    return false;
  }

  // Every configured contract grant must find an exact match on-chain.
  return grantContracts.every((contractConfig) => {
    const address = typeof contractConfig === "string" ? contractConfig : contractConfig.address;
    const amounts = typeof contractConfig === "object" ? contractConfig.amounts : [];

    return onChainContractGrants.some((chainGrant) => {
      // Check if any of the authorization grants within the chainGrant match the configured contract.
      return chainGrant.authorization.grants.some(
        (authGrant: GrantAuthorization) => {
          if (authGrant.contract !== address) {
            return false;
          }
          // If amounts are configured, they must be valid against the chain grant's limit.
          if (amounts.length > 0) {
            return authGrant.limit?.amounts && isLimitValid(amounts, authGrant.limit.amounts);
          }
          // If no amounts are configured, the presence of the contract grant is enough.
          return true;
        }
      );
    });
  });
};

/**
 * Compares on-chain stake grants to ensure the expected stake types are granted.
 *
 * @param {Grant[]} grants - The list of on-chain grants to compare.
 * @param {boolean} [stake] - A flag indicating whether to check for stake grants.
 * @returns {boolean} - Returns `true` if the expected stake types are granted; otherwise, `false`.
 */
export const compareStakeGrants = (
  grants: Grant[],
  stake?: boolean,
): boolean => {
  const genericAuthType = "/cosmos.authz.v1beta1.GenericAuthorization";
  const stakeAuthType = "/cosmos.staking.v1beta1.StakeAuthorization";

  const onChainStakeAuthGrants = grants.filter(
    (grant) => grant.authorization["@type"] === stakeAuthType,
  );
  const onChainGenericStakeGrants = grants.filter(
    (grant) =>
      grant.authorization["@type"] === genericAuthType &&
      (grant.authorization.msg === "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward" ||
        grant.authorization.msg === "/cosmos.staking.v1beta1.MsgCancelUnbondingDelegation"),
  );

  if (!stake) {
    // If stake is not configured, there should be no stake-related grants on-chain.
    return onChainStakeAuthGrants.length === 0 && onChainGenericStakeGrants.length === 0;
  }

  const expectedStakeAuthTypes = [
    "AUTHORIZATION_TYPE_DELEGATE",
    "AUTHORIZATION_TYPE_UNDELEGATE",
    "AUTHORIZATION_TYPE_REDELEGATE",
  ];
  const expectedGenericStakeMsgTypes = [
    "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward",
    "/cosmos.staking.v1beta1.MsgCancelUnbondingDelegation",
  ];

  // Check StakeAuthorization grants
  if (onChainStakeAuthGrants.length !== expectedStakeAuthTypes.length) {
    return false;
  }
  const actualStakeAuthTypes = onChainStakeAuthGrants.map(g => g.authorization.authorization_type).sort();
  if (!expectedStakeAuthTypes.every(expectedType => actualStakeAuthTypes.includes(expectedType))) {
    return false;
  }

  // Check GenericAuthorization grants for staking related messages
  if (onChainGenericStakeGrants.length !== expectedGenericStakeMsgTypes.length) {
    return false;
  }
  const actualGenericStakeMsgTypes = onChainGenericStakeGrants.map(g => g.authorization.msg).sort();
  if (!expectedGenericStakeMsgTypes.every(expectedType => actualGenericStakeMsgTypes.includes(expectedType))) {
    return false;
  }

  return true;
};

/**
 * Compares on-chain bank grants to ensure the specified bank spend limits are granted.
 *
 * @param {Grant[]} grants - The list of on-chain grants to compare.
 * @param {SpendLimit[]} [bank] - The optional list of spend limits to check against.
 * @returns {boolean} - Returns `true` if all specified bank grants match; otherwise, `false`.
 */
export const compareBankGrants = (
  grants: Grant[],
  bank?: SpendLimit[],
): boolean => {
  const sendAuthType = "/cosmos.bank.v1beta1.SendAuthorization";
  const onChainBankGrants = grants.filter(
    (grant) => grant.authorization["@type"] === sendAuthType,
  );

  // If bank is not configured or empty, there should be no on-chain bank grants of this type.
  if (!bank || bank.length === 0) {
    return onChainBankGrants.length === 0;
  }

  // Number of on-chain bank grants must match the number of configured bank SpendLimits.
  if (onChainBankGrants.length !== bank.length) {
    return false;
  }

  // Every configured bank SpendLimit must find an exact match on-chain.
  return bank.every((bankEntry) =>
    onChainBankGrants.some((chainGrant) =>
      // Ensure the spend_limit array in chainGrant matches the bankEntry.
      // isLimitValid expects arrays, so we wrap bankEntry.
      // For an exact match, the spend_limit arrays should be of the same length
      // and each element in bankEntry should be validated by an element in spend_limit.
      // A stricter check might involve ensuring spend_limit has only one entry matching bankEntry if bankEntry itself is a single limit.
      // For now, we use isLimitValid which checks if chain limits are <= expected.
      // To be more strict, we should check for equality in amounts and denoms.
      // Let's refine isLimitValid or add a new helper for exact limit matching if needed.
      // For now, assuming isLimitValid is sufficient if the lengths also match.
      chainGrant.authorization.spend_limit &&
      chainGrant.authorization.spend_limit.length === 1 && // Assuming each bank SpendLimit config corresponds to one spend_limit entry in a grant
      isLimitValid([bankEntry], chainGrant.authorization.spend_limit) &&
      // Add a check for exact amount match, as isLimitValid checks for <=
      chainGrant.authorization.spend_limit[0].denom === bankEntry.denom &&
      chainGrant.authorization.spend_limit[0].amount === bankEntry.amount
    )
  );
};
