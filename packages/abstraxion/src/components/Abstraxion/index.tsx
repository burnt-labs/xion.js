"use client";
import { useContext, useEffect } from "react";
import { Dialog, DialogContent } from "@burnt-labs/ui";
import {
  AbstraxionContext,
  AbstraxionContextProvider,
  ContractGrantDescription,
  SpendLimit,
} from "../AbstraxionContext";
import { ErrorDisplay } from "../ErrorDisplay";
import { AbstraxionSignin } from "../AbstraxionSignin";
import { Connected } from "@/src/components/Connected/Connected.tsx";
import { AbstraxionAuth } from "@burnt-labs/abstraxion-core";

export interface ModalProps {
  onClose: VoidFunction;
}

export const abstraxionAuth = new AbstraxionAuth();

export function Abstraxion({ onClose }: ModalProps): JSX.Element | null {
  const {
    abstraxionAccount,
    abstraxionError,
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
        ) : !abstraxionAccount ? (
          <AbstraxionSignin />
        ) : isConnected ? (
          <Connected onClose={onClose} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export interface AbstraxionConfig {
  contracts?: ContractGrantDescription[];
  rpcUrl?: string;
  restUrl?: string;
  stake?: boolean;
  bank?: SpendLimit[];
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
      rpcUrl={config.rpcUrl}
      restUrl={config.restUrl}
      stake={config.stake}
      bank={config.bank}
    >
      {children}
    </AbstraxionContextProvider>
  );
}
