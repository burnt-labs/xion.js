import { MsgGrant } from "cosmjs-types/cosmos/authz/v1beta1/tx";
import { GenericAuthorization } from "cosmjs-types/cosmos/authz/v1beta1/authz";
import { MsgWithdrawDelegatorReward } from "cosmjs-types/cosmos/distribution/v1beta1/tx";
import {
  AuthorizationType,
  StakeAuthorization,
} from "cosmjs-types/cosmos/staking/v1beta1/authz";
import {
  AllowedMsgAllowance,
  BasicAllowance,
} from "cosmjs-types/cosmos/feegrant/v1beta1/feegrant";
import { MsgGrantAllowance } from "cosmjs-types/cosmos/feegrant/v1beta1/tx";

export const generateStakeGrant = (
  expiration: bigint,
  grantee: string,
  granter: string,
): Array<{
  typeUrl: string;
  value: MsgGrant | MsgGrantAllowance;
}> => {
  const feeGrant = {
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
              StakeAuthorization.typeUrl,
              MsgWithdrawDelegatorReward.typeUrl,
            ],
          }),
        ).finish(),
      },
      grantee,
      granter,
    }),
  };

  // Need to grant MsgWithdrawDelegatorReward
  const genericMsgGrant = {
    typeUrl: MsgGrant.typeUrl,
    value: MsgGrant.fromPartial({
      grant: {
        authorization: {
          typeUrl: GenericAuthorization.typeUrl,
          value: GenericAuthorization.encode(
            GenericAuthorization.fromPartial({
              msg: MsgWithdrawDelegatorReward.typeUrl,
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

  const grants = [
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

  return [...grants, genericMsgGrant, feeGrant];
};
