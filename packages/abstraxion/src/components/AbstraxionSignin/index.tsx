"use client";
import { useContext, useEffect, useRef } from "react";
import { DirectSecp256k1HdWallet } from "graz/dist/cosmjs";
import { Button, ModalSection, BrowserIcon } from "@burnt-labs/ui";
import { wait } from "@/utils/wait";
import { AbstraxionContext } from "../AbstraxionContext";

export function AbstraxionSignin(): JSX.Element {
  const {
    setIsConnecting,
    setIsConnected,
    setAbstraxionAccount,
    contracts,
    dashboardUrl,
  } = useContext(AbstraxionContext);

  const isMounted = useRef(false);

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

  async function pollForGrants(
    keypair: DirectSecp256k1HdWallet,
  ): Promise<void> {
    if (!keypair) {
      throw new Error("No keypair");
    }
    setIsConnecting(true);

    const accounts = await keypair.getAccounts();
    const address = accounts[0].address;
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
        const data = await res.json();
        if (data.grants?.length > 0) {
          break;
        }
      } catch (error) {
        console.log("There was an error polling for grants: ", error);
      }
    }

    setIsConnecting(false);
    setIsConnected(true);
    setAbstraxionAccount(keypair);
  }

  useEffect(() => {
    async function onStartup() {
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
      openDashboardTab(address, contracts);
      pollForGrants(keypair);
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
      <Button structure="naked">Have a Problem? Try Again</Button>
    </ModalSection>
  );
}
