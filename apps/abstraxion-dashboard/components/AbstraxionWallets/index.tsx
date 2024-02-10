import { useCallback, useContext, useEffect, useState } from "react";
import { useDisconnect } from "graz";
import { useStytch, useStytchUser } from "@stytch/nextjs";
import { useQuery } from "@apollo/client";
import { decodeJwt } from "jose";
import { AccountWalletLogo, Button, Spinner } from "@burnt-labs/ui";
import {
  AbstraxionContext,
  AbstraxionContextProps,
} from "../AbstraxionContext";
import { AllSmartWalletQuery } from "@/utils/queries";
import { truncateAddress } from "@/utils";
import { useAbstraxionAccount } from "@/hooks";
import { Loading } from "../Loading";
import { WalletIcon } from "../Icons";

export const AbstraxionWallets = () => {
  const {
    connectionType,
    setConnectionType,
    abstractAccount,
    setAbstractAccount,
    setAbstraxionError,
  } = useContext(AbstraxionContext) as AbstraxionContextProps;

  const { user } = useStytchUser();
  const stytchClient = useStytch();
  const session_jwt = stytchClient.session.getTokens()?.session_jwt;
  const session_token = stytchClient.session.getTokens()?.session_token;

  const { aud, sub } = decodeJwt(session_jwt || "");

  const { disconnect } = useDisconnect();
  const { data: account } = useAbstraxionAccount();
  const { loading, error, data, startPolling, stopPolling, previousData } =
    useQuery(AllSmartWalletQuery, {
      variables: {
        authenticator: `${Array.isArray(aud) ? aud[0] : aud}.${sub}`,
      },
      fetchPolicy: "network-only",
      notifyOnNetworkStatusChange: true,
    });

  const [isGeneratingNewWallet, setIsGeneratingNewWallet] = useState(false);
  const [fetchingNewWallets, setFetchingNewWallets] = useState(false);

  useEffect(() => {
    if (previousData && data !== previousData) {
      stopPolling();
      setFetchingNewWallets(false);
    }
  }, [data, previousData]);

  const handleDisconnect = async () => {
    if (connectionType === "stytch") {
      await stytchClient.session.revoke();
    } else if (connectionType === "graz") {
      disconnect();
    }

    setConnectionType("none");
    setAbstractAccount(undefined);
  };

  const handleJwtAALoginOrCreate = async (
    session_jwt?: string,
    session_token?: string,
  ) => {
    try {
      if (!session_jwt || !session_token) {
        throw new Error("Missing token/jwt");
      }
      setIsGeneratingNewWallet(true);
      const res = await fetch(
        "https://aa.xion-testnet-1.burnt.com/api/v1/jwt-accounts/create",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            salt: Date.now().toString(),
            session_jwt,
            session_token,
          }),
        },
      );
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error);
      }
      startPolling(500);
      setFetchingNewWallets(true);
      return;
    } catch (error) {
      console.log(error);
      setAbstraxionError("Error creating abstract account.");
    } finally {
      setIsGeneratingNewWallet(false);
    }
  };

  if (error) {
    setAbstraxionError((error as Error).message);
    return null;
  }

  return (
    <>
      {isGeneratingNewWallet ? (
        <Loading />
      ) : (
        <div className="ui-flex ui-h-full ui-w-full ui-flex-col ui-items-start ui-justify-between ui-gap-8 ui-p-10 ui-text-white">
          <div className="ui-flex ui-flex-col ui-w-full ui-text-center">
            <h1 className="ui-w-full ui-leading-[38.40px] ui-tracking-tighter ui-text-3xl ui-font-light ui-text-white ui-uppercase ui-mb-3">
              Welcome
            </h1>
            <h2 className="ui-w-full ui-mb-4 ui-text-center ui-text-sm ui-font-normal ui-leading-tight ui-text-white/50">
              Select an account to continue
            </h2>
          </div>
          {connectionType === "graz" ? (
            <div className="ui-flex ui-w-full ui-items-center ui-gap-4 ui-rounded-lg ui-p-4 ui-bg-transparent ui-border-2 ui-border-white hover:ui-cursor-pointer">
              <AccountWalletLogo />
              <div className="ui-flex ui-flex-col ui-gap-1">
                <h1 className="ui-text-sm ui-font-bold">{account?.name}</h1>
                <h2 className="ui-text-xs text-zinc-300">
                  {truncateAddress(account?.bech32Address)}
                </h2>
              </div>
            </div>
          ) : (
            <div className="ui-flex ui-w-full ui-flex-col ui-items-start ui-justify-center ui-gap-4">
              <div className="ui-text-white ui-text-base ui-font-bold ui-font-akkuratLL ui-leading-tight">
                Accounts
              </div>
              <div className="ui-flex ui-max-h-64 ui-w-full ui-flex-col ui-items-center ui-gap-4 ui-overflow-auto">
                {loading || fetchingNewWallets ? (
                  <Spinner />
                ) : data?.smartAccounts.nodes.length >= 1 ? (
                  data?.smartAccounts?.nodes?.map((node: any, i: number) => (
                    <div
                      className={`ui-w-full ui-items-center ui-gap-4 ui-rounded-lg ui-p-6 ui-flex ui-bg-transparent hover:ui-cursor-pointer ui-border-[1px] ui-border-white hover:ui-bg-white/5 ${
                        node.id === abstractAccount?.id
                          ? ""
                          : "ui-border-opacity-50"
                      }`}
                      key={i}
                      onClick={() =>
                        setAbstractAccount({ ...node, userId: user?.user_id })
                      }
                    >
                      <WalletIcon color="white" backgroundColor="#363635" />
                      <div className="ui-flex ui-flex-col ui-gap-1">
                        <h1 className="ui-text-sm ui-font-bold ui-font-akkuratLL ui-leading-none">
                          Personal Account {i + 1}
                        </h1>
                        <h2 className="ui-text-xs ui-text-neutral-400 ui-font-akkuratLL ui-leading-tight">
                          {truncateAddress(node.id)}
                        </h2>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>No Accounts Found.</p>
                )}
              </div>
              <div className="ui-w-full ui-flex ui-justify-center">
                <Button
                  structure="naked"
                  onClick={async () => {
                    await handleJwtAALoginOrCreate(session_jwt, session_token);
                  }}
                >
                  Create a new account
                </Button>
              </div>
            </div>
          )}
          <div className="ui-flex ui-w-full ui-flex-col ui-items-center ui-gap-4">
            <Button
              structure="outlined"
              fullWidth={true}
              onClick={handleDisconnect}
            >
              Disconnect
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
