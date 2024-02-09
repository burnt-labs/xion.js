"use client";
import { useContext, useEffect, useRef, useState } from "react";
import { Button, ModalSection, BrowserIcon } from "@burnt-labs/ui";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { wait } from "@/utils/wait";
import { AbstraxionContext } from "../AbstraxionContext";

interface GrantsResponse {
  grants: Grant[];
  pagination: Pagination;
}

interface Grant {
  granter: string;
  grantee: string;
  authorization: Authorization;
  expiration: string;
}

interface Authorization {
  "@type": string;
  grants: GrantAuthorization[];
}

interface GrantAuthorization {
  contract: string;
  limit: Limit;
  filter: Filter;
}

interface Limit {
  "@type": string;
  remaining: string;
}

interface Filter {
  "@type": string;
}

interface Pagination {
  next_key: null | string;
  total: string;
}

export function AbstraxionSignin(): JSX.Element {
  const {
    setIsConnecting,
    setIsConnected,
    setAbstraxionAccount,
    abstraxionAccount,
    setGranterAddress,
    granterAddress,
    contracts,
    dashboardUrl,
  } = useContext(AbstraxionContext);

  const isMounted = useRef(false);
  const [tempAccountAddress, setTempAccountAddress] = useState("");

  function configuregranter(address: string) {
    setGranterAddress(address);
    localStorage.setItem("xion-authz-granter-account", address);
  }

  function openDashboardTab(
    userAddress: string,
    grantContracts?: string[],
  ): void {
    const currentUrl = window.location.href;
    const urlParams = new URLSearchParams();
    urlParams.set("grantee", userAddress);
    // @ts-expect-error - url encoding array
    urlParams.set("contracts", grantContracts);
    urlParams.set("redirect_uri", currentUrl);
    const queryString = urlParams.toString(); // Convert URLSearchParams to string
    window.location.href = `${dashboardUrl}?${queryString}`;
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
    setIsConnecting(true);

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
        if (data.grants.length > 0) {
          const granterAddresses = data.grants.map((grant) => grant.granter);
          const uniqueGranters = [...new Set(granterAddresses)];
          if (uniqueGranters.length > 1) {
            console.error("More than one granter found. Taking first.");
          }

          configuregranter(uniqueGranters[0]);
          // Remove query parameter "granted"
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.delete("granted");
          history.pushState({}, "", currentUrl.href);

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
        const searchParams = new URLSearchParams(window.location.search);
        const isGranted = searchParams.get("granted");
        const accounts = await keypair.getAccounts();
        const address = accounts[0].address;
        setTempAccountAddress(address);

        if (!isGranted && !granterAddress) {
          openDashboardTab(address, contracts);
        } else if (isGranted && !granterAddress) {
          await pollForGrants(address);
          setIsConnecting(false);
          setIsConnected(true);
          setAbstraxionAccount(keypair);
        } else {
          setIsConnected(true);
        }
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
        onClick={() => {
          openDashboardTab(tempAccountAddress, contracts);
        }}
        structure="naked"
      >
        Have a Problem? Try Again
      </Button>
    </ModalSection>
  );
}
