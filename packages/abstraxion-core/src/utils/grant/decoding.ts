import { toByteArray } from "base64-js";
import type { Coin } from "@cosmjs/amino";
import { GenericAuthorization } from "cosmjs-types/cosmos/authz/v1beta1/authz";
import { StakeAuthorization } from "cosmjs-types/cosmos/staking/v1beta1/authz";
import { SendAuthorization } from "cosmjs-types/cosmos/bank/v1beta1/authz";
import { TransferAuthorization } from "cosmjs-types/ibc/applications/transfer/v1/authz";
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

    case AuthorizationTypes.IbcTransfer:
      return {
        type: AuthorizationTypes.IbcTransfer,
        data: TransferAuthorization.decode(processedAuthorizationValue),
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

/**
 * Reverse map from string authorization_type back to numeric enum
 */
const STAKE_AUTH_TYPE_REVERSE: Record<string, number> = {
  AUTHORIZATION_TYPE_UNSPECIFIED: 0,
  AUTHORIZATION_TYPE_DELEGATE: 1,
  AUTHORIZATION_TYPE_UNDELEGATE: 2,
  AUTHORIZATION_TYPE_REDELEGATE: 3,
};

/**
 * Converts a REST-format authorization object (as returned by fetchChainGrantsABCI
 * after the decodeAuthorizationToRestFormat step) into a DecodedReadableAuthorization.
 *
 * This is needed because fetchChainGrantsABCI decodes protobuf grants into REST JSON
 * format (with "@type", snake_case fields) for the legacy compare functions, but the
 * treasury comparison path expects DecodedReadableAuthorization (camelCase protobuf types).
 *
 * @param auth - REST-format authorization object with "@type" and decoded fields
 * @returns DecodedReadableAuthorization compatible with compareChainGrantsToTreasuryGrants
 */
export const decodeRestFormatAuthorization = (
  auth: Record<string, unknown>,
): DecodedReadableAuthorization => {
  const typeUrl = auth["@type"] as string | undefined;

  switch (typeUrl) {
    case AuthorizationTypes.Generic:
      return {
        type: AuthorizationTypes.Generic,
        data: GenericAuthorization.fromPartial({
          msg: auth.msg as string,
        }),
      };

    case AuthorizationTypes.Send: {
      const spendLimit = (
        auth.spend_limit as Array<{ denom: string; amount: string }>
      ).map((c) => ({ denom: c.denom, amount: c.amount }));
      const allowList = (auth.allow_list as string[]) || [];
      return {
        type: AuthorizationTypes.Send,
        data: SendAuthorization.fromPartial({ spendLimit, allowList }),
      };
    }

    case AuthorizationTypes.Stake: {
      const authType =
        STAKE_AUTH_TYPE_REVERSE[auth.authorization_type as string] ?? 0;
      const maxTokens = auth.max_tokens as {
        denom: string;
        amount: string;
      } | null;
      return {
        type: AuthorizationTypes.Stake,
        data: StakeAuthorization.fromPartial({
          authorizationType: authType,
          maxTokens: maxTokens
            ? { denom: maxTokens.denom, amount: maxTokens.amount }
            : undefined,
          allowList: {
            address: (auth.allow_list as string[]) || [],
          },
          denyList: {
            address: (auth.deny_list as string[]) || [],
          },
        }),
      };
    }

    case AuthorizationTypes.ContractExecution:
      // Contract execution may be raw bytes (Uint8Array) or a base64 string
      // depending on how the REST response was decoded
      if (auth.value instanceof Uint8Array) {
        return decodeAuthorization(typeUrl, auth.value);
      }
      if (typeof auth.value === "string") {
        return decodeAuthorization(typeUrl, auth.value);
      }
      // REST format with decoded JSON fields (grants array)
      if (auth.grants && Array.isArray(auth.grants)) {
        const grants = (
          auth.grants as Array<{
            contract: string;
            limit?: { "@type"?: string };
            filter?: { "@type"?: string };
          }>
        ).map((grant) => ({
          address: grant.contract,
          limitType: undefined,
          maxCalls: undefined,
          maxFunds: undefined,
          filterType: undefined,
          messages: undefined,
          keys: undefined,
        }));
        return { type: AuthorizationTypes.ContractExecution, data: { grants } };
      }
      console.warn(
        "[decodeRestFormatAuthorization] ContractExecution has unexpected format:",
        typeof auth.value,
      );
      return { type: AuthorizationTypes.Unsupported, data: null };

    default:
      return { type: AuthorizationTypes.Unsupported, data: null };
  }
};
