import { useCallback, useContext, useEffect, useState } from "react";
import { useDisconnect } from "graz";
import { useStytch, useStytchUser } from "@stytch/nextjs";
import { useQuery } from "@apollo/client";
import { AccountWalletLogo, Button, Spinner } from "@burnt-labs/ui";
import { decodeJwt } from "jose";
import type {
  AbstraxionContextProps} from "../AbstraxionContext";
import {
  AbstraxionContext
} from "../AbstraxionContext";
import { useAbstraxionAccount } from "../../hooks";
import { Loading } from "../Loading";
import { truncateAddress } from "../../../utils/truncateAddress";
import { AllSmartWalletQuery } from "../../../utils/queries";

export function AbstraxionWallets() {
  const {
    connectionType,
    setConnectionType,
    abstractAccount,
    setAbstractAccount,
    setAbstraxionError,
  } = useContext(AbstraxionContext) ;

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

  if (error) {
    setAbstraxionError((error as Error).message);
    return null;
  }

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
      
    } catch (error) {
      console.log(error);
      setAbstraxionError("Error creating abstract account.");
    } finally {
      setIsGeneratingNewWallet(false);
    }
  };

  return (
    <>
      {isGeneratingNewWallet ? (
        <Loading />
      ) : (
        <div className="ui-flex ui-h-full ui-w-full ui-flex-col ui-items-start ui-justify-between ui-gap-8 ui-p-10 ui-text-white">
          <div className="ui-flex ui-flex-col ui-w-full ui-text-center">
            <h1 className="ui-w-full ui-tracking-tighter ui-text-3xl ui-font-bold ui-text-white ui-uppercase ui-mb-3">
              Welcome
            </h1>
            <h2 className="ui-w-full ui-tracking-tighter ui-text-sm ui-mb-4 ui-text-neutral-500">
              Select an account to continue
            </h2>
          </div>
          {connectionType === "graz" ? (
            <div className="ui-flex ui-w-full ui-items-center ui-gap-4 ui-rounded-lg ui-p-4 ui-bg-transparent ui-border-2 ui-border-white hover:ui-cursor-pointer">
              <AccountWalletLogo />
              <div className="ui-flex ui-flex-col ui-gap-1">
                <h1 className="ui-text-sm ui-font-bold">{account.name}</h1>
                <h2 className="ui-text-xs text-zinc-300">
                  {truncateAddress(account.bech32Address)}
                </h2>
              </div>
            </div>
          ) : (
            <div className="ui-flex ui-w-full ui-flex-col ui-items-start ui-justify-center ui-gap-4">
              <div className="ui-font-bold ui-tracking-tighter">Accounts</div>
              <div className="ui-flex ui-max-h-64 ui-w-full ui-flex-col ui-items-center ui-gap-4 ui-overflow-scroll">
                {loading || fetchingNewWallets ? (
                  <Spinner />
                ) : data?.smartAccounts.nodes.length >= 1 ? (
                  data?.smartAccounts?.nodes?.map((node: any, i: number) => (
                    <div
                      className={`ui-w-full ui-items-center ui-gap-4 ui-rounded-lg ui-p-4 ui-flex ui-bg-transparent hover:ui-cursor-pointer ${
                        node.id === abstractAccount?.id
                          ? "ui-border-2 ui-border-white"
                          : ""
                      }`}
                      key={i}
                      onClick={() =>
                        setAbstractAccount({ ...node, userId: user?.user_id })
                      }
                    >
                      <AccountWalletLogo />
                      <div className="ui-flex ui-flex-col ui-gap-1">
                        <h1 className="ui-text-sm ui-font-bold">
                          Personal Account {i + 1}
                        </h1>
                        <h2 className="ui-text-xs text-zinc-300">
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
                  onClick={async () => {
                    await handleJwtAALoginOrCreate(session_jwt, session_token);
                  }}
                  structure="naked"
                >
                  Create a new account
                </Button>
              </div>
            </div>
          )}
          <div className="ui-flex ui-w-full ui-flex-col ui-items-center ui-gap-4">
            {connectionType === "stytch" &&
              user &&
              user.webauthn_registrations.length < 1 ? <Button
                  fullWidth
                  onClick={registerWebAuthn}
                  structure="outlined"
                >
                  Add Passkey/Biometrics
                </Button> : null}
            <Button
              fullWidth
              onClick={handleDisconnect}
              structure="outlined"
            >
              Disconnect
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
