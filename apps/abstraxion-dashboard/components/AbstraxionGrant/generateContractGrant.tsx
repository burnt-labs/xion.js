import type { ContractGrantDescription } from "@burnt-labs/abstraxion";
import {
  AllowAllMessagesFilter,
  CombinedLimit,
  ContractExecutionAuthorization,
  MaxCallsLimit,
} from "cosmjs-types/cosmwasm/wasm/v1/authz";
import { MsgGrant } from "cosmjs-types/cosmos/authz/v1beta1/tx";

export const generateContractGrant = (
  expiration: bigint,
  grantee: string,
  granter: string,
  contracts: ContractGrantDescription[],
) => {
  const contractExecutionAuthorizationValue =
    ContractExecutionAuthorization.encode(
      ContractExecutionAuthorization.fromPartial({
        grants: contracts.map((contractGrantDescription) => {
          if (typeof contractGrantDescription === "string") {
            const contract = contractGrantDescription;
            return {
              contract,
              limit: {
                typeUrl: MaxCallsLimit.typeUrl,
                value: MaxCallsLimit.encode(
                  MaxCallsLimit.fromPartial({
                    remaining: BigInt("255"),
                  }),
                ).finish(),
              },
              filter: {
                typeUrl: AllowAllMessagesFilter.typeUrl,
              },
            };
          }

          const { address, amounts } = contractGrantDescription;
          return {
            contract: address,
            limit: {
              typeUrl: "/cosmwasm.wasm.v1.CombinedLimit",
              value: CombinedLimit.encode(
                CombinedLimit.fromPartial({
                  callsRemaining: BigInt("255"),
                  amounts,
                }),
              ).finish(),
            },
            filter: {
              typeUrl: AllowAllMessagesFilter.typeUrl,
            },
          };
        }),
      }),
    ).finish();
  const grantValue = MsgGrant.fromPartial({
    grant: {
      authorization: {
        typeUrl: ContractExecutionAuthorization.typeUrl,
        value: contractExecutionAuthorizationValue,
      },
      expiration: {
        seconds: expiration,
      },
    },
    grantee,
    granter,
  });

  return {
    typeUrl: MsgGrant.typeUrl,
    value: grantValue,
  };
};
