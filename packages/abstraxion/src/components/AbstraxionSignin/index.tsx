"use client";
import { useContext, useEffect, useRef } from "react";
import { BrowserIcon, Button, ModalSection } from "@burnt-labs/ui";
import { AbstraxionContext } from "../AbstraxionContext";
import { abstraxionAuth } from "../Abstraxion";
import { Loading } from "../Loading";

export function AbstraxionSignin(): JSX.Element {
  const { isConnecting, setShowModal, setAbstraxionError, login } =
    useContext(AbstraxionContext);

  const isMounted = useRef(false);

  const retryRedirect = async () => {
    await abstraxionAuth.redirectToDashboard();
  };

  useEffect(() => {
    async function onStartup() {
      try {
        await login()
      } catch (error) {
        console.warn("Something went wrong: ", error);
        setAbstraxionError((error as Error).message);
      } finally {
        setShowModal(false);
      }
    }

    if (!isMounted.current) {
      onStartup();
    }

    isMounted.current = true;
  }, []);

  if (isConnecting) {
    return <Loading />;
  }

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
      <Button onClick={retryRedirect} structure="naked">
        Have a Problem? Try Again
      </Button>
    </ModalSection>
  );
}
