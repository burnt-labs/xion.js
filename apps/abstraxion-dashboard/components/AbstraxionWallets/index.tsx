import { useContext, useEffect, useState } from "react";
import {
  getKeplr,
  useAccount,
  useDisconnect,
  useSuggestChainAndConnect,
  WalletType,
} from "graz";
import { useStytch, useStytchUser } from "@stytch/nextjs";
import { useQuery } from "@apollo/client";
import { Button, Spinner } from "@burnt-labs/ui";
import { testnetChainInfo } from "@burnt-labs/constants";
import {
  AbstraxionContext,
  AbstraxionContextProps,
} from "../AbstraxionContext";
import { AllSmartWalletQuery } from "@/utils/queries";
import { encodeHex, truncateAddress } from "@/utils";
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

  const [errorMessage, setErrorMessage] = useState("");

  const { user } = useStytchUser();
  const stytchClient = useStytch();
  const session_jwt = stytchClient.session.getTokens()?.session_jwt;
  const session_token = stytchClient.session.getTokens()?.session_token;

  const keplr = window.keplr ? getKeplr() : undefined;
  const { data: grazAccount } = useAccount();
  const { loginAuthenticator } = useAbstraxionAccount();
  const { client } = useAbstraxionSigningClient();

  const { suggestAndConnect } = useSuggestChainAndConnect({
    onSuccess: async () => await addKeplrAuthenticator(),
  });
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

  useEffect(() => {
    if (previousData && data !== previousData) {
      stopPolling();
      setFetchingNewWallets(false);
    }
  }, [data, previousData]);

  useEffect(() => {
    if (abstractAccount && previousData && data !== previousData) {
      // Updating abstract account in context on poll
      setAbstractAccount(
        data?.smartAccounts?.nodes.find(
          (smartAccount) => smartAccount.id === abstractAccount.id,
        ),
      );
    }
  }, [data, previousData]);

  const handleDisconnect = async () => {
    if (connectionType === "stytch") {
      await stytchClient.session.revoke();
    }
    disconnect();
    setConnectionType("none");
    setAbstractAccount(undefined);
    localStorage.removeItem("loginType");
    localStorage.removeItem("loginAuthenticator");
  };

  const addKeplrAuthenticator = async () => {
    setErrorMessage("");
    try {
      if (!client) {
        throw new Error("No client found.");
      }

      setFetchingNewWallets(true);

      const encoder = new TextEncoder();
      const signArbMessage = Buffer.from(encoder.encode(abstractAccount?.id));
      // @ts-ignore - function exists in keplr extension
      const signArbRes = await keplr.signArbitrary(
        testnetChainInfo.chainId,
        grazAccount?.bech32Address,
        signArbMessage,
      );

      const accountIndex = abstractAccount?.authenticators.nodes.length; // TODO: Be careful here, if indexer returns wrong number this can overwrite accounts

      const msg = {
        add_auth_method: {
          add_authenticator: {
            Secp256K1: {
              id: accountIndex,
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

      if (res.rawLog?.includes("failed")) {
        throw new Error(res.rawLog);
      }

      startPolling(3000);
      return res;
    } catch (error) {
      setErrorMessage(
        "Something went wrong trying to add Keplr wallet as authenticator",
      );
      setFetchingNewWallets(false);
      stopPolling();
    }
  };

  async function addEthAuthenticator() {
    if (!window.ethereum) {
      alert("Please install the Metamask wallet extension");
      return;
    }
    try {
      if (!client) {
        throw new Error("No client found.");
      }

      setFetchingNewWallets(true);

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const primaryAccount = accounts[0];

      const encoder = new TextEncoder();
      const ten = encodeHex(Buffer.from(encoder.encode(abstractAccount?.id)));

      const ethSignature = await window.ethereum.request({
        method: "personal_sign",
        params: [ten, primaryAccount],
      });

      const byteArray = new Uint8Array(
        ethSignature.match(/[\da-f]{2}/gi).map((hex) => parseInt(hex, 16)),
      );
      const base64String = btoa(String.fromCharCode.apply(null, byteArray));

      const accountIndex = abstractAccount?.authenticators.nodes.length; // TODO: Be careful here, if indexer returns wrong number this can overwrite accounts

      const msg = {
        add_auth_method: {
          add_authenticator: {
            EthWallet: {
              id: accountIndex,
              address: primaryAccount,
              signature: base64String,
            },
          },
        },
      };

      const res = await client.addAbstractAccountAuthenticator(msg, "", {
        amount: [{ amount: "0", denom: "uxion" }],
        gas: "500000",
      });

      if (res?.rawLog?.includes("failed")) {
        throw new Error("Transaction failed");
      }

      startPolling(3000);
      return res;
    } catch (error) {
      setErrorMessage(
        "Something went wrong trying to add Ethereum wallet as authenticator",
      );
      setFetchingNewWallets(false);
      stopPolling();
    }
  }

  const handleJwtAALoginOrCreate = async () => {
    try {
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
            {errorMessage ? (
              <h2 className="ui-w-full ui-mb-4 ui-text-center ui-text-sm ui-font-normal ui-leading-tight ui-text-red-500">
                {errorMessage}
              </h2>
            ) : (
              <h2 className="ui-w-full ui-mb-4 ui-text-center ui-text-sm ui-font-normal ui-leading-tight ui-text-white/50">
                Select an account to continue
              </h2>
            )}
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
                structure="naked"
                fullWidth={true}
                onClick={handleJwtAALoginOrCreate}
              >
                Create
              </Button>
            ) : null}
            {!fetchingNewWallets &&
            abstractAccount &&
            abstractAccount.authenticators.nodes.length < 3 ? (
              <>
                <Button
                  structure="outlined"
                  fullWidth={true}
                  onClick={() => {
                    if (!window.keplr) {
                      alert("Please install the Keplr wallet extension");
                      return;
                    }
                    suggestAndConnect({
                      chainInfo: testnetChainInfo,
                      walletType: WalletType.KEPLR,
                    });
                  }}
                >
                  Add Keplr Authenticator
                </Button>
                <Button
                  structure="outlined"
                  fullWidth={true}
                  onClick={() => {
                    addEthAuthenticator();
                  }}
                >
                  Add Eth Authenticator
                </Button>
              </>
            ) : null}
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
