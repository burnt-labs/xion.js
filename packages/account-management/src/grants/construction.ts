/**
 * Grant message construction utilities
 * Builds grant messages from treasury contracts or manual configurations
 */

import { EncodeObject } from "@cosmjs/proto-signing";
import { MsgGrant } from "cosmjs-types/cosmos/authz/v1beta1/tx";
import { MsgGrantAllowance } from "cosmjs-types/cosmos/feegrant/v1beta1/tx";
import { SendAuthorization } from "cosmjs-types/cosmos/bank/v1beta1/authz";
import {
  AllowAllMessagesFilter,
  CombinedLimit,
  ContractExecutionAuthorization,
  MaxCallsLimit,
} from "cosmjs-types/cosmwasm/wasm/v1/authz";
import { GenericAuthorization } from "cosmjs-types/cosmos/authz/v1beta1/authz";
import { MsgExec } from "cosmjs-types/cosmos/authz/v1beta1/tx";
import {
  AllowedMsgAllowance,
  BasicAllowance,
} from "cosmjs-types/cosmos/feegrant/v1beta1/feegrant";
import {
  AuthorizationType,
  StakeAuthorization,
} from "cosmjs-types/cosmos/staking/v1beta1/authz";
import { MsgWithdrawDelegatorReward } from "cosmjs-types/cosmos/distribution/v1beta1/tx";
import {
  MsgCancelUnbondingDelegation,
  MsgDelegate,
  MsgUndelegate,
} from "cosmjs-types/cosmos/staking/v1beta1/tx";
import { MsgVote } from "cosmjs-types/cosmos/gov/v1beta1/tx";
import { MsgSubmitProposal } from "cosmjs-types/cosmos/gov/v1/tx";
import type { ContractGrantDescription, SpendLimit } from "../types/grants";
import type { GrantConfigByTypeUrl, TreasuryStrategy } from "../types/treasury";

/**
 * Construct a single authz grant message from treasury grant config
 * Uses the raw authorization value (base64-encoded protobuf) from the treasury
 */
function constructTreasuryGrantMessage(
  grantConfig: GrantConfigByTypeUrl,
  granter: string,
  grantee: string,
  expiration: bigint,
): EncodeObject {
  // Convert base64 authorization value to Uint8Array
  const authorizationByteArray = new Uint8Array(
    Buffer.from(grantConfig.authorization.value, "base64"),
  );

  const authorization = {
    typeUrl: grantConfig.authorization.type_url,
    value: authorizationByteArray,
  };

  return {
    typeUrl: MsgGrant.typeUrl,
    value: MsgGrant.fromPartial({
      grant: {
        authorization,
        expiration: {
          seconds: expiration,
          nanos: 0,
        },
      },
      grantee,
      granter,
    }),
  };
}

/**
 * Generate authz grant messages from treasury contract using strategy
 *
 * @param contractAddress - The address for the deployed treasury contract instance
 * @param client - Client to query RPC (must have queryContractSmart method)
 * @param granter - The granter address (smart account)
 * @param grantee - The grantee address (temp keypair or user wallet)
 * @param strategy - Treasury strategy to use for fetching configs
 * @param expiration - Grant expiration timestamp (default: 3 months from now)
 * @returns Array of authz grant messages to pass into transaction
 */
export async function generateTreasuryGrants(
  contractAddress: string,
  client: any, // AAClient from @burnt-labs/signers
  granter: string,
  grantee: string,
  strategy: TreasuryStrategy,
  expiration?: bigint,
): Promise<EncodeObject[]> {
  if (!contractAddress) {
    throw new Error("Missing contract address");
  }

  if (!client) {
    throw new Error("Missing client");
  }

  if (!granter) {
    throw new Error("Missing granter address");
  }

  if (!grantee) {
    throw new Error("Missing grantee address");
  }

  if (!strategy) {
    throw new Error("Missing treasury strategy");
  }

  // Default expiration: 3 months from now
  const expirationTime =
    expiration ||
    BigInt(
      Math.floor(
        new Date(new Date().setMonth(new Date().getMonth() + 3)).getTime() /
          1000,
      ),
    );

  // Fetch treasury configuration using strategy
  const treasuryConfig = await strategy.fetchTreasuryConfig(
    contractAddress,
    client,
  );

  if (!treasuryConfig) {
    throw new Error(
      "Something went wrong querying the treasury contract for grants",
    );
  }

  if (
    !treasuryConfig.grantConfigs ||
    treasuryConfig.grantConfigs.length === 0
  ) {
    throw new Error("No grant configs found in treasury contract");
  }

  // Build grant messages from raw authorization values
  const grantMessages = treasuryConfig.grantConfigs.map((grantConfig) => {
    return constructTreasuryGrantMessage(
      grantConfig,
      granter,
      grantee,
      expirationTime,
    );
  });

  return grantMessages;
}

/**
 * Generate bank (send) authorization grant
 */
export function generateBankGrant(
  expiration: bigint,
  grantee: string,
  granter: string,
  bank: SpendLimit[],
): EncodeObject {
  return {
    typeUrl: MsgGrant.typeUrl,
    value: MsgGrant.fromPartial({
      grant: {
        authorization: {
          typeUrl: SendAuthorization.typeUrl,
          value: SendAuthorization.encode(
            SendAuthorization.fromPartial({
              spendLimit: bank,
            }),
          ).finish(),
        },
        expiration: {
          seconds: expiration,
        },
      },
      grantee,
      granter,
    }),
  };
}

/**
 * Generate contract execution authorization grant
 */
export function generateContractGrant(
  expiration: bigint,
  grantee: string,
  granter: string,
  contracts: ContractGrantDescription[],
): EncodeObject {
  const validGrants = contracts.filter((contractGrantDescription) => {
    if (typeof contractGrantDescription === "string") {
      return true;
    }
    if (contractGrantDescription != null) {
      const { address, amounts } = contractGrantDescription;
      return address && amounts;
    }
    console.warn("Contract was omitted because it was improperly encoded");
    return false;
  });

  const contractExecutionAuthorizationValue =
    ContractExecutionAuthorization.encode(
      ContractExecutionAuthorization.fromPartial({
        grants: validGrants.map((contractGrantDescription) => {
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
}

/**
 * Generate stake and governance authorization grants with fee grant
 * Based on dashboard's generateStakeAndGovGrant
 */
export function generateStakeAndGovGrant(
  expiration: bigint,
  grantee: string,
  granter: string,
): EncodeObject[] {
  // Fee grant with allowed messages for staking and governance
  const feeGrantMsg = {
    typeUrl: MsgGrantAllowance.typeUrl,
    value: MsgGrantAllowance.fromPartial({
      allowance: {
        typeUrl: AllowedMsgAllowance.typeUrl,
        value: AllowedMsgAllowance.encode(
          AllowedMsgAllowance.fromPartial({
            allowance: {
              typeUrl: BasicAllowance.typeUrl,
              value: BasicAllowance.encode(
                BasicAllowance.fromPartial({
                  spendLimit: [],
                  expiration: {
                    seconds: expiration,
                  },
                }),
              ).finish(),
            },
            allowedMessages: [
              MsgWithdrawDelegatorReward.typeUrl,
              MsgDelegate.typeUrl,
              MsgUndelegate.typeUrl,
              MsgExec.typeUrl,
              MsgCancelUnbondingDelegation.typeUrl,
              MsgVote.typeUrl,
            ],
          }),
        ).finish(),
      },
      grantee,
      granter,
    }),
  };

  // Generic authorizations for specific staking/gov messages
  const genericMsgGrants = [
    MsgWithdrawDelegatorReward.typeUrl,
    MsgCancelUnbondingDelegation.typeUrl,
    MsgVote.typeUrl,
    MsgSubmitProposal.typeUrl,
  ].map((msg) => ({
    typeUrl: MsgGrant.typeUrl,
    value: MsgGrant.fromPartial({
      grant: {
        authorization: {
          typeUrl: GenericAuthorization.typeUrl,
          value: GenericAuthorization.encode(
            GenericAuthorization.fromPartial({
              msg,
            }),
          ).finish(),
        },
        expiration: {
          seconds: expiration,
        },
      },
      grantee,
      granter,
    }),
  }));

  // Stake authorizations for delegate, undelegate, redelegate
  const stakeGrants = [
    AuthorizationType.AUTHORIZATION_TYPE_DELEGATE,
    AuthorizationType.AUTHORIZATION_TYPE_UNDELEGATE,
    AuthorizationType.AUTHORIZATION_TYPE_REDELEGATE,
  ].map((authorizationType) => ({
    typeUrl: MsgGrant.typeUrl,
    value: MsgGrant.fromPartial({
      grant: {
        authorization: {
          typeUrl: StakeAuthorization.typeUrl,
          value: StakeAuthorization.encode(
            StakeAuthorization.fromPartial({
              authorizationType,
            }),
          ).finish(),
        },
        expiration: {
          seconds: expiration,
        },
      },
      grantee,
      granter,
    }),
  }));

  return [...stakeGrants, ...genericMsgGrants, feeGrantMsg];
}

/**
 * Build all grant messages based on user configuration
 */
export function buildGrantMessages(params: {
  granter: string;
  grantee: string;
  expiration: bigint;
  contracts?: ContractGrantDescription[];
  bank?: SpendLimit[];
  stake?: boolean;
}): EncodeObject[] {
  const { granter, grantee, expiration, contracts, bank, stake } = params;

  const messages: EncodeObject[] = [];

  // Add contract grants
  if (contracts && contracts.length > 0) {
    messages.push(
      generateContractGrant(expiration, grantee, granter, contracts),
    );
  }

  // Add bank grants
  if (bank && bank.length > 0) {
    messages.push(generateBankGrant(expiration, grantee, granter, bank));
  }

  // Add stake + governance grants
  if (stake) {
    messages.push(...generateStakeAndGovGrant(expiration, grantee, granter));
  }

  return messages;
}
