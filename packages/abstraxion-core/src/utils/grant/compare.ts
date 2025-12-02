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
 * Type guard to check if data is HumanContractExecAuth
 */
function isHumanContractExecAuth(
  data: DecodedReadableAuthorization["data"],
): data is HumanContractExecAuth {
  return (
    data !== null &&
    typeof data === "object" &&
    "grants" in data &&
    Array.isArray((data as HumanContractExecAuth).grants)
  );
}

/**
 * Type guard to check if data is SendAuthorization
 */
function isSendAuthorization(
  data: DecodedReadableAuthorization["data"],
): data is SendAuthorization {
  return (
    data !== null &&
    typeof data === "object" &&
    "spendLimit" in data &&
    Array.isArray((data as SendAuthorization).spendLimit)
  );
}

/**
 * Type guard to check if data is StakeAuthorization
 */
function isStakeAuthorization(
  data: DecodedReadableAuthorization["data"],
): data is StakeAuthorization {
  return (
    data !== null &&
    typeof data === "object" &&
    "authorizationType" in data &&
    typeof (data as StakeAuthorization).authorizationType === "number"
  );
}

/**
 * Type guard to check if data is GenericAuthorization
 */
function isGenericAuthorization(
  data: DecodedReadableAuthorization["data"],
): data is GenericAuthorization {
  return (
    data !== null &&
    typeof data === "object" &&
    "msg" in data &&
    typeof (data as GenericAuthorization).msg === "string"
  );
}

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
  // Use type guards for safe type narrowing
  const treasuryGrants = isHumanContractExecAuth(treasuryAuth.data)
    ? treasuryAuth.data.grants
    : [];

  const chainGrants = isHumanContractExecAuth(chainAuth.data)
    ? chainAuth.data.grants
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
  return decodedTreasuryConfigs.every((treasuryConfig) => {
    return decodedChainConfigs.find((chainConfig) => {
      const chainAuthType = chainConfig.type;
      const isTypeMatch = chainAuthType === treasuryConfig.type;

      if (!isTypeMatch) return false;

      if (chainAuthType === AuthorizationTypes.Generic) {
        // Use type guards for safe type narrowing
        if (
          !isGenericAuthorization(chainConfig.data) ||
          !isGenericAuthorization(treasuryConfig.data)
        ) {
          return false;
        }
        return chainConfig.data.msg === treasuryConfig.data.msg;
      }

      if (chainAuthType === AuthorizationTypes.Send) {
        // Use type guards for safe type narrowing
        if (
          !isSendAuthorization(chainConfig.data) ||
          !isSendAuthorization(treasuryConfig.data)
        ) {
          return false;
        }
        return (
          isLimitValid(
            treasuryConfig.data.spendLimit,
            chainConfig.data.spendLimit,
          ) &&
          JSON.stringify(treasuryConfig.data.allowList) ===
            JSON.stringify(chainConfig.data.allowList)
        );
      }

      if (chainAuthType === AuthorizationTypes.Stake) {
        // Use type guards for safe type narrowing
        if (
          !isStakeAuthorization(chainConfig.data) ||
          !isStakeAuthorization(treasuryConfig.data)
        ) {
          return false;
        }

        const treasuryStakeAuth = treasuryConfig.data;
        const grantStakeAuth = chainConfig.data;

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
  if (!grantContracts) {
    return true;
  }
  const contractGrants = grants.filter(
    (grant) =>
      grant.authorization["@type"] ===
      "/cosmwasm.wasm.v1.ContractExecutionAuthorization",
  );

  return grantContracts.every((contract) => {
    const address = typeof contract === "string" ? contract : contract.address;
    const amounts = typeof contract === "object" ? contract.amounts : [];

    const matchingGrants = contractGrants.filter((grant) =>
      grant.authorization.grants.some(
        (grant: GrantAuthorization) => grant.contract === address,
      ),
    );

    if (!matchingGrants.length) return false;

    return amounts.length
      ? matchingGrants.some((grant) =>
          grant.authorization.grants.some(
            (authGrant: GrantAuthorization) =>
              authGrant.limit.amounts &&
              isLimitValid(amounts, authGrant.limit.amounts),
          ),
        )
      : true;
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
  if (!stake) {
    return true;
  }

  const stakeGrants = grants.filter((grant) =>
    [
      "/cosmos.staking.v1beta1.StakeAuthorization",
      "/cosmos.authz.v1beta1.GenericAuthorization",
    ].includes(grant.authorization["@type"]),
  );

  const expectedStakeTypes = [
    "AUTHORIZATION_TYPE_DELEGATE",
    "AUTHORIZATION_TYPE_UNDELEGATE",
    "AUTHORIZATION_TYPE_REDELEGATE",
    "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward",
    "/cosmos.staking.v1beta1.MsgCancelUnbondingDelegation",
  ];

  const stakeTypesGranted = stakeGrants.map((grant) => {
    if (
      grant.authorization["@type"] ===
      "/cosmos.staking.v1beta1.StakeAuthorization"
    ) {
      return grant.authorization.authorization_type;
    } else if (
      grant.authorization["@type"] ===
      "/cosmos.authz.v1beta1.GenericAuthorization"
    ) {
      return grant.authorization.msg;
    }
  });

  return expectedStakeTypes.every((type) => stakeTypesGranted.includes(type));
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
  if (!bank) {
    return true;
  }

  const bankGrants = grants.filter(
    (grant) =>
      grant.authorization["@type"] === "/cosmos.bank.v1beta1.SendAuthorization",
  );

  return bank?.every((bankEntry) =>
    bankGrants.some((grant) =>
      isLimitValid([bankEntry], grant.authorization.spend_limit),
    ),
  );
};
