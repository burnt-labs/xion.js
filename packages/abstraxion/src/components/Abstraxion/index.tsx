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
import { WalletSelect } from "../WalletSelect";
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
    walletAuthMode,
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

  // Determine what to show based on auth mode and connection state
  const renderContent = () => {
    if (abstraxionError) {
      return <ErrorDisplay />;
    }

    if (abstraxionAccount || isConnected) {
      return <Connected onClose={onClose} />;
    }

    // Not connected - show signin flow
    if (walletAuthMode === 'redirect') {
      // Existing OAuth flow via dashboard
      return <AbstraxionSignin />;
    } else {
      // Direct mode - show wallet selection
      return <WalletSelect />;
    }
  };

  return (
    <Dialog onOpenChange={onClose} open={showModal}>
      <DialogContent>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Custom signer interface for Turnkey, Privy, etc.
 */
export interface CustomSigner {
  type: 'Secp256K1' | 'EthWallet';
  sign: (message: string) => Promise<string>;
  getPubkey?: () => Promise<string>;  // For Secp256K1
  getAddress?: () => Promise<string>; // For EthWallet
}

/**
 * Wallet authentication configuration
 */
export interface WalletAuthConfig {
  /** Authentication mode: redirect (default), direct (in-app), or local (no AA API) */
  mode?: 'redirect' | 'direct' | 'local';

  /** Custom AA API URL (for direct mode) */
  aaApiUrl?: string;

  /** Custom signer (Turnkey, Privy, etc.) */
  customSigner?: CustomSigner;

  /** Local mode configuration (for building transactions without AA API) */
  localConfig?: {
    codeId: number;
    checksum: string;
    feeGranter: string;
    workerAddress?: string;
    addressPrefix?: string;
  };
}

export interface AbstraxionConfig {
  contracts?: ContractGrantDescription[];
  rpcUrl?: string;
  stake?: boolean;
  bank?: SpendLimit[];
  callbackUrl?: string;
  treasury?: string;
  gasPrice?: string;

  /** NEW: Wallet authentication configuration */
  walletAuth?: WalletAuthConfig;
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
      stake={config.stake}
      bank={config.bank}
      callbackUrl={config.callbackUrl}
      treasury={config.treasury}
      gasPrice={config.gasPrice}
      walletAuth={config.walletAuth}
    >
      {children}
    </AbstraxionContextProvider>
  );
}
