import { toByteArray } from "base64-js";
import type { Coin } from "@cosmjs/amino";
import { GenericAuthorization } from "cosmjs-types/cosmos/authz/v1beta1/authz";
import { StakeAuthorization } from "cosmjs-types/cosmos/staking/v1beta1/authz";
import { SendAuthorization } from "cosmjs-types/cosmos/bank/v1beta1/authz";
import {
  AcceptedMessageKeysFilter,
  AcceptedMessagesFilter,
  CombinedLimit,
  ContractExecutionAuthorization,
  MaxCallsLimit,
  MaxFundsLimit,
} from "cosmjs-types/cosmwasm/wasm/v1/authz";
import type { DecodedReadableAuthorization } from "@/types";
import {
  AUTHORIZATION_TYPES,
  CONTRACT_EXEC_FILTER_TYPES,
  CONTRACT_EXEC_LIMIT_TYPES,
} from "@/utils/grant/constants";

/**
 * Decodes an authorization value based on its type.
 *
 * @param {string} typeUrl - The type URL of the authorization (e.g., `/cosmos.bank.v1beta1.SendAuthorization`).
 * @param {string | Uint8Array} value - The base64-encoded authorization value to decode, which can be a string or a Uint8Array.
 * @returns {DecodedReadableAuthorization} - Returns an object containing decoded authorization fields
 */
export const decodeAuthorization = (
  typeUrl: string,
  value: string | Uint8Array,
): DecodedReadableAuthorization => {
  const processedAuthorizationValue =
    typeof value === "string" ? toByteArray(value) : value;

  switch (typeUrl) {
    case AUTHORIZATION_TYPES.GENERIC:
      return {
        type: AUTHORIZATION_TYPES.GENERIC,
        data: GenericAuthorization.decode(processedAuthorizationValue),
      };

    case AUTHORIZATION_TYPES.SEND:
      return {
        type: AUTHORIZATION_TYPES.SEND,
        data: SendAuthorization.decode(processedAuthorizationValue),
      };

    case AUTHORIZATION_TYPES.STAKE:
      return {
        type: AUTHORIZATION_TYPES.STAKE,
        data: StakeAuthorization.decode(processedAuthorizationValue),
      };

    case AUTHORIZATION_TYPES.CONTRACT_EXECUTION: {
      const authorization = ContractExecutionAuthorization.decode(
        processedAuthorizationValue,
      );

      let limitType: CONTRACT_EXEC_LIMIT_TYPES | undefined;
      let maxCalls: string | undefined;
      let maxFunds: Coin[] | undefined;

      let filterType: CONTRACT_EXEC_FILTER_TYPES | undefined;
      let messages: Uint8Array[] | undefined;
      let keys: string[] | undefined;

      const grants = authorization.grants.map((grant) => {
        if (grant.limit) {
          switch (grant.limit.typeUrl) {
            case CONTRACT_EXEC_LIMIT_TYPES.MAX_CALLS:
              limitType = CONTRACT_EXEC_LIMIT_TYPES.MAX_CALLS;
              maxCalls = MaxCallsLimit.decode(
                grant.limit.value,
              ).remaining.toString();
              break;
            case CONTRACT_EXEC_LIMIT_TYPES.MAX_FUNDS:
              limitType = CONTRACT_EXEC_LIMIT_TYPES.MAX_FUNDS;
              maxFunds = MaxFundsLimit.decode(grant.limit.value).amounts;
              break;
            case CONTRACT_EXEC_LIMIT_TYPES.COMBINED_LIMIT: {
              const combined = CombinedLimit.decode(grant.limit.value);
              limitType = CONTRACT_EXEC_LIMIT_TYPES.COMBINED_LIMIT;
              maxCalls = combined.callsRemaining.toString();
              maxFunds = combined.amounts;
              break;
            }
            // @TODO: Add default error case
          }
        }

        if (grant.filter) {
          switch (grant.filter.typeUrl) {
            case CONTRACT_EXEC_FILTER_TYPES.ACCEPTED_KEYS:
              filterType = CONTRACT_EXEC_FILTER_TYPES.ACCEPTED_KEYS;
              keys = AcceptedMessageKeysFilter.decode(grant.filter.value).keys;
              break;
            case CONTRACT_EXEC_FILTER_TYPES.ACCEPTED_MESSAGES:
              filterType = CONTRACT_EXEC_FILTER_TYPES.ACCEPTED_MESSAGES;
              messages = AcceptedMessagesFilter.decode(
                grant.filter.value,
              ).messages;
              break;
            case CONTRACT_EXEC_FILTER_TYPES.ALLOW_ALL:
              filterType = CONTRACT_EXEC_FILTER_TYPES.ALLOW_ALL;
              break;
            // @TODO: Add default error case
          }
        }

        return {
          address: grant.contract,
          limitType: limitType,
          maxCalls: maxCalls || "",
          maxFunds: maxFunds || [],
          filterType: filterType,
          messages,
          keys,
        };
      });
      return { type: AUTHORIZATION_TYPES.CONTRACT_EXECUTION, data: { grants } };
    }

    default:
      return { type: AUTHORIZATION_TYPES.UNSUPPORTED, data: null };
  }
};
