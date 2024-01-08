"use client";
import { useContext, useEffect, useRef } from "react";
import { Button, ModalSection } from "@burnt-labs/ui";
import {
  AbstraxionContext,
  AbstraxionContextProps,
} from "../AbstraxionContext";
import { BrowserIcon } from "@burnt-labs/ui";
import { DirectSecp256k1HdWallet } from "graz/dist/cosmjs";

function wait(ms = 1000) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export const AbstraxionSignin = () => {
  const { setIsConnecting, setIsConnected } = useContext(
    AbstraxionContext,
  ) as AbstraxionContextProps;

  const isMounted = useRef(false);

  function openDashboardTab() {
    window.open("http://localhost:5000", "_blank");
  }

  async function generateAndStoreTempAccount() {
    const keypair = await DirectSecp256k1HdWallet.generate(12, {
      prefix: "xion",
    });
    // TODO: serialization password and localStorage key
    const serializedKeypair = await keypair.serialize("abstraxion");
    localStorage.setItem("xion-authz-temp-account", serializedKeypair);
    return keypair;
  }

  async function pollForGrants(keypair: DirectSecp256k1HdWallet) {
    if (!keypair) {
      throw new Error("No keypair");
    }
    setIsConnecting(true);
    const accounts = await keypair.getAccounts();
    const address = accounts[0].address;
    console.log(address);

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
      } catch (error) {}
    }

    setIsConnecting(false);
    setIsConnected(true);
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
      openDashboardTab();
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
      <Button structure="naked" onClick={openDashboardTab}>
        Have a Problem? Try Again
      </Button>
    </ModalSection>
  );
};
