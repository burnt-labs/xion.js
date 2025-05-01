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
  AuthorizationTypes,
  ContractExecFilterTypes,
  ContractExecLimitTypes,
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
    case AuthorizationTypes.Generic:
      return {
        type: AuthorizationTypes.Generic,
        data: GenericAuthorization.decode(processedAuthorizationValue),
      };

    case AuthorizationTypes.Send:
      return {
        type: AuthorizationTypes.Send,
        data: SendAuthorization.decode(processedAuthorizationValue),
      };

    case AuthorizationTypes.Stake:
      return {
        type: AuthorizationTypes.Stake,
        data: StakeAuthorization.decode(processedAuthorizationValue),
      };

    case AuthorizationTypes.ContractExecution: {
      const authorization = ContractExecutionAuthorization.decode(
        processedAuthorizationValue,
      );

      let limitType: ContractExecLimitTypes | undefined;
      let maxCalls: string | undefined;
      let maxFunds: Coin[] | undefined;

      let filterType: ContractExecFilterTypes | undefined;
      let messages: Uint8Array[] | undefined;
      let keys: string[] | undefined;

      const grants = authorization.grants.map((grant) => {
        if (grant.limit) {
          switch (grant.limit.typeUrl) {
            case ContractExecLimitTypes.MaxCalls:
              limitType = ContractExecLimitTypes.MaxCalls;
              maxCalls = MaxCallsLimit.decode(
                grant.limit.value,
              ).remaining.toString();
              break;
            case ContractExecLimitTypes.MaxFunds:
              limitType = ContractExecLimitTypes.MaxFunds;
              maxFunds = MaxFundsLimit.decode(grant.limit.value).amounts;
              break;
            case ContractExecLimitTypes.CombinedLimit: {
              const combined = CombinedLimit.decode(grant.limit.value);
              limitType = ContractExecLimitTypes.CombinedLimit;
              maxCalls = combined.callsRemaining.toString();
              maxFunds = combined.amounts;
              break;
            }
          }
        }

        if (grant.filter) {
          switch (grant.filter.typeUrl) {
            case ContractExecFilterTypes.AcceptedKeys:
              filterType = ContractExecFilterTypes.AcceptedKeys;
              keys = AcceptedMessageKeysFilter.decode(grant.filter.value).keys;
              break;
            case ContractExecFilterTypes.AcceptedMessages:
              filterType = ContractExecFilterTypes.AcceptedMessages;
              messages = AcceptedMessagesFilter.decode(
                grant.filter.value,
              ).messages;
              break;
            case ContractExecFilterTypes.AllowAll:
              filterType = ContractExecFilterTypes.AllowAll;
              break;
          }
        }

        return {
          address: grant.contract,
          limitType,
          maxCalls,
          maxFunds,
          filterType,
          messages,
          keys,
        };
      });
      return { type: AuthorizationTypes.ContractExecution, data: { grants } };
    }

    default:
      return { type: AuthorizationTypes.Unsupported, data: null };
  }
};
