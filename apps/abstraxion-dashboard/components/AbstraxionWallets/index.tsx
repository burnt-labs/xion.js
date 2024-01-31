import { useContext, useEffect, useState } from "react";
import {
  WalletType,
  getKeplr,
  useAccount,
  useConnect,
  useDisconnect,
} from "graz";
import { useStytch, useStytchUser } from "@stytch/nextjs";
import { useQuery } from "@apollo/client";
import { decodeJwt } from "jose";
import { Button, Spinner } from "@burnt-labs/ui";
import { testChainInfo, testnetChainInfo } from "@burnt-labs/constants";
import {
  AbstraxionContext,
  AbstraxionContextProps,
} from "../AbstraxionContext";
import { AllSmartWalletQuery, SingleSmartWalletQuery } from "@/utils/queries";
import { getHumanReadablePubkey, truncateAddress } from "@/utils";
import { useAbstraxionAccount, useAbstraxionSigningClient } from "@/hooks";
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

  const keplr = getKeplr();
  const { data: grazAccount } = useAccount();
  const { client } = useAbstraxionSigningClient();

  const { connect } = useConnect({
    onSuccess: async () => await addKeplrAuthenticator(),
  });
  const { disconnect } = useDisconnect();

  const { aud, sub } = session_jwt
    ? decodeJwt(session_jwt)
    : { aud: undefined, sub: undefined };

  // TODO: More robust
  const authenticator =
    connectionType === "graz"
      ? getHumanReadablePubkey(grazAccount?.pubKey)
      : `${Array.isArray(aud) ? aud[0] : aud}.${sub}`;

  const { loading, error, data, startPolling, stopPolling, previousData } =
    useQuery(AllSmartWalletQuery, {
      variables: {
        authenticator,
      },
      fetchPolicy: "network-only",
      notifyOnNetworkStatusChange: true,
    });
  console.log(data);

  // const { data: singleQuery } = useQuery(SingleSmartWalletQuery, {
  //   variables: {
  //     id: abstractAccount.id,
  //   },
  //   fetchPolicy: "network-only",
  //   notifyOnNetworkStatusChange: true,
  // });

  // console.log({ singleQuery });

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
    }
    disconnect();
    setConnectionType("none");
    setAbstractAccount(undefined);
  };

  const addKeplrAuthenticator = async () => {
    try {
      if (!client) {
        throw new Error("No client found.");
      }

      console.log(abstractAccount);

      const encoder = new TextEncoder();
      const signArbMessage = Buffer.from(encoder.encode(abstractAccount?.id));
      // @ts-ignore - function exists in keplr extension
      const signArbRes = await keplr.signArbitrary(
        testChainInfo.chainId,
        grazAccount?.bech32Address,
        signArbMessage,
      );

      console.log({ abstractAccount });
      console.log({ signArbMessage });
      console.log({ signArbRes });

      // const accountIndex = abstractAccount?.authenticators.nodes.length; // TODO: Be careful here, if indexer returns wrong number this can overwrite/screw up accounts

      const msg = {
        add_auth_method: {
          add_authenticator: {
            Secp256K1: {
              id: 2, // needs to be dynamic
              pubkey: signArbRes.pub_key.value,
              signature: signArbRes.signature,
            },
          },
        },
      };
      const res = await client.addAbstractAccountAuthenticator(msg, "", {
        amount: [{ amount: "0", denom: "uxion" }],
        gas: "500000",
      });

      console.log(res);
      return res;
    } catch (error) {
      console.log(
        "Something went wrong trying to add Keplr wallet as authenticator: ",
      );
      console.log(error);
    }
  };

  console.log({ abstractAccount });

  const handleJwtAALoginOrCreate = async () => {
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
      startPolling(3000);
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
                      node.id === abstractAccount?.bech32Address
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
                <>
                  <p>No Accounts Found.</p>
                </>
              )}
            </div>
          </div>
          <div className="ui-flex ui-w-full ui-flex-col ui-items-center ui-gap-4">
            <Button
              structure="naked"
              fullWidth={true}
              onClick={handleJwtAALoginOrCreate}
            >
              Create
            </Button>
            <Button
              structure="outlined"
              fullWidth={true}
              onClick={() => {
                connect({
                  chain: testChainInfo,
                  walletType: WalletType.KEPLR,
                });
              }}
            >
              Add Keplr
            </Button>
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
