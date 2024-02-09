"use client";
import { useContext, useEffect } from "react";
import { Dialog, DialogContent } from "@burnt-labs/ui";
import {
  AbstraxionContext,
  AbstraxionContextProvider,
} from "../AbstraxionContext";
import { Loading } from "../Loading";
import { ErrorDisplay } from "../ErrorDisplay";
import { Connected } from "../Connected/Connected";
import { AbstraxionSignin } from "../AbstraxionSignin";

export interface ModalProps {
  onClose: VoidFunction;
}

export function Abstraxion({ onClose }: ModalProps): JSX.Element | null {
  const {
    abstraxionError,
    isConnecting,
    isConnected,
    showModal,
    setShowModal,
  } = useContext(AbstraxionContext);

  useEffect(() => {
    const closeOnEscKey = (e: KeyboardEventInit): void => {
      e.key === "Escape"
        ? () => {
            onClose();
            setShowModal(false);
          }
        : null;
    };
    document.addEventListener("keydown", closeOnEscKey);
    return () => {
      document.removeEventListener("keydown", closeOnEscKey);
    };
  }, [onClose]);

  if (!showModal) return null;

  return (
    <Dialog onOpenChange={onClose} open={showModal}>
      <DialogContent>
        {abstraxionError ? (
          <ErrorDisplay />
        ) : isConnecting ? (
          <Loading />
        ) : isConnected ? (
          <Connected onClose={onClose} />
        ) : (
          <AbstraxionSignin />
        )}
      </DialogContent>
    </Dialog>
  );
}

export interface AbstraxionConfig {
  contracts?: string[];
  dashboardUrl?: string;
}

export function AbstraxionProvider({
  children,
  config,
}: {
  children: React.ReactNode;
  config: AbstraxionConfig;
}): JSX.Element {
  return (
    <AbstraxionContextProvider
      contracts={config.contracts}
      dashboardUrl={config.dashboardUrl}
    >
      {children}
    </AbstraxionContextProvider>
  );
}
