import type {
  ContractGrantDescription,
  Grant,
  GrantAuthorization,
  GrantsResponse,
  SpendLimit,
} from "@/types";
import type { DecodeAuthorizationResponse } from "@/types";
import { decodeAuthorization } from "@/utils/grant/decoding";

/**
 * Generic function that validates if a chain limit is less than or equal to an expected limit.
 * This is used to validate that on-chain limits have not increased beyond what was authorized.
 *
 * @template T - Type with denom and amount properties
 * @param {T[] | undefined} expectedLimit - The expected limit from the decoded authorization
 * @param {T[]} chainLimit - The actual limit from the chain
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
 * @param {DecodeAuthorizationResponse | null} treasuryAuth - The decoded authorization from treasury
 *        containing contract grants with their limits and filters
 * @param {DecodeAuthorizationResponse | null} chainAuth - The decoded on-chain authorization to validate against, containing
 *        grants with their respective limits and filters
 * @returns {boolean} Returns true if all contract execution authorizations match,
 *         false if any discrepancy is found
 */
const validateContractExecution = (
  treasuryAuth: DecodeAuthorizationResponse | null,
  chainAuth: DecodeAuthorizationResponse | null,
): boolean => {
  const treasuryGrants = treasuryAuth?.contracts || [];
  const chainGrants = chainAuth?.contracts || [];

  console.log("treasuryAuth: ", treasuryAuth);
  console.log("chainAuth: ", chainAuth);

  return treasuryGrants.every((treasuryGrant) => {
    const matchingChainGrants = chainGrants.filter((chainGrant) => {
      console.log(chainGrant.contract, treasuryGrant.contract);
      // Basic contract match
      if (chainGrant.contract !== treasuryGrant.contract) {
        return false;
      }

      // Filter validation
      if (treasuryGrant.filter) {
        if (!chainGrant.filter) {
          return false;
        }

        // Check type URL
        if (chainGrant.filter.typeUrl !== treasuryGrant.filter.typeUrl) {
          return false;
        }

        // Check keys array
        const decodedTreasuryKeys = treasuryGrant.filter.keys || [];
        const decodedChainKeys = chainGrant.filter.keys || [];
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
        const decodedTreasuryMessages = treasuryGrant.filter.messages || [];
        const decodedChainMessages = chainGrant.filter.messages || [];
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
      } else if (chainGrant.filter) {
        return false;
      }

      return true;
    });

    if (matchingChainGrants.length === 0) {
      console.warn("no matching chain grants");
      return false;
    }

    const limitMatches = matchingChainGrants.some((matchingChainGrant) => {
      switch (treasuryGrant.limitType) {
        case "MaxCalls":
          return (
            matchingChainGrant.limitType === "MaxCalls" &&
            treasuryGrant.maxCalls === matchingChainGrant.maxCalls
          );

        case "MaxFunds":
          return (
            matchingChainGrant.limitType === "MaxFunds" &&
            isLimitValid(treasuryGrant.maxFunds, matchingChainGrant.maxFunds)
          );

        case "CombinedLimit":
          return (
            matchingChainGrant.limitType === "CombinedLimit" &&
            treasuryGrant.combinedLimits?.maxCalls ===
              matchingChainGrant.combinedLimits?.maxCalls &&
            isLimitValid(
              treasuryGrant.combinedLimits?.maxFunds,
              matchingChainGrant.combinedLimits?.maxFunds,
            )
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
 * @param {GrantsResponse} grantsResponse - The grants currently existing on-chain.
 * @param {any[]} treasuryGrantConfigs - The treasury grant configurations to compare against.
 * @returns {boolean} - Returns `true` if all treasury grants match chain grants; otherwise, `false`.
 */
export function compareChainGrantsToTreasuryGrants(
  grantsResponse: GrantsResponse,
  treasuryGrantConfigs: any[],
): boolean {
  return treasuryGrantConfigs.every((treasuryConfig) => {
    const decodedTreasuryAuthorization = decodeAuthorization(
      treasuryConfig.authorization.type_url,
      treasuryConfig.authorization.value,
    );

    return grantsResponse.grants.find((grant) => {
      const chainAuthType = grant.authorization.typeUrl;
      const isTypeMatch =
        chainAuthType === treasuryConfig.authorization.type_url;

      if (!isTypeMatch) return false;

      // ABCI responses come in Any type so need to be decoded just as treasury auths do
      // @TODO: If planning on supporting multiple query solutions, this will have to accomodate
      // Example. REST query returns decoded auth, but with an undesirable interface
      const decodedGrantAuthorization = decodeAuthorization(
        chainAuthType,
        grant.authorization.value,
      );

      //   @TODO: Do we want to invalidate here?
      if (!decodedGrantAuthorization) {
        return false;
      }

      if (chainAuthType === "/cosmos.authz.v1beta1.GenericAuthorization") {
        return (
          decodedGrantAuthorization.msg === decodedTreasuryAuthorization?.msg
        );
      }

      if (chainAuthType === "/cosmos.bank.v1beta1.SendAuthorization") {
        return (
          isLimitValid(
            decodedTreasuryAuthorization?.spendLimit,
            decodedGrantAuthorization.spendLimit,
          ) &&
          JSON.stringify(decodedTreasuryAuthorization?.allowList) ===
            JSON.stringify(decodedGrantAuthorization.allowList)
        );
      }

      if (chainAuthType === "/cosmos.staking.v1beta1.StakeAuthorization") {
        return (
          decodedTreasuryAuthorization?.authorizationType ===
            decodedGrantAuthorization.authorizationType &&
          decodedTreasuryAuthorization?.maxTokens ===
            decodedGrantAuthorization.maxTokens &&
          JSON.stringify(decodedTreasuryAuthorization?.allowList) ===
            JSON.stringify(decodedGrantAuthorization.allowList) &&
          JSON.stringify(decodedTreasuryAuthorization?.denyList) ===
            JSON.stringify(decodedGrantAuthorization.denyList)
        );
      }

      if (
        chainAuthType === "/cosmwasm.wasm.v1.ContractExecutionAuthorization"
      ) {
        return validateContractExecution(
          decodedTreasuryAuthorization,
          decodedGrantAuthorization,
        );
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
