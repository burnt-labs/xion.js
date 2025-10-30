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
import type { AuthenticationConfig } from "../../authentication/types";

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
    authMode,
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

  // TODO: Remove the ui code on redirect mode
  if (authMode !== 'redirect') {
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
 * Indexer configuration for querying existing accounts (Numia or Subquery)
 */
export interface IndexerConfig {
  url: string;
  authToken?: string;
}

/**
 * Treasury indexer configuration for fetching grant configurations (DaoDao)
 */
export interface TreasuryIndexerConfig {
  url: string;
}

/**
 * Local mode configuration (for building transactions without AA API)
 */
export interface LocalConfig {
  codeId: number;
  checksum: string;
  feeGranter: string;
  addressPrefix: string;
  workerAddress?: string;
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

  /**
   * Authentication configuration
   * Defines how users authenticate (OAuth, signer, or browser wallet)
   * If omitted, defaults to OAuth (redirect flow)
   */
  authentication?: AuthenticationConfig;

  /**
   * Indexer configuration for querying existing smart accounts
   * Supports Numia or Subquery indexers for fast account discovery
   */
  indexer?: IndexerConfig;

  /**
   * Treasury indexer configuration for fetching grant configurations
   * Uses DaoDao indexer for fast treasury queries
   * Falls back to direct RPC queries if not provided
   */
  treasuryIndexer?: TreasuryIndexerConfig;

  /** Local mode configuration (for building transactions without AA API) */
  localConfig?: LocalConfig;
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
      authentication={config.authentication}
      indexer={config.indexer}
      treasuryIndexer={config.treasuryIndexer}
      localConfig={config.localConfig}
    >
      {children}
    </AbstraxionContextProvider>
  );
}
