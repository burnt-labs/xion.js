"use client";
import { useContext, useEffect, useRef, useState } from "react";
import { Button, ModalSection, BrowserIcon } from "@burnt-labs/ui";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { wait } from "@/utils/wait";
import type { GrantsResponse } from "@/interfaces";
import { AbstraxionContext } from "../AbstraxionContext";

export function AbstraxionSignin(): JSX.Element {
  const {
    setIsConnecting,
    setIsConnected,
    setAbstraxionAccount,
    setGranterAddress,
    granterAddress,
    contracts,
    dashboardUrl,
  } = useContext(AbstraxionContext);

  const isMounted = useRef(false);
  const [tempAccountAddress, setTempAccountAddress] = useState("");

  function configuregranter(address: string): void {
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
    urlParams.set("contracts", grantContracts ? grantContracts.join(",") : "");
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

  async function fetchGrants(address: string): Promise<GrantsResponse | null> {
    try {
      const response = await fetch(
        `https://api.xion-testnet-1.burnt.com/cosmos/authz/v1beta1/grants/grantee/${address}`,
        {
          cache: "no-store",
        },
      );
      if (!response.ok) throw new Error("Fetch failed");
      return (await response.json()) as GrantsResponse;
    } catch (error) {
      console.error("Error fetching grants:", error);
      return null;
    }
  }

  async function pollGrants(address: string): Promise<void> {
    const data = await fetchGrants(address);
    if (data) {
      const uniqueGranters =
        data.grants.length > 0
          ? [...new Set(data.grants.map((grant) => grant.granter))]
          : null;
      if (uniqueGranters && uniqueGranters.length > 0) {
        if (uniqueGranters.length > 1) {
          console.error("More than one granter found. Taking first.");
        }
        configuregranter(uniqueGranters[0]);
        updateURL();
        return; // Exit the recursive loop on success
      }
    }
    // Continue polling if the condition isn't met
    await wait(3000);
    pollGrants(address);
  }

  function updateURL(): void {
    const currentUrl = new URL(window.location.href);
    if (currentUrl.searchParams.has("granted")) {
      currentUrl.searchParams.delete("granted");
      history.pushState({}, "", currentUrl.href);
    }
  }

  useEffect(() => {
    async function onStartup(): Promise<void> {
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
          await pollGrants(address);
          setIsConnecting(false);
          setIsConnected(true);
          setAbstraxionAccount(keypair);
        } else {
          setIsConnected(true);
        }
      } catch (error) {
        console.error("Something went wrong: ", error);
      }
    }

    if (!isMounted.current) {
      onStartup();
    }

    isMounted.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Should only run once so disabling rule for this case.

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
