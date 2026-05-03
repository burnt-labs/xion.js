import { GenericAuthorization } from "cosmjs-types/cosmos/authz/v1beta1/authz";
import { SendAuthorization } from "cosmjs-types/cosmos/bank/v1beta1/authz";
import { StakeAuthorization } from "cosmjs-types/cosmos/staking/v1beta1/authz";
import { TransferAuthorization } from "cosmjs-types/ibc/applications/transfer/v1/authz";
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
 * Typed result from grant comparison, differentiating decode errors from missing/mismatched grants.
 */
export type GrantComparisonResult =
  | { match: true }
  | {
      match: false;
      reason: "grant_missing" | "grant_mismatch" | "decode_error";
      detail: string;
    };

/**
 * Compare two Uint8Array values for byte-level equality.
 */
export function bytesEqual(
  a: Uint8Array | undefined,
  b: Uint8Array | undefined,
): boolean {
  if (a === undefined || b === undefined) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

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
 * Type guard to check if data is TransferAuthorization (IBC transfer)
 */
function isTransferAuthorization(
  data: DecodedReadableAuthorization["data"],
): data is TransferAuthorization {
  return (
    data !== null &&
    typeof data === "object" &&
    "allocations" in data &&
    Array.isArray((data as TransferAuthorization).allocations)
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
          return bytesEqual(msg, chainMsg);
        });
        if (!messagesMatch) {
          return false;
        }
      } else if (treasuryGrant.rawFilterTypeUrl) {
        // Unknown filter type — fall back to raw byte comparison
        if (
          treasuryGrant.rawFilterTypeUrl !== chainGrant.rawFilterTypeUrl ||
          !bytesEqual(treasuryGrant.rawFilterValue, chainGrant.rawFilterValue)
        ) {
          return false;
        }
      } else if (chainGrant.filterType || chainGrant.rawFilterTypeUrl) {
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
          // Unknown limit type — fall back to raw byte comparison.
          // If both sides carry the same unrecognized typeUrl and identical
          // encoded bytes, the limits match regardless of whether we can decode them.
          return (
            treasuryGrant.rawLimitTypeUrl !== undefined &&
            treasuryGrant.rawLimitTypeUrl ===
              matchingChainGrant.rawLimitTypeUrl &&
            bytesEqual(
              treasuryGrant.rawLimitValue,
              matchingChainGrant.rawLimitValue,
            )
          );
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
 * @returns {GrantComparisonResult} - Typed result differentiating match, missing, mismatch, and decode errors.
 */
export function compareChainGrantsToTreasuryGrants(
  decodedChainConfigs: DecodedReadableAuthorization[],
  decodedTreasuryConfigs: DecodedReadableAuthorization[],
): GrantComparisonResult {
  for (const treasuryConfig of decodedTreasuryConfigs) {
    // Detect decode errors — if either side decoded as Unsupported, it's a decode issue
    if (treasuryConfig.type === AuthorizationTypes.Unsupported) {
      return {
        match: false,
        reason: "decode_error",
        detail: `Treasury grant decoded as Unsupported`,
      };
    }

    const matchingChain = decodedChainConfigs.find((chainConfig) => {
      if (chainConfig.type === AuthorizationTypes.Unsupported) {
        return false; // Will be caught below as decode_error if no other match
      }

      const isTypeMatch = chainConfig.type === treasuryConfig.type;
      if (!isTypeMatch) return false;

      const chainAuthType = chainConfig.type;

      if (chainAuthType === AuthorizationTypes.Generic) {
        if (
          !isGenericAuthorization(chainConfig.data) ||
          !isGenericAuthorization(treasuryConfig.data)
        ) {
          return false;
        }
        return chainConfig.data.msg === treasuryConfig.data.msg;
      }

      if (chainAuthType === AuthorizationTypes.Send) {
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

      if (chainAuthType === AuthorizationTypes.IbcTransfer) {
        if (
          !isTransferAuthorization(chainConfig.data) ||
          !isTransferAuthorization(treasuryConfig.data)
        ) {
          return false;
        }

        const treasuryAllocs = treasuryConfig.data.allocations;
        const chainAllocs = chainConfig.data.allocations;

        // Each treasury allocation must have a corresponding chain allocation
        // with the same port/channel/allowList and a spendLimit that does not
        // exceed the treasury's authorized spend limit (per-denom).
        return treasuryAllocs.every((treasuryAlloc) => {
          const matching = chainAllocs.find(
            (chainAlloc) =>
              chainAlloc.sourcePort === treasuryAlloc.sourcePort &&
              chainAlloc.sourceChannel === treasuryAlloc.sourceChannel &&
              JSON.stringify(chainAlloc.allowList) ===
                JSON.stringify(treasuryAlloc.allowList) &&
              isLimitValid(treasuryAlloc.spendLimit, chainAlloc.spendLimit),
          );
          return matching !== undefined;
        });
      }

      return false;
    });

    if (!matchingChain) {
      // Check if any chain config has Unsupported type (decode error)
      const hasDecodeError = decodedChainConfigs.some(
        (c) => c.type === AuthorizationTypes.Unsupported,
      );
      if (hasDecodeError) {
        return {
          match: false,
          reason: "decode_error",
          detail: `Chain grant decoded as Unsupported for expected type ${treasuryConfig.type}`,
        };
      }

      // Check if the type exists but doesn't match (mismatch vs missing)
      const sameTypeExists = decodedChainConfigs.some(
        (c) => c.type === treasuryConfig.type,
      );
      return {
        match: false,
        reason: sameTypeExists ? "grant_mismatch" : "grant_missing",
        detail: `Treasury expects ${treasuryConfig.type}`,
      };
    }
  }

  return { match: true };
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
