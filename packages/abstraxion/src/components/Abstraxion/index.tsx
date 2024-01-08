import type { MouseEvent } from "react";
import { useContext, useEffect, useRef } from "react";
import { GrazProvider } from "graz";
import { StytchProvider } from "@stytch/nextjs";
import { ApolloProvider } from "@apollo/client";
import { ModalAnchor, Modal } from "@burnt-labs/ui";
import {
  AbstraxionContext,
  AbstraxionContextProvider,
} from "../AbstraxionContext";
import { apolloClient, stytchClient } from "../../lib";
import { AbstraxionSignin } from "../AbstraxionSignin";
import { useAbstraxionAccount } from "../../hooks";
import { Loading } from "../Loading";
import { AbstraxionWallets } from "../AbstraxionWallets";
import { ErrorDisplay } from "../ErrorDisplay";

export interface ModalProps {
  onClose: VoidFunction;
  isOpen: boolean;
}

export function Abstraxion({
  isOpen,
  onClose,
}: ModalProps): JSX.Element | null {
  const modalRef = useRef<HTMLDivElement>(null);

  const { abstraxionError } = useContext(AbstraxionContext);

  const { isConnected, isConnecting, isReconnecting } = useAbstraxionAccount();

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
    <ModalAnchor onClick={onClose} ref={modalRef}>
      <Modal
        onClick={(e: MouseEvent) => {
          e.stopPropagation();
        }}
      >
        {abstraxionError ? (
          <ErrorDisplay message={abstraxionError} onClose={onClose} />
        ) : isConnecting || isReconnecting ? (
          <Loading />
        ) : isConnected ? (
          <AbstraxionWallets />
        ) : (
          <AbstraxionSignin />
        )}
      </Modal>
    </ModalAnchor>
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
