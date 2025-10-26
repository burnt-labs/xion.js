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

  // Direct mode doesn't use built-in modal - users provide their own UI
  if (walletAuthMode !== 'redirect') {
    return null;
  }

  // Only show modal in redirect mode
  if (!showModal) return null;

  // Determine what to show based on connection state (redirect mode only)
  const renderContent = () => {
    if (abstraxionError) {
      return <ErrorDisplay />;
    }

    if (abstraxionAccount || isConnected) {
      return <Connected onClose={onClose} />;
    }

    // Show OAuth signin flow
    return <AbstraxionSignin />;
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
  getPubkey?: () => Promise<string>;  // For Secp256K1 (Cosmos wallets)
  getAddress?: () => Promise<string>; // For EthWallet
}

/**
 * Supported signing methods for wallets
 * - 'cosmos': Cosmos ecosystem wallets (Keplr, Leap, OKX, etc.) using secp256k1
 * - 'ethereum': Ethereum ecosystem wallets (MetaMask, Rainbow, etc.)
 * - 'ed25519': Reserved for future Solana/Polkadot support
 */
export type SigningMethod = 'cosmos' | 'ethereum' | 'ed25519';

/**
 * Generic wallet configuration
 * Allows developers to add any wallet by specifying its window key and signing method
 */
export interface GenericWalletConfig {
  /** Display name of the wallet (e.g., "Keplr", "Leap") */
  name: string;

  /** Window object key (e.g., "keplr", "leap", "okxwallet.keplr", "ethereum") */
  windowKey: string;

  /** Signing method the wallet uses */
  signingMethod: SigningMethod;

  /** Optional icon/logo component or URL */
  icon?: React.ReactNode | string;
}

/**
 * Props passed to custom wallet selection UI render function
 * This provides everything needed to render a custom wallet modal with zero boilerplate
 */
export interface WalletSelectionRenderProps {
  /** Whether the wallet selection modal should be shown */
  isOpen: boolean;

  /** Function to close the modal */
  onClose: () => void;

  /** List of available wallets from config */
  wallets: GenericWalletConfig[];

  /** Connect to a wallet by name - handles all connection logic internally */
  connect: (walletName: string) => Promise<void>;

  /** Whether a wallet connection is in progress */
  isConnecting: boolean;

  /** Error message if connection failed, null otherwise */
  error: string | null;
}

/**
 * Wallet authentication configuration
 */
export interface WalletAuthConfig {
  /** Authentication mode: redirect (default), direct (in-app), or local (no AA API) */
  mode?: 'redirect' | 'direct' | 'local';

  /** Custom AA API URL (for direct mode) */
  aaApiUrl?: string;

  /** Indexer configuration for querying existing accounts */
  indexer?: {
    url: string;
    authToken: string;
  };

  /** Custom signer (Turnkey, Privy, etc.) */
  customSigner?: CustomSigner;

  /** Local mode configuration (for building transactions without AA API) */
  localConfig?: {
    codeId: number;
    checksum: string;
    feeGranter: string;
    addressPrefix: string;
    workerAddress?: string;
  };

  /**
   * List of wallets to support
   *
   * Example:
   * [
   *   { name: "Keplr", windowKey: "keplr", signingMethod: "cosmos" },
   *   { name: "Leap", windowKey: "leap", signingMethod: "cosmos" },
   *   { name: "OKX", windowKey: "okxwallet.keplr", signingMethod: "cosmos" },
   *   { name: "MetaMask", windowKey: "ethereum", signingMethod: "ethereum" },
   * ]
   */
  wallets?: GenericWalletConfig[];

  /**
   * Custom wallet selection UI render function
   * If provided, this will be called when the user needs to select a wallet
   * All state management and auto-close logic is handled internally
   *
   * Example:
   * renderWalletSelection: ({ isOpen, onClose, wallets, connect, isConnecting, error }) => (
   *   <MyWalletModal
   *     isOpen={isOpen}
   *     onClose={onClose}
   *     wallets={wallets}
   *     onConnect={connect}
   *     loading={isConnecting}
   *     error={error}
   *   />
   * )
   */
  renderWalletSelection?: (props: WalletSelectionRenderProps) => React.ReactNode;
}

export interface AbstraxionConfig {
  /** Chain ID (e.g., 'xion-testnet-1', 'xion-mainnet-1') - REQUIRED */
  chainId: string;

  /** RPC URL for blockchain connection - REQUIRED */
  rpcUrl: string;

  /** REST API endpoint for queries - REQUIRED */
  restUrl: string;

  /** Gas price (e.g., '0.001uxion') - REQUIRED */
  gasPrice: string;

  /** Treasury contract address for grant configurations */
  treasury?: string;

  /** Fee granter address that pays transaction fees for grant creation */
  feeGranter?: string;

  /** Contract grant configurations (if not using treasury) */
  contracts?: ContractGrantDescription[];

  /** Enable staking grants */
  stake?: boolean;

  /** Bank spend limits */
  bank?: SpendLimit[];

  /** OAuth callback URL (for redirect mode) */
  callbackUrl?: string;

  /** Wallet authentication configuration */
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
      chainId={config.chainId}
      rpcUrl={config.rpcUrl}
      restUrl={config.restUrl}
      gasPrice={config.gasPrice}
      treasury={config.treasury}
      feeGranter={config.feeGranter}
      contracts={config.contracts}
      stake={config.stake}
      bank={config.bank}
      callbackUrl={config.callbackUrl}
      walletAuth={config.walletAuth}
    >
      {children}
    </AbstraxionContextProvider>
  );
}
