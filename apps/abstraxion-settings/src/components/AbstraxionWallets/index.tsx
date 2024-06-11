import { useContext, useEffect, useState, useCallback } from "react";
import { useDisconnect } from "graz";
import { useStytch, useStytchUser } from "@stytch/react";
import { useQuery } from "@apollo/client";
import { Button, Spinner } from "@burnt-labs/ui";
import {
  AbstraxionContext,
  AbstraxionContextProps,
} from "../AbstraxionContext";
import { AllSmartWalletQuery } from "../../utils/queries";
import { truncateAddress } from "../../utils";
import { useAbstraxionAccount } from "../../hooks";
import { Loading } from "../Loading";
import { WalletIcon } from "../Icons";

export const AbstraxionWallets = () => {
  const {
    connectionType,
    setConnectionType,
    abstractAccount,
    setAbstractAccount,
    setAbstraxionError,
    apiUrl,
  } = useContext(AbstraxionContext) as AbstraxionContextProps;

  const { user } = useStytchUser();
  const stytchClient = useStytch();
  const session_jwt = stytchClient.session.getTokens()?.session_jwt;
  const session_token = stytchClient.session.getTokens()?.session_token;

  const { loginAuthenticator } = useAbstraxionAccount();

  const { disconnect } = useDisconnect();

  const { loading, error, data, startPolling, stopPolling, previousData } =
    useQuery(AllSmartWalletQuery, {
      variables: {
        authenticator: loginAuthenticator,
      },
      fetchPolicy: "network-only",
      notifyOnNetworkStatusChange: true,
    });

  const [isGeneratingNewWallet, setIsGeneratingNewWallet] = useState(false);
  const [fetchingNewWallets, setFetchingNewWallets] = useState(false);

  const handleDisconnect = async () => {
    if (connectionType === "stytch") {
      await stytchClient.session.revoke();
    }
    disconnect();
    setConnectionType("none");
    setAbstractAccount(undefined);
    localStorage.removeItem("loginType");
    localStorage.removeItem("loginAuthenticator");
    localStorage.removeItem("okxXionAddress");
    localStorage.removeItem("okxWalletName");
  };

  const handleJwtAALoginOrCreate = useCallback(async () => {
    try {
      setIsGeneratingNewWallet(true);
      const res = await fetch(`${apiUrl}/api/v1/jwt-accounts/create`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          salt: Date.now().toString(),
          session_jwt,
          session_token,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error);
      }
      startPolling(3000);
      setFetchingNewWallets(true);
    } catch (error) {
      console.log(error);
      setAbstraxionError("Error creating abstract account.");
    } finally {
      setIsGeneratingNewWallet(false);
    }
  }, [
    apiUrl,
    session_jwt,
    session_token,
    setIsGeneratingNewWallet,
    startPolling,
    setFetchingNewWallets,
    setAbstraxionError,
  ]);

  useEffect(() => {
    if (previousData && data !== previousData) {
      stopPolling();
      setFetchingNewWallets(false);
    }
  }, [data, previousData, stopPolling]);

  useEffect(() => {
    if (abstractAccount && previousData && data !== previousData) {
      // Updating abstract account in context on poll
      const node = data?.smartAccounts?.nodes.find(
        (smartAccount) => smartAccount.id === abstractAccount.id,
      );
      setAbstractAccount({
        ...node,
        userId: user?.user_id,
        currentAuthenticatorIndex: node.authenticators.nodes.find(
          (authenticator) => authenticator.authenticator === loginAuthenticator,
        ).authenticatorIndex,
      });
    }
  }, [
    data,
    previousData,
    abstractAccount,
    loginAuthenticator,
    setAbstractAccount,
    user?.user_id,
  ]);

  if (error) {
    setAbstraxionError("Failed to fetch accounts");
    return null;
  }

  return (
    <>
      {isGeneratingNewWallet ? (
        <Loading />
      ) : (
        <div className="ui-flex ui-h-full ui-w-full ui-flex-col ui-items-start ui-justify-between ui-gap-8 sm:ui-p-10 ui-text-white">
          <div className="ui-flex ui-flex-col ui-w-full ui-text-center">
            <h1 className="ui-font-akkuratLL ui-w-full ui-leading-[38.40px] ui-tracking-tighter ui-text-3xl ui-font-light ui-text-white ui-uppercase ui-mb-3">
              Welcome
            </h1>
            <h2 className="ui-font-akkuratLL ui-w-full ui-mb-4 ui-text-center ui-text-sm ui-font-normal ui-leading-tight ui-text-white/50">
              Choose an account to continue
            </h2>
          </div>
          <div className="ui-flex ui-w-full ui-flex-col ui-items-start ui-justify-center ui-gap-4">
            <div className="ui-text-white ui-text-base ui-font-bold ui-font-akkuratLL ui-leading-tight">
              Accounts
            </div>
            <div className="ui-flex ui-max-h-64 ui-w-full ui-flex-col ui-items-center ui-gap-4 ui-overflow-auto">
              {loading || fetchingNewWallets ? (
                <Spinner />
              ) : data?.smartAccounts?.nodes.length >= 1 ? (
                data?.smartAccounts?.nodes?.map((node: any, i: number) => (
                  <div
                    className={`ui-w-full ui-items-center ui-gap-4 ui-rounded-lg ui-p-6 ui-flex ui-bg-transparent hover:ui-cursor-pointer ui-border-[1px] ui-border-white hover:ui-bg-white/5 ${
                      node.id === abstractAccount?.id
                        ? ""
                        : "ui-border-opacity-30"
                    }`}
                    key={i}
                    onClick={() => {
                      setAbstractAccount({
                        ...node,
                        userId: user?.user_id,
                        currentAuthenticatorIndex:
                          node.authenticators.nodes.find(
                            (authenticator) =>
                              authenticator.authenticator ===
                              loginAuthenticator,
                          ).authenticatorIndex,
                      });
                    }}
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
                <>
                  <p>No Accounts Found.</p>
                  {connectionType !== "stytch" ? (
                    <p className="ui-text-center ui-text-neutral-400">
                      This authenticator can only be used as a backup right now.
                      Please log in with email to create an account.
                    </p>
                  ) : null}
                </>
              )}
            </div>
          </div>
          <div className="ui-flex ui-w-full ui-flex-col ui-items-center ui-gap-4">
            {!fetchingNewWallets &&
            data?.smartAccounts?.nodes.length < 1 &&
            connectionType === "stytch" ? (
              <Button
                structure="outlined"
                fullWidth={true}
                onClick={handleJwtAALoginOrCreate}
              >
                Create your first account now!
              </Button>
            ) : null}
            <Button
              structure="destructive-outline"
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
