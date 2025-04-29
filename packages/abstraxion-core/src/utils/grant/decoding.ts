import { toByteArray } from "base64-js";
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
import { DecodeAuthorizationResponse } from "@/types";
import { formatCoinArray } from ".";

// @TODO: Lock into a returned interface because dev portal uses something very similar, except dev portal sticks to cosmjs as much as possible
// I like dev portal approach better so refactor codebase as needed
// Also take user dash into consideration
/**
 * Decodes an authorization value based on its type.
 *
 * @param {string} typeUrl - The type URL of the authorization (e.g., `/cosmos.bank.v1beta1.SendAuthorization`).
 * @param {string | Uint8Array} value - The base64-encoded authorization value to decode, which can be a string or a Uint8Array.
 * @returns {DecodeAuthorizationResponse | null} - Returns an object containing decoded authorization fields or `null` if decoding fails.
 */
export const decodeAuthorization = (
  typeUrl: string,
  value: string | Uint8Array,
): DecodeAuthorizationResponse | null => {
  const processedAuthorizationValue =
    typeof value === "string" ? toByteArray(value) : value;

  if (typeUrl === "/cosmos.authz.v1beta1.GenericAuthorization") {
    const authorization = GenericAuthorization.decode(
      processedAuthorizationValue,
    );
    return { msg: authorization.msg };
  }

  if (typeUrl === "/cosmos.bank.v1beta1.SendAuthorization") {
    const authorization = SendAuthorization.decode(processedAuthorizationValue);
    return {
      spendLimit: formatCoinArray(authorization.spendLimit),
      allowList: authorization.allowList,
    };
  }

  if (typeUrl === "/cosmos.staking.v1beta1.StakeAuthorization") {
    const authorization = StakeAuthorization.decode(
      processedAuthorizationValue,
    );
    return {
      authorizationType: authorization.authorizationType.toString(),
      maxTokens: authorization.maxTokens
        ? `${authorization.maxTokens.amount} ${authorization.maxTokens.denom}`
        : undefined,
      allowList: authorization.allowList?.address,
      denyList: authorization.denyList?.address,
    };
  }

  if (typeUrl === "/cosmwasm.wasm.v1.ContractExecutionAuthorization") {
    const authorization = ContractExecutionAuthorization.decode(
      processedAuthorizationValue,
    );

    const contracts = authorization.grants.map((grant) => {
      let limitType: string | undefined;
      let maxCalls: string | undefined;
      let maxFunds: { denom: string; amount: string }[] | undefined;
      let combinedLimits:
        | {
            maxCalls: string;
            maxFunds: { denom: string; amount: string }[];
          }
        | undefined;
      let filter = grant.filter
        ? {
            typeUrl: grant.filter.typeUrl,
            keys:
              grant.filter.typeUrl ===
              "/cosmwasm.wasm.v1.AcceptedMessageKeysFilter"
                ? AcceptedMessageKeysFilter.decode(grant.filter.value).keys
                : undefined,
            messages:
              grant.filter.typeUrl ===
              "/cosmwasm.wasm.v1.AcceptedMessagesFilter"
                ? AcceptedMessagesFilter.decode(grant.filter.value).messages
                : undefined,
          }
        : undefined;

      // Decode limit based on type_url
      switch (grant.limit?.typeUrl) {
        case "/cosmwasm.wasm.v1.MaxCallsLimit": {
          const limit = MaxCallsLimit.decode(grant.limit.value);
          limitType = "MaxCalls";
          maxCalls = String(limit.remaining);
          break;
        }
        case "/cosmwasm.wasm.v1.MaxFundsLimit": {
          const limit = MaxFundsLimit.decode(new Uint8Array(grant.limit.value));
          limitType = "MaxFunds";
          maxFunds = limit.amounts.map((coin) => ({
            denom: coin.denom,
            amount: coin.amount,
          }));
          break;
        }
        case "/cosmwasm.wasm.v1.CombinedLimit": {
          const limit = CombinedLimit.decode(new Uint8Array(grant.limit.value));
          limitType = "CombinedLimit";
          combinedLimits = {
            maxCalls: String(limit.callsRemaining),
            maxFunds: limit.amounts.map((coin) => ({
              denom: coin.denom,
              amount: coin.amount,
            })),
          };
          break;
        }
        default:
          limitType = "Unknown";
          break;
      }

      return {
        contract: grant.contract,
        limitType,
        maxCalls,
        maxFunds,
        combinedLimits,
        filter,
      };
    });

    return { contracts };
  }

  return null;
};
