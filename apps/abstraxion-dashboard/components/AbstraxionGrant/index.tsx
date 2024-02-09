"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { Button, Spinner } from "@burnt-labs/ui";
import { MsgGrant } from "cosmjs-types/cosmos/authz/v1beta1/tx";
import {
  ContractExecutionAuthorization,
  MaxCallsLimit,
} from "cosmjs-types/cosmwasm/wasm/v1/authz";
import { useAbstraxionAccount, useAbstraxionSigningClient } from "@/hooks";
import burntAvatar from "@/public/burntAvatarCircle.png";
import { CheckIcon } from "../Icons";
import { EncodeObject } from "@cosmjs/proto-signing";
import { redirect, useSearchParams } from "next/navigation";

interface AbstraxionGrantProps {
  contracts: string[];
  grantee: string;
}

export const AbstraxionGrant = ({
  contracts,
  grantee,
}: AbstraxionGrantProps) => {
  const { client } = useAbstraxionSigningClient();
  const { data: account } = useAbstraxionAccount();
  const searchParams = useSearchParams();

  const [inProgress, setInProgress] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(function redirectToDapp() {
    if (showSuccess && searchParams.get("redirect_uri")) {
      let redirectUri = new URLSearchParams(window.location.search).get(
        "redirect_uri",
      );
      let url: URL | null = null;
      if (redirectUri) {
        url = new URL(redirectUri);
        let params = new URLSearchParams(url.search);

        params.append("granted", "true");
        url.search = params.toString();
        redirectUri = url.toString();
        window.location.href = redirectUri;
      }
    }
  });

  const generateContractGrant = (granter: string) => {
    const timestampThreeMonthsFromNow = Math.floor(
      new Date(new Date().setMonth(new Date().getMonth() + 3)).getTime() / 1000,
    );

    const contractExecutionAuthorizationValue =
      ContractExecutionAuthorization.encode(
        ContractExecutionAuthorization.fromPartial({
          grants: contracts.map((contractAddress) => ({
            contract: contractAddress,
            limit: {
              typeUrl: "/cosmwasm.wasm.v1.MaxCallsLimit",
              value: MaxCallsLimit.encode(
                MaxCallsLimit.fromPartial({
                  remaining: "255",
                }),
              ).finish(),
            },
            filter: {
              typeUrl: "/cosmwasm.wasm.v1.AllowAllMessagesFilter",
            },
          })),
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
  };

  const grant = async () => {
    setInProgress(true);
    if (!client) {
      throw new Error("no client");
    }

    if (!account) {
      throw new Error("no account");
    }

    const granter = account.id;
    const msg = generateContractGrant(granter);

    try {
      const foo = await client?.signAndBroadcast(
        account.id,
        [msg as EncodeObject],
        {
          amount: [{ amount: "0", denom: "uxion" }],
          gas: "500000",
        },
      );
      setShowSuccess(true);
      setInProgress(false);
    } catch (error) {
      setInProgress(false);
      console.log("something went wrong: ", error);
    }
  };

  if (inProgress) {
    return (
      <div className="ui-w-full ui-h-full ui-min-h-[500px] ui-flex ui-items-center ui-justify-center ui-text-white">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="ui-flex ui-font-akkuratLL ui-flex-col ui-justify-center ui-p-12 ui-min-w-[380px] ui-text-white">
      {showSuccess ? (
        <>
          <h1 className="ui-text-center ui-text-3xl ui-font-light ui-uppercase ui-text-white ui-mb-6">
            Your sign-in <br />
            was Successful!
          </h1>
          <p className="ui-text-center ui-text-base ui-font-normal ui-leading-normal ui-text-zinc-100 ui-opacity-50 ui-mb-6">
            Please switch back to the previous window to continue your
            experience.
          </p>
        </>
      ) : (
        <>
          <div className="ui-mb-10 ui-flex ui-items-center ui-justify-center">
            <Image src={burntAvatar} alt="Burnt Avatar" />
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
                Log you in to their app
              </li>
            </ul>
            <div className="ui-w-full ui-bg-white ui-opacity-20 ui-h-[1px] ui-mb-8" />
            <div className="ui-w-full ui-flex ui-flex-col ui-gap-4">
              <Button
                disabled={inProgress}
                structure="base"
                fullWidth={true}
                onClick={grant}
              >
                Allow and Continue
              </Button>
              <Button structure="naked">Deny Access</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
