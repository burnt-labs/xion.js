import {
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from "react";
import Image from "next/image";
import { WalletType, useAccount, useSuggestChainAndConnect } from "graz";
import { useQuery } from "@apollo/client";
import { useStytchUser } from "@stytch/nextjs";
import { create, get } from "@github/webauthn-json/browser-ponyfill";
import {
  Button,
  KeplrLogo,
  MetamaskLogo,
  PasskeyIcon,
  Spinner,
} from "@burnt-labs/ui";
import {
  AbstraxionContext,
  AbstraxionContextProps,
} from "@/components/AbstraxionContext";
import { useAbstraxionAccount, useAbstraxionSigningClient } from "@/hooks";
import { encodeHex } from "@/utils";
import { AllSmartWalletQuery } from "@/utils/queries";

// TODO: Add webauthn to this and remove "disable" prop from button when implemented
type AuthenticatorStates = "none" | "keplr" | "metamask" | "okx" | "passkey";

export function AddAuthenticatorsForm({
  setIsOpen,
}: {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}) {
  // Component specific state
  const [selectedAuthenticator, setSelectedAuthenticator] =
    useState<AuthenticatorStates>("none");

  // General UI state
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Context state
  const { abstractAccount, setAbstractAccount, chainInfo } = useContext(
    AbstraxionContext,
  ) as AbstraxionContextProps;

  // Hooks
  const { loginAuthenticator } = useAbstraxionAccount();
  const { client } = useAbstraxionSigningClient();
  const { data: grazAccount } = useAccount();
  const { user } = useStytchUser();
  const { suggestAndConnect } = useSuggestChainAndConnect({
    onSuccess: async () => await addKeplrAuthenticator(),
    onError: () => setIsLoading(false),
    onLoading: () => setIsLoading(true),
  });

  const { data, previousData, startPolling, stopPolling } = useQuery(
    AllSmartWalletQuery,
    {
      variables: {
        authenticator: loginAuthenticator,
      },
      fetchPolicy: "network-only",
      notifyOnNetworkStatusChange: true,
    },
  );

  console.log(data);

  // Stop polling upon new data and update context
  useEffect(() => {
    if (previousData && data !== previousData) {
      stopPolling();
      setIsLoading(false);
      setIsSuccess(true);
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
  }, [data, previousData]);

  // Functions
  function handleSwitch(authenticator: AuthenticatorStates) {
    setErrorMessage("");
    setSelectedAuthenticator(authenticator);
  }

  async function handleSelection() {
    setErrorMessage("");
    switch (selectedAuthenticator) {
      case "none":
        break;
      case "keplr":
        suggestAndConnect({
          chainInfo: chainInfo,
          walletType: WalletType.KEPLR,
        });
        break;
      case "metamask":
        await addEthAuthenticator();
        break;
      case "okx":
        await addOkxAuthenticator();
        break;
      case "passkey":
        await addWebauthnAuthenticator();
        break;
      default:
        break;
    }
  }

  function postAddFunction() {
    setIsLoading(true);
    startPolling(3000);
  }

  async function addKeplrAuthenticator() {
    try {
      setIsLoading(true);

      if (!client) {
        throw new Error("No client found.");
      }

      const encoder = new TextEncoder();
      const signArbMessage = Buffer.from(encoder.encode(abstractAccount?.id));
      // @ts-ignore - function exists in keplr extension
      const signArbRes = await keplr.signArbitrary(
        chainInfo.chainId,
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

      postAddFunction();
      return res;
    } catch (error) {
      setErrorMessage(
        "Something went wrong trying to add Keplr wallet as authenticator",
      );
      setIsLoading(false);
    }
  }

  async function addOkxAuthenticator() {
    try {
      if (!window.okxwallet) {
        alert("Install OKX Wallet");
        return;
      }
      setIsLoading(true);

      if (!client) {
        throw new Error("No client found.");
      }

      const encoder = new TextEncoder();
      const signArbMessage = Buffer.from(encoder.encode(abstractAccount?.id));

      await window.okxwallet.keplr.enable("xion-testnet-1");
      const okxAccount = await window.okxwallet.keplr.getKey("xion-testnet-1");
      const signArbRes = await window.okxwallet.keplr.signArbitrary(
        chainInfo.chainId,
        okxAccount.bech32Address,
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

      postAddFunction();
      return res;
    } catch (error) {
      console.log(error);
      setErrorMessage(
        "Something went wrong trying to add OKX wallet as authenticator",
      );
      setIsLoading(false);
    }
  }

  const webauthnTest = async () => {
    try {
      const challenge = Buffer.from(abstractAccount?.id);
      const rpUrl =
        "https://xion-js-abstraxion-dashboard-git-feat-webauthn-burntfinance.vercel.app";
      let credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: rpUrl },
          user: {
            name: abstractAccount.id,
            displayName: abstractAccount.id,
            id: challenge,
          },
          pubKeyCredParams: [{ type: "public-key", alg: -7 }],
        },
      });

      console.log(credential);
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

      const rpUrl =
        "https://xion-js-abstraxion-dashboard-git-feat-webauthn-burntfinance.vercel.app";

      const options: CredentialCreationOptions = {
        publicKey: {
          rp: {
            name: rpUrl,
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

      // stringify the credential
      const publicKeyCredentialJSON = JSON.stringify(publicKeyCredential);

      // base64 encode it
      const base64EncodedCredential = Buffer.from(
        publicKeyCredentialJSON,
      ).toString("base64");

      console.log("publicKeyCredential: ", publicKeyCredential);
      console.log("publicKeyCredentialJSON: ", publicKeyCredentialJSON);
      console.log("base64EncodedCredential: ", base64EncodedCredential);

      const accountIndex = abstractAccount?.authenticators.nodes.length; // TODO: Be careful here, if indexer returns wrong number this can overwrite accounts

      const msg = {
        add_auth_method: {
          add_authenticator: {
            Passkey: {
              id: accountIndex,
              url: rpUrl,
              credential: base64EncodedCredential,
            },
          },
        },
      };
      const res = await client?.addAbstractAccountAuthenticator(msg, "", {
        amount: [{ amount: "0", denom: "uxion" }],
        gas: "500000",
      });

      if (res?.rawLog?.includes("failed")) {
        throw new Error(res.rawLog);
      }

      console.log(res);
      postAddFunction();
      return res;
    } catch (error) {
      console.log(error);
      setErrorMessage(
        "Something went wrong trying to add Webauthn as authenticator",
      );
    } finally {
      setIsLoading(false);
    }
  };

  async function addEthAuthenticator() {
    if (!window.ethereum) {
      alert("Please install wallet extension");
      return;
    }
    try {
      setIsLoading(true);
      if (!client) {
        throw new Error("No client found.");
      }

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

      postAddFunction();
      return res;
    } catch (error) {
      setErrorMessage(
        "Something went wrong trying to add Ethereum wallet as authenticator",
      );
      setIsLoading(false);
    }
  }

  return (
    <div className="ui-p-0 md:ui-p-8 ui-flex ui-flex-col ui-gap-8 ui-items-center">
      <div className="ui-flex ui-flex-col ui-gap-2">
        <h1 className="ui-w-full ui-text-center ui-text-3xl ui-font-akkuratLL ui-font-thin">
          ADD AUTHENTICATORS
        </h1>
        {isSuccess ? (
          <p className="ui-w-full ui-text-center ui-text-sm ui-font-akkuratLL ui-text-white/40">
            Successfully added authenticator to account. Please click continue
            to navigate back to home page.
          </p>
        ) : errorMessage ? (
          <p className="ui-w-full ui-text-center ui-text-sm ui-font-akkuratLL ui-text-red-500">
            {errorMessage}
          </p>
        ) : (
          <p className="ui-w-full ui-text-center ui-text-sm ui-font-akkuratLL ui-text-white/40">
            Enhance your account&apos;s security by adding authenticators.
            Select from the following options.
          </p>
        )}
      </div>
      {!isSuccess ? (
        <>
          {/* <Button
            className="!ui-no-underline !ui-text-sm !ui-p-0 ui-max-w-max"
            onClick={() => setIsOpen(false)}
            structure="naked"
          >
            SKIP FOR NOW
          </Button> */}
          <div className="ui-flex ui-gap-4 ui-w-full ui-justify-center">
            {/* <Button
          className={
            selectedAuthenticator === "keplr" ? "!ui-border-white" : ""
          }
          onClick={() => handleSwitch("keplr")}
          structure="outlined"
        >
          <KeplrLogo />
        </Button>
        <Button
          className={
            selectedAuthenticator === "metamask" ? "!ui-border-white" : ""
          }
          onClick={() => handleSwitch("metamask")}
          structure="outlined"
        >
          <MetamaskLogo />
        </Button> */}
            <Button
              className={
                selectedAuthenticator === "okx" ? "!ui-border-white" : ""
              }
              onClick={() => handleSwitch("okx")}
              structure="outlined"
            >
              <Image
                src="/okxWallet.png"
                height={48}
                width={48}
                alt="OKX Logo"
              />
            </Button>
            <Button
              className={
                selectedAuthenticator === "passkey" ? "!ui-border-white" : ""
              }
              onClick={() => {
                handleSwitch("passkey");
              }}
              structure="outlined"
            >
              <PasskeyIcon className="ui-w-12" />
            </Button>
            <Button onClick={webauthnTest}>WEBAUTHN GET</Button>
          </div>
        </>
      ) : null}
      {isSuccess ? (
        <Button className="ui-mt-4 ui-w-full" onClick={() => setIsOpen(false)}>
          CONTINUE
        </Button>
      ) : (
        <Button
          className="ui-mt-4 ui-w-full"
          disabled={selectedAuthenticator === "none" || isLoading}
          onClick={handleSelection}
        >
          {isLoading ? <Spinner /> : "SET UP AUTHENTICATOR"}
        </Button>
      )}
    </div>
  );
}
