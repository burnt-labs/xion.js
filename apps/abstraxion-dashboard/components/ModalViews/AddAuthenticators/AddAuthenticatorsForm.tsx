import {
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from "react";
import { WalletType, useAccount, useSuggestChainAndConnect } from "graz";
import { useQuery } from "@apollo/client";
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
type AuthenticatorStates = "none" | "keplr" | "metamask";

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

  // Context state
  const { abstractAccount, setAbstractAccount, chainInfo } = useContext(
    AbstraxionContext,
  ) as AbstraxionContextProps;

  // Hooks
  const { loginAuthenticator } = useAbstraxionAccount();
  const { client } = useAbstraxionSigningClient();
  const { data: grazAccount } = useAccount();
  const { suggestAndConnect } = useSuggestChainAndConnect({
    onSuccess: async () => await addKeplrAuthenticator(),
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

  // Stop polling upon new data and update context
  useEffect(() => {
    if (previousData && data !== previousData) {
      stopPolling();
      setIsLoading(false);
      setAbstractAccount(
        data?.smartAccounts?.nodes.find(
          (smartAccount) => smartAccount.id === abstractAccount.id,
        ),
      );
    }
  }, [data, previousData]);

  // Functions
  function handleSwitch(authenticator: AuthenticatorStates) {
    setErrorMessage("");
    setSelectedAuthenticator(authenticator);
  }

  async function handleSelection() {
    setErrorMessage("");
    setIsLoading(true);
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
    }
  }

  function postAddFunction() {
    setIsLoading(true);
    startPolling(3000);
  }

  async function addKeplrAuthenticator() {
    try {
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
    } finally {
      setIsLoading(false);
    }
  }

  async function addEthAuthenticator() {
    if (!window.ethereum) {
      alert("Please install the Metamask wallet extension");
      return;
    }
    try {
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
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="ui-p-0 md:ui-p-8 ui-flex ui-flex-col ui-gap-8 ui-items-center">
      <div className="ui-flex ui-flex-col ui-gap-2">
        <h1 className="ui-w-full ui-text-center ui-text-3xl ui-font-akkuratLL ui-font-thin">
          ADD AUTHENTICATORS
        </h1>
        {errorMessage ? (
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
      <Button
        className="!ui-no-underline !ui-text-sm !ui-p-0 ui-max-w-max"
        onClick={() => setIsOpen(false)}
        structure="naked"
      >
        SKIP FOR NOW
      </Button>
      <div className="ui-flex ui-gap-4 ui-w-full ui-justify-center">
        <Button
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
        </Button>
        <Button disabled structure="outlined">
          <PasskeyIcon />
        </Button>
      </div>
      <Button
        className="ui-mt-4 ui-w-full"
        disabled={selectedAuthenticator === "none" || isLoading}
        onClick={handleSelection}
      >
        {isLoading ? <Spinner /> : "SET UP AUTHENTICATOR"}
      </Button>
    </div>
  );
}
