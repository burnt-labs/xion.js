"use client";
import { useCallback, useContext, useEffect } from "react";
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
import {
  BrowserRedirectStrategy,
  BrowserStorageStrategy,
} from "@/src/strategies";

export interface ModalProps {
  onClose: VoidFunction;
}

export const abstraxionAuth = new AbstraxionAuth(
  new BrowserStorageStrategy(),
  new BrowserRedirectStrategy(),
);

export function Abstraxion({ onClose }: ModalProps): JSX.Element | null {
  const {
    abstraxionAccount,
    abstraxionError,
    isConnected,
    showModal,
    setShowModal,
  } = useContext(AbstraxionContext);

  const closeOnEscKey = useCallback(
    (e: KeyboardEventInit): void => {
      if (e.key === "Escape") {
        onClose();
        setShowModal(false);
      }
    },
    [onClose, setShowModal],
  );

  useEffect(() => {
    document.addEventListener("keydown", closeOnEscKey);
    return () => {
      document.removeEventListener("keydown", closeOnEscKey);
    };
  }, [closeOnEscKey]);

  if (!showModal) return null;

  return (
    <Dialog onOpenChange={onClose} open={showModal}>
      <DialogContent>
        {abstraxionError ? (
          <ErrorDisplay />
        ) : abstraxionAccount || isConnected ? (
          <Connected onClose={onClose} />
        ) : !abstraxionAccount ? (
          <AbstraxionSignin />
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
  callbackUrl?: string;
  treasury?: string;
  gasPrice?: string;
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
      callbackUrl={config.callbackUrl}
      treasury={config.treasury}
      gasPrice={config.gasPrice}
    >
      {children}
    </AbstraxionContextProvider>
  );
}
