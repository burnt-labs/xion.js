"use client";

import Image from "next/image";

import burntAvatar from "@/public/burntAvatarCircle.png";
import { CheckIcon } from "../Icons";
import { Button } from "@burnt-labs/ui";
import { useAbstraxionAccount, useAbstraxionSigningClient } from "@/hooks";
import { MsgGrant } from "cosmjs-types/cosmos/authz/v1beta1/tx";
import {
  ContractExecutionAuthorization,
  MaxCallsLimit,
} from "cosmjs-types/cosmwasm/wasm/v1/authz";
import { EncodeObject } from "@cosmjs/proto-signing";

interface AbstraxionGrantProps {
  permissions: string;
  grantee: string;
}

export const AbstraxionGrant = ({
  permissions,
  grantee,
}: AbstraxionGrantProps) => {
  const { client } = useAbstraxionSigningClient();
  const { data: account } = useAbstraxionAccount();

  const generateContractGrant = async () => {
    const timestampThreeMonthsFromNow = Math.floor(
      new Date(new Date().setMonth(new Date().getMonth() + 3)).getTime() / 1000,
    );
    const granter = account?.bech32Address;

    if (client && granter) {
      const contractExecutionAuthorizationValue =
        ContractExecutionAuthorization.encode(
          ContractExecutionAuthorization.fromPartial({
            grants: [
              {
                contract: permissions,
                limit: {
                  typeUrl: "/cosmwasm.wasm.v1.MaxCallsLimit",
                  value: MaxCallsLimit.encode(
                    MaxCallsLimit.fromPartial({
                      // Picking a giant number here since something like `UnlimitedCallsLimit` doesn't appear to be available
                      remaining: "4096",
                    }),
                  ).finish(),
                },
                filter: {
                  typeUrl: "/cosmwasm.wasm.v1.AllowAllMessagesFilter",
                },
              },
            ],
          }),
        ).finish();

      const grantValue = MsgGrant.fromPartial({
        grant: {
          authorization: {
            typeUrl: "/cosmwasm.wasm.v1.ContractExecutionAuthorization",
            value: contractExecutionAuthorizationValue,
          },
          expiration: {
            seconds: timestampThreeMonthsFromNow,
          },
        },
        grantee,
        granter,
      });

      return {
        typeUrl: "/cosmos.authz.v1beta1.MsgGrant",
        value: grantValue,
      };
    }
  };

  const grant = async () => {
    console.log({ client, account });
    if (!client) {
      throw new Error("no client");
    }

    if (!account) {
      throw new Error("no account");
    }

    const msg = await generateContractGrant();

    try {
      const foo = await client?.signAndBroadcast(
        account.bech32Address,
        [msg as EncodeObject],
        {
          amount: [{ amount: "0", denom: "uxion" }],
          gas: "500000",
        },
      );
      console.log(foo);
    } catch (error) {
      console.log("something went wrong: ", error);
    }
  };

  return (
    <div className="ui-flex ui-font-akkuratLL ui-flex-col ui-justify-center ui-p-12 ui-min-w-[380px] ui-text-white">
      <div className="ui-mb-10 ui-flex ui-items-center ui-justify-center">
        <Image src={burntAvatar} alt="Burnt Avatar" />
        <div className="ui-mx-6 ui-h-[1px] ui-w-10 ui-bg-white ui-opacity-20"></div>{" "}
        {/* This is the divider */}
        <div className="ui-h-16 ui-w-16 ui-bg-gray-300 ui-rounded-full"></div>
      </div>
      <div className="mb-4">
        <h1 className="ui-text-base ui-font-bold ui-leading-tight">
          A 3rd party would like to:
        </h1>
        <div className="ui-w-full ui-bg-white ui-opacity-20 ui-h-[1px] ui-mt-8" />
        <ul className="ui-my-8 ui-list-disc ui-list-none">
          <li className="ui-flex ui-items-baseline ui-text-sm ui-mb-4">
            <span className="ui-mr-2">
              <CheckIcon color="white" />
            </span>
            Have access to your account
          </li>
          <li className="ui-flex ui-items-baseline ui-text-sm">
            <span className="ui-mr-2">
              <CheckIcon color="white" />
            </span>
            View your basic profile info
          </li>
        </ul>
        <div className="ui-w-full ui-bg-white ui-opacity-20 ui-h-[1px] ui-mb-8" />
        <div className="ui-w-full ui-flex ui-flex-col ui-gap-4">
          <Button structure="base" fullWidth={true} onClick={grant}>
            Allow and Continue
          </Button>
          <Button structure="naked">Deny Access</Button>
        </div>
      </div>
    </div>
  );
};
