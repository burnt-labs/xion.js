"use client";
import { useContext, useEffect, useRef, useState } from "react";
import { BrowserIcon, Button, ModalSection } from "@burnt-labs/ui";
import { AbstraxionContext } from "../AbstraxionContext";

export function AbstraxionSignin(): JSX.Element {
  const { abstraxionAuth, setIsConnecting, setAbstraxionError } =
    useContext(AbstraxionContext);

  const isMounted = useRef(false);

  useEffect(() => {
    async function onStartup() {
      try {
        if (!abstraxionAuth) {
          throw new Error("abstraxion-core not initialized");
        }
        setIsConnecting(true);
        await abstraxionAuth.login();
        setIsConnecting(false);
      } catch (error) {
        console.error(error);
        setAbstraxionError((error as Error).message);
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
          if (!abstraxionAuth) {
            console.warn("abstraxion-core not initialized");
            return;
          }
          const tempAddress = await abstraxionAuth.getKeypairAddress();
          abstraxionAuth.openDashboardTab(tempAddress);
        }}
        structure="naked"
      >
        Have a Problem? Try Again
      </Button>
    </ModalSection>
  );
}
