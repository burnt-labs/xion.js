import { MsgGrant } from "cosmjs-types/cosmos/authz/v1beta1/tx";
import { SendAuthorization } from "cosmjs-types/cosmos/bank/v1beta1/authz";

export const generateBankGrant = (
  expiration: bigint,
  grantee: string,
  granter: string,
  bank: { denom: string; amount: string }[],
) => {
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
};
