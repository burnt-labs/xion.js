import { useContext, useEffect, useRef } from "react";
import { GrazProvider } from "graz";
import { StytchProvider } from "@stytch/nextjs";
import { ApolloProvider } from "@apollo/client";
import {
  AbstraxionContext,
  AbstraxionContextProps,
  AbstraxionContextProvider,
} from "@/components/AbstraxionContext";
import { apolloClient, stytchClient } from "@/lib";
import { Dialog, DialogContent } from "@burnt-labs/ui";
import { AbstraxionSignin } from "@/components/AbstraxionSignin";
import { useAbstraxionAccount } from "@/hooks";
import { Loading } from "@/components/Loading";
import { AbstraxionWallets } from "@/components/AbstraxionWallets";
import { ErrorDisplay } from "@/components/ErrorDisplay";

export interface ModalProps {
  onClose: VoidFunction;
  isOpen: boolean;
}

export const Abstraxion = ({ isOpen, onClose }: ModalProps) => {
  const { abstraxionError } = useContext(
    AbstraxionContext,
  ) as AbstraxionContextProps;

  const { isConnected, isConnecting, isReconnecting } = useAbstraxionAccount();

  useEffect(() => {
    const closeOnEscKey = (e: any) => (e.key === "Escape" ? onClose() : null);
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
          <ErrorDisplay message={abstraxionError} onClose={onClose} />
        ) : isConnecting || isReconnecting ? (
          <Loading />
        ) : isConnected ? (
          <AbstraxionWallets />
        ) : (
          <AbstraxionSignin />
        )}
      </DialogContent>
    </Dialog>
  );
};

export const AbstraxionProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <AbstraxionContextProvider>
      <StytchProvider stytch={stytchClient}>
        <ApolloProvider client={apolloClient}>
          <GrazProvider>{children}</GrazProvider>
        </ApolloProvider>
      </StytchProvider>
    </AbstraxionContextProvider>
  );
};
