"use client";
import { useContext, useEffect } from "react";
import { GrazProvider } from "graz";
import { StytchProvider } from "@stytch/nextjs";
import { ApolloProvider } from "@apollo/client";
import { Dialog, DialogContent } from "@burnt-labs/ui";
import {
  AbstraxionContext,
  AbstraxionContextProvider,
} from "../AbstraxionContext";
import { apolloClient, stytchClient } from "../../lib";
import { AbstraxionSignin } from "../AbstraxionSignin";
import { Loading } from "../Loading";
import { ErrorDisplay } from "../ErrorDisplay";
import { Connected } from "../Connected/Connected";

export interface ModalProps {
  onClose: VoidFunction;
  isOpen: boolean;
}

export function Abstraxion({
  isOpen,
  onClose,
}: ModalProps): JSX.Element | null {
  const { abstraxionError, isConnecting, isConnected } =
    useContext(AbstraxionContext);

  useEffect(() => {
    const closeOnEscKey = (e: KeyboardEventInit): void => {
      e.key === "Escape" ? onClose() : null;
    };
    document.addEventListener("keydown", closeOnEscKey);
    return () => {
      document.removeEventListener("keydown", closeOnEscKey);
    };
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        {abstraxionError ? (
          <ErrorDisplay />
        ) : isConnecting ? (
          <Loading />
        ) : isConnected ? (
          <Connected />
        ) : (
          <AbstraxionSignin />
        )}
      </DialogContent>
    </Dialog>
  );
}

export function AbstraxionProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <AbstraxionContextProvider>
      <StytchProvider stytch={stytchClient}>
        <ApolloProvider client={apolloClient}>
          <GrazProvider>{children}</GrazProvider>
        </ApolloProvider>
      </StytchProvider>
    </AbstraxionContextProvider>
  );
}
