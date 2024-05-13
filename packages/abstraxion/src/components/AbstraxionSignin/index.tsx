"use client";
import { useContext, useEffect, useRef, useState } from "react";
import { BrowserIcon, Button, ModalSection } from "@burnt-labs/ui";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import {
  AbstraxionContext,
  ContractGrantDescription,
} from "../AbstraxionContext";
import { fetchConfig } from "@burnt-labs/constants";

export function AbstraxionSignin(): JSX.Element {
  const {
    setIsConnecting,
    setIsConnected,
    setAbstraxionError,
    setAbstraxionAccount,
    setGranterAddress,
    setShowModal,
    contracts,
    rpcUrl,
    restUrl,
    stake,
    bank,
  } = useContext(AbstraxionContext);

  const isMounted = useRef(false);
  const [tempAccountAddress, setTempAccountAddress] = useState("");

  function configuregranter(address: string) {
    setGranterAddress(address);
    localStorage.setItem("xion-authz-granter-account", address);
  }

  function openDashboardTab(
    userAddress: string,
    grantContracts?: ContractGrantDescription[],
    dashUrl?: string,
  ): void {
    if (!dashUrl) {
      console.warn("Failed to fetch dashboard url");
      setAbstraxionError("Failed to fetch dashboard url");
    }
    const currentUrl = window.location.href;
    const urlParams = new URLSearchParams();

    if (bank) {
      urlParams.set("bank", JSON.stringify(bank));
    }

    if (stake) {
      urlParams.set("stake", "true");
    }
    urlParams.set("grantee", userAddress);
    if (grantContracts) {
      urlParams.set("contracts", JSON.stringify(grantContracts));
    }
    urlParams.set("redirect_uri", currentUrl);
    const queryString = urlParams.toString(); // Convert URLSearchParams to string
    window.location.href = `${dashUrl}?${queryString}`;
  }

  async function getTempAccount() {
    const existingKeypair = localStorage.getItem("xion-authz-temp-account");
    if (!existingKeypair) return null;
    const keypair = await DirectSecp256k1HdWallet.deserialize(
      existingKeypair,
      "abstraxion",
    );
    return keypair;
  }

  async function generateAndStoreTempAccount(): Promise<string> {
    const keypair = await DirectSecp256k1HdWallet.generate(12, {
      prefix: "xion",
    });
    const accounts = await keypair.getAccounts();
    const address = accounts[0].address;
    setTempAccountAddress(address);

    const serializedKeypair = await keypair.serialize("abstraxion");
    localStorage.setItem("xion-authz-temp-account", serializedKeypair);
    localStorage.removeItem("xion-authz-granter-account"); // just in case
    return address;
  }

  async function pollForGrants(
    grantee: string,
    granter: string | null,
  ): Promise<boolean> {
    if (!grantee) {
      throw new Error("No keypair address");
    }
    if (!granter) {
      throw new Error("No granter address");
    }

    const maxRetries = 5;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        const baseUrl = `${restUrl}/cosmos/authz/v1beta1/grants`;
        const url = new URL(baseUrl);
        const params = new URLSearchParams({
          grantee,
          granter,
        });
        url.search = params.toString();
        const res = await fetch(url, {
          cache: "no-store",
        });
        const data = await res.json();
        if (data.grants.length > 0) {
          return true;
        } else {
          const delay = Math.pow(2, retries) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          retries++;
        }
      } catch (error) {
        const delay = Math.pow(2, retries) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        retries++;
      }
    }

    console.error("Max retries exceeded, giving up.");
    return false;
  }

  useEffect(() => {
    async function onStartup() {
      try {
        setIsConnecting(true);
        // Check for existing keypair and granter address
        const existingKeypair = await getTempAccount();
        const existingGranter = localStorage.getItem(
          "xion-authz-granter-account",
        );
        const searchParams = new URLSearchParams(window.location.search);
        const granter = existingGranter || searchParams.get("granter");

        // If both exist, we can assume user is either 1. already logged in and grants have been created for the temp key, or 2. been redirected with the granter url param
        // In either case, we poll for grants and make the appropriate state changes to reflect a "logged in" state
        if (existingKeypair && granter) {
          const accounts = await existingKeypair.getAccounts();
          const address = accounts[0].address;
          setTempAccountAddress(address);

          const pollSuccess = await pollForGrants(address, granter);
          if (!pollSuccess) {
            throw new Error("Error polling for grant");
          }

          setIsConnecting(false);
          setIsConnected(true);
          setShowModal(false);
          setAbstraxionAccount(existingKeypair);
          configuregranter(granter);

          // Remove query parameter "granted" and "granter"
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.delete("granted");
          currentUrl.searchParams.delete("granter");
          history.pushState({}, "", currentUrl.href);
        } else if (!existingKeypair || !granter) {
          // If there isn't an existing keypair, or there isn't a granter in either localStorage or the url params, we want to start from scratch
          // Generate new keypair and redirect to dashboard
          const newKeypairaddress = await generateAndStoreTempAccount(); // remove and replace existing keypair
          const { dashboardUrl } = await fetchConfig(rpcUrl);
          openDashboardTab(newKeypairaddress, contracts, dashboardUrl);
        }
      } catch (error) {
        console.log("Something went wrong: ", error);
        setAbstraxionError((error as Error).message);
      } finally {
        setIsConnecting(false);
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
        onClick={async () => {
          const { dashboardUrl } = await fetchConfig(rpcUrl);
          openDashboardTab(tempAccountAddress, contracts, dashboardUrl);
        }}
        structure="naked"
      >
        Have a Problem? Try Again
      </Button>
    </ModalSection>
  );
}
