"use client";
import { useState, useEffect } from "react";
import { gql, useQuery } from "@apollo/client";
import { Button } from "@burnt-labs/ui";
import {
  AAClient,
  AADirectSigner,
  AAPasskeySigner,
  GasPrice,
} from "@burnt-labs/signers";
import { create } from "@github/webauthn-json/browser-ponyfill";
import "@burnt-labs/ui/dist/index.css";

const RPC_URL = "https://testnet-rpc.xion-api.com:443";
const CHAIN_ID = "xion-testnet-1";
const DEFAULT_INDEXER_URL =
  "https://api.subquery.network/sq/burnt-labs/xion-indexer-webauthn";
const RP_URL =
  "https://xion-js-demo-app-git-feat-webauthn-2-burntfinance.vercel.app";
const RP_ID = "xion-js-demo-app-git-feat-webauthn-2-burntfinance.vercel.app";

const SMART_ACCOUNT_FRAGMENT = gql`
  fragment SmartAccountFragment on SmartAccountAuthenticator {
    id
    type
    authenticator
    authenticatorIndex
    version
  }
`;

const AllSmartWalletQuery = gql`
  ${SMART_ACCOUNT_FRAGMENT}
  query ($authenticator: String!) {
    smartAccounts(
      filter: {
        authenticators: { some: { authenticator: { equalTo: $authenticator } } }
      }
    ) {
      nodes {
        id
        authenticators {
          nodes {
            ...SmartAccountFragment
          }
        }
      }
    }
  }
`;

function truncateAddress(address: string | undefined) {
  if (!address) {
    return "";
  }
  return (
    address.slice(0, 8) +
    "..." +
    address.slice(address.length - 4, address.length)
  );
}

function findLowestMissingOrNextIndex(authenticators?: any[]): number {
  if (!authenticators) {
    throw new Error("Missing authenticators");
  }

  const indexSet = new Set(
    authenticators.map((authenticator) => authenticator.authenticatorIndex),
  );

  for (let i = 0; i <= indexSet.size; i++) {
    if (!indexSet.has(i)) {
      return i;
    }
  }

  return indexSet.size;
}

function getHumanReadablePubkey(pubkey: Uint8Array | undefined) {
  if (!pubkey) {
    return "";
  }
  const pubUint8Array = new Uint8Array(Object.values(pubkey));
  const pubBase64 = btoa(String.fromCharCode.apply(null, pubUint8Array));
  return pubBase64;
}

function convertToStandardBase64(urlSafeBase64) {
  let base64 = urlSafeBase64.replace(/-/g, "+");
  base64 = base64.replace(/_/g, "/");
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  return base64;
}

export default function Page(): JSX.Element {
  const [isConnected, setIsConnected] = useState(false);
  const [loginAuthenticator, setLoginAuthenticator] = useState("");
  const [pubkeyId, setPubkeyId] = useState("");
  const [abstractAccount, setAbstractAccount] = useState<any>();
  const [isLoading, setIsLoading] = useState(false);

  const { loading, error, data } = useQuery(AllSmartWalletQuery, {
    variables: {
      authenticator: loginAuthenticator,
    },
    fetchPolicy: "network-only",
    notifyOnNetworkStatusChange: true,
  });

  async function handleConnectOkx() {
    if (!window.okxwallet) {
      alert("Please install the OKX wallet extension");
      return;
    }

    try {
      await window.okxwallet.keplr.enable(CHAIN_ID);
      const okxAccount = await window.okxwallet.keplr.getKey(CHAIN_ID);
      const authenticator = getHumanReadablePubkey(okxAccount.pubKey);
      setLoginAuthenticator(authenticator);
      localStorage.setItem("loginAuthenticator", authenticator);
      localStorage.setItem("okxXionAddress", okxAccount.bech32Address);
      localStorage.setItem("okxWalletName", okxAccount.name);
      setIsConnected(true);
    } catch (error) {
      console.warn("OKX wallet connect error");
    }
  }

  async function okxSignArb(
    chainId: string,
    account: string,
    signBytes: Uint8Array,
  ) {
    if (!window.okxwallet) {
      alert("Please install the OKX wallet extension");
      return;
    }
    await window.okxwallet.keplr.enable(CHAIN_ID);
    const signDataNew = Uint8Array.from(Object.values(signBytes));
    return window.okxwallet.keplr.signArbitrary(chainId, account, signDataNew);
  }

  async function getOkxSigner() {
    const okxOfflineSigner =
      await window.okxwallet.keplr.getOfflineSigner(CHAIN_ID);
    const signer = new AADirectSigner(
      okxOfflineSigner,
      abstractAccount?.id,
      abstractAccount?.currentAuthenticatorIndex,
      okxSignArb,
      DEFAULT_INDEXER_URL,
    );

    const abstractClient = await AAClient.connectWithSigner(RPC_URL, signer, {
      gasPrice: GasPrice.fromString("0uxion"),
    });

    return abstractClient;
  }

  async function getPasskeySigner() {
    const signer = new AAPasskeySigner(
      abstractAccount?.id,
      pubkeyId,
      abstractAccount?.currentAuthenticatorIndex,
      DEFAULT_INDEXER_URL,
    );

    const abstractClient = await AAClient.connectWithSigner(RPC_URL, signer, {
      gasPrice: GasPrice.fromString("0uxion"),
    });

    return abstractClient;
  }

  function getTimestampInSeconds(date: Date | null): number {
    if (!date) return 0;
    const d = new Date(date);
    return Math.floor(d.getTime() / 1000);
  }

  const now = new Date();
  now.setSeconds(now.getSeconds() + 15);
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  async function claimSeat(): Promise<void> {
    setIsLoading(true);
    const msg = {
      sales: {
        claim_item: {
          token_id: String(getTimestampInSeconds(now)),
          owner: abstractAccount.id,
          token_uri: "",
          extension: {},
        },
      },
    };

    const seatContractAddress =
      "xion1z70cvc08qv5764zeg3dykcyymj5z6nu4sqr7x8vl4zjef2gyp69s9mmdka";
    try {
      const client = await getPasskeySigner();
      const claimRes = await client?.execute(
        abstractAccount.id,
        seatContractAddress,
        msg,
        {
          amount: [{ amount: "0", denom: "uxion" }],
          gas: "500000",
        },
        "",
        [],
      );

      console.log(claimRes);
    } catch (error) {
      // eslint-disable-next-line no-console -- No UI exists yet to display errors
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  }

  const getWebauthn = async () => {
    try {
      let credential = await navigator.credentials.get({
        publicKey: {
          allowCredentials: JSON.parse(
            localStorage.getItem("xion-passkeys") || "[]",
          ),
          userVerification: "required",
          challenge: new Uint8Array([139, 66, 181, 87, 7, 203]), // Random for now
        },
      });

      if (!credential) {
        throw new Error("Error getting webauthn credentials");
      }

      console.log(credential);
      setPubkeyId(credential.id);
      setLoginAuthenticator(convertToStandardBase64(credential.id));
      setIsConnected(true);
    } catch (error) {
      console.log(error);
    }
  };

  const addWebauthnAuthenticator = async () => {
    try {
      setIsLoading(true);
      const encoder = new TextEncoder();

      console.log("account address: ", abstractAccount?.id);
      const challenge = Buffer.from(abstractAccount?.id);
      const challengeBase64 = Buffer.from(abstractAccount?.id).toString(
        "base64",
      );

      console.log("challenge: ", challenge);
      console.log("challengeBase64: ", challengeBase64);

      const options: CredentialCreationOptions = {
        publicKey: {
          rp: {
            name: RP_URL,
          },
          user: {
            name: abstractAccount.id,
            displayName: abstractAccount.id,
            id: challenge,
          },
          pubKeyCredParams: [{ type: "public-key", alg: -7 }],
          challenge,
          authenticatorSelection: { userVerification: "preferred" },
          timeout: 300000, // 5 minutes,
          excludeCredentials: [],
        },
      };

      console.log("options: ", options);

      // What happens on a failed addAuthenticator tx, do we just delete the registered browser key or just leave it and let them try again?

      const publicKeyCredential = await create(options);
      if (publicKeyCredential === null) {
        console.log("null credential");
        return;
      }

      localStorage.setItem(
        "xion-passkey",
        JSON.stringify([publicKeyCredential], null, " "),
      );

      // stringify the credential
      const publicKeyCredentialJSON = JSON.stringify(publicKeyCredential);

      // base64 encode it
      const base64EncodedCredential = Buffer.from(
        publicKeyCredentialJSON,
      ).toString("base64");

      console.log("publicKeyCredential: ", publicKeyCredential);
      console.log("publicKeyCredentialJSON: ", publicKeyCredentialJSON);
      console.log("base64EncodedCredential: ", base64EncodedCredential);

      const accountIndex = findLowestMissingOrNextIndex(
        abstractAccount?.authenticators.nodes,
      );

      const msg = {
        add_auth_method: {
          add_authenticator: {
            Passkey: {
              id: accountIndex,
              url: RP_URL,
              credential: base64EncodedCredential,
            },
          },
        },
      };
      const client = await getOkxSigner();
      const res = await client?.addAbstractAccountAuthenticator(msg, "", {
        amount: [{ amount: "0", denom: "uxion" }],
        gas: "500000",
      });

      if (res?.rawLog?.includes("failed")) {
        throw new Error(res.rawLog);
      }

      console.log(res);
      return res;
    } catch (error) {
      console.warn(error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderAuthenticators = () => {
    return abstractAccount?.authenticators?.nodes.map((authenticator) => {
      return (
        <p
          key={authenticator.id}
          className="font-akkuratLL text-base font-normal leading-normal text-white"
        >
          {authenticator.type.toUpperCase()}
        </p>
      );
    });
  };

  useEffect(() => {
    const handleAccountsChanged = async (accounts: any) => {
      const okxXionAddress = localStorage.getItem("okxXionAddress");
      const okxWalletName = localStorage.getItem("okxWalletName");

      // If user switches account via extension, log user out.
      // No good way to handle account switch via the OKX keplr event system
      if (
        okxXionAddress !== accounts.account.XION_TEST ||
        okxWalletName !== accounts.name
      ) {
        // Basically log out
        setAbstractAccount(undefined);
        localStorage.removeItem("loginAuthenticator");
        localStorage.removeItem("okxXionAddress");
        localStorage.removeItem("okxWalletName");
      }
    };

    if (window.okxwallet) {
      window.okxwallet?.keplr.on("connect", handleAccountsChanged);
    }

    return () => {
      window.okxwallet?.keplr.on("connect", handleAccountsChanged);
    };
  }, []);

  return (
    <main className="m-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-2xl font-bold tracking-tighter text-white">
        ABSTRAXION x WEBAUTHN
      </h1>
      {isLoading ? (
        "Loading..."
      ) : (
        <>
          {abstractAccount ? (
            <>
              <Button
                onClick={addWebauthnAuthenticator}
                fullWidth
                structure="base"
              >
                ADD WEBAUTHN AUTHENTICATOR
              </Button>
              <Button onClick={claimSeat} fullWidth structure="base">
                CLAIM SEAT WITH WEBAUTHN
              </Button>
              <div className="flex flex-col gap-1">
                {renderAuthenticators()}
              </div>
            </>
          ) : isConnected ? (
            <>
              {loading ? (
                "Loading..."
              ) : data?.smartAccounts?.nodes.length >= 1 ? (
                data?.smartAccounts?.nodes?.map((node: any, i: number) => (
                  <div
                    className={`flex w-full items-center gap-4 rounded-lg border-[1px] border-white bg-transparent p-6 hover:cursor-pointer hover:bg-white/5 ${
                      node.id === abstractAccount?.id ? "" : "border-opacity-30"
                    }`}
                    key={i}
                    onClick={() => {
                      setAbstractAccount({
                        ...node,
                        userId: "",
                        currentAuthenticatorIndex:
                          node.authenticators.nodes.find(
                            (authenticator) =>
                              authenticator.authenticator ===
                              loginAuthenticator,
                          ).authenticatorIndex,
                      });
                    }}
                  >
                    <div className="flex flex-col gap-1">
                      <h1 className="font-akkuratLL text-sm font-bold leading-none">
                        Personal Account {i + 1}
                      </h1>
                      <h2 className="font-akkuratLL text-xs leading-tight text-neutral-400">
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
            </>
          ) : (
            <>
              <Button onClick={handleConnectOkx} fullWidth structure="base">
                CONNECT WITH OKX
              </Button>
              <Button onClick={getWebauthn} fullWidth structure="base">
                WEBAUTHN GET
              </Button>
            </>
          )}
        </>
      )}
    </main>
  );
}
