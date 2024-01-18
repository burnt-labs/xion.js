"use client";
import { useContext, useEffect, useRef, useState } from "react";
import { DirectSecp256k1HdWallet } from "graz/dist/cosmjs";
import { Button, ModalSection, BrowserIcon } from "@burnt-labs/ui";
import { wait } from "@/utils/wait";
import { AbstraxionContext } from "../AbstraxionContext";

type GrantsResponse = {
  grants: Grant[];
  pagination: Pagination;
};

type Grant = {
  granter: string;
  grantee: string;
  authorization: Authorization;
  expiration: string;
};

type Authorization = {
  "@type": string;
  grants: GrantAuthorization[];
};

type GrantAuthorization = {
  contract: string;
  limit: Limit;
  filter: Filter;
};

type Limit = {
  "@type": string;
  remaining: string;
};

type Filter = {
  "@type": string;
};

type Pagination = {
  next_key: null | string;
  total: string;
};

export function AbstraxionSignin(): JSX.Element {
  const {
    setIsConnecting,
    setIsConnected,
    setAbstraxionAccount,
    setgranterAddress,
    contracts,
    dashboardUrl,
  } = useContext(AbstraxionContext);

  const isMounted = useRef(false);
  const [tempAccountAddress, setTempAccountAddress] = useState("");

  function configuregranter(address: string) {
    setgranterAddress(address);
    localStorage.setItem("xion-authz-granter-account", address);
  }

  function openDashboardTab(userAddress: string, contracts?: string[]): void {
    const urlParams = new URLSearchParams();
    urlParams.set("grantee", userAddress);
    // @ts-ignore - url encoding array
    urlParams.set("contracts", contracts);
    urlParams.toString();
    window.open(`${dashboardUrl}?${urlParams}`, "_blank");
  }

  async function generateAndStoreTempAccount(): Promise<DirectSecp256k1HdWallet> {
    const keypair = await DirectSecp256k1HdWallet.generate(12, {
      prefix: "xion",
    });
    // TODO: serialization password and localStorage key
    const serializedKeypair = await keypair.serialize("abstraxion");
    localStorage.setItem("xion-authz-temp-account", serializedKeypair);
    return keypair;
  }

  async function pollForGrants(address: string): Promise<void> {
    if (!address) {
      throw new Error("No keypair address");
    }

    const shouldContinue = true;
    while (shouldContinue) {
      try {
        await wait(3000);
        const res = await fetch(
          `https://api.xion-testnet-1.burnt.com/cosmos/authz/v1beta1/grants/grantee/${address}`,
          {
            cache: "no-store",
          },
        );
        const data = (await res.json()) as GrantsResponse;
        if (data.grants?.length > 0) {
          setIsConnecting(true);
          const granterAddresses = data.grants.map((grant) => grant.granter);
          const uniqueGranters = [...new Set(granterAddresses)];
          if (uniqueGranters.length > 1) {
            console.error("More than one granter found. Taking first.");
          }

          configuregranter(uniqueGranters[0]);
          break;
        }
      } catch (error) {
        throw error;
      }
    }
  }

  useEffect(() => {
    async function onStartup() {
      try {
        const existingKeypair = localStorage.getItem("xion-authz-temp-account");
        let keypair;
        if (existingKeypair) {
          keypair = await DirectSecp256k1HdWallet.deserialize(
            existingKeypair,
            "abstraxion",
          );
        } else {
          keypair = await generateAndStoreTempAccount();
        }
        const accounts = await keypair.getAccounts();
        const address = accounts[0].address;
        setTempAccountAddress(address);
        openDashboardTab(address, contracts);
        await pollForGrants(address);
        setIsConnecting(false);
        setIsConnected(true);
        setAbstraxionAccount(keypair);
      } catch (error) {
        console.log("Something went wrong: ", error);
      }
    }

    if (!isMounted.current) {
      onStartup();
    }

    isMounted.current = true;
  }, []);

  return (
    <ModalSection className="ui-items-center">
      <div className="ui-flex ui-flex-col ui-w-full ui-text-center">
        <h1 className="ui-w-full ui-tracking-tighter ui-text-3xl ui-font-bold ui-text-white ui-uppercase ui-mb-3">
          Secure account creation
        </h1>
        <h2 className="ui-w-full ui-tracking-tighter ui-text-sm ui-mb-4 ui-text-neutral-500">
          Please switch to the newly opened tab and enter your credentials to
          securely complete your account creation
        </h2>
      </div>
      <BrowserIcon />
      <Button
        onClick={() => openDashboardTab(tempAccountAddress, contracts)}
        structure="naked"
      >
        Have a Problem? Try Again
      </Button>
    </ModalSection>
  );
}
