"use client";

import type { Connector } from "@burnt-labs/abstraxion";
import { KeplrLogo } from "./icons/KeplrLogo";
import { OKXLogo } from "./icons/OKXLogo";
import { MetamaskLogo } from "./icons/MetamaskLogo";
import { AbstraxionContext, type AbstraxionContextProps } from "@burnt-labs/abstraxion";
import { useContext } from "react";

interface WalletModalProps {
  connectors: Connector[];
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  availableConnectors: Connector[];
  connect: (connector: Connector) => Promise<void>;
  error: string | null;
  isConnecting: boolean;
}

/**
 * Wallet selection modal component.
 * Displays available wallets and handles connection flow.
 */
export function WalletModal({ 
  connectors,
  showModal,
  setShowModal,
  availableConnectors,
  connect,
  error,
  isConnecting,
}: WalletModalProps) {
  // Get config from context
  const context = useContext(AbstraxionContext) as AbstraxionContextProps;
  const { isConnected } = context;

  // Show modal when login is called and not connected
  const shouldShowModal = showModal || (isConnecting && !isConnected);

  // Don't render if modal shouldn't be shown AND we're not in the middle of connecting
  if (!shouldShowModal && !isConnecting) {
    return null;
  }

  // If no available connectors but we have connectors, show all connectors (user can install wallet)
  // Otherwise, only show available connectors
  const connectorsToShow = availableConnectors.length > 0 
    ? availableConnectors 
    : connectors; // Fallback to all connectors if none are available yet

  // Map wallet IDs to logo components
  const getWalletLogo = (walletId: string) => {
    switch (walletId) {
      case "metamask":
        return <MetamaskLogo className="w-6 h-6" />;
      case "keplr":
        return <KeplrLogo className="w-6 h-6" />;
      case "okx":
        return <OKXLogo className="w-6 h-6" />;
      default:
        return null;
    }
  };

  // Map connectors to display format
  const walletItems = connectorsToShow.map((connector: Connector) => ({
    id: connector.metadata.id,
    name: connector.metadata.name,
    connector,
    isAvailable: availableConnectors.some(ac => ac.metadata.id === connector.metadata.id),
    logo: getWalletLogo(connector.metadata.id),
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-lg">
      {/* Backdrop - click to close (disabled when connecting) */}
      <div
        className="fixed inset-0"
        onClick={() => !isConnecting && setShowModal(false)}
      />

      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-md mx-auto px-4">
        <div className="bg-black/80 border border-white/10 rounded-lg p-6 shadow-2xl backdrop-blur-xl">
          {/* Loading Overlay */}
          {isConnecting && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 backdrop-blur-lg rounded-lg">
              <div className="mx-4 max-w-sm rounded-lg border border-blue-500/50 bg-black/80 backdrop-blur-xl p-8 text-center shadow-2xl">
                <div className="mb-6">
                  <div className="mx-auto flex h-16 w-16 animate-pulse items-center justify-center rounded-full border-4 border-blue-500/40 bg-blue-500/20">
                    <div className="h-8 w-8 animate-spin rounded-full border-3 border-solid border-blue-400 border-r-transparent"></div>
                  </div>
                </div>
                <p className="text-lg font-bold text-blue-400">Connecting Wallet</p>
                <p className="mt-3 text-sm text-gray-300">
                  Please approve the connection and sign the grant creation transaction in your wallet
                </p>
              </div>
            </div>
          )}

          {/* Header with Close Button */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Connect Wallet
              </h2>
              <p className="text-gray-400 text-sm">
                Choose a wallet to create or access your smart account
              </p>
            </div>
            <button
              onClick={() => setShowModal(false)}
              disabled={isConnecting}
              className="text-gray-400 hover:text-white transition-colors text-2xl leading-none disabled:opacity-50 disabled:cursor-not-allowed ml-4"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/50 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Wallet Buttons */}
          <div className="space-y-3">
            {walletItems.map((wallet) => (
              <WalletButton
                key={wallet.id}
                icon={wallet.logo}
                name={wallet.name}
                onClick={() => {
                  if (wallet.isAvailable) {
                    connect(wallet.connector);
                  } else {
                    // Show message to install wallet
                    alert(`${wallet.name} is not installed. Please install ${wallet.name} to continue.`);
                  }
                }}
                disabled={isConnecting || !wallet.isAvailable}
                isAvailable={wallet.isAvailable}
              />
            ))}
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-white/10">
            <p className="text-gray-400 text-xs text-center">
              By connecting, you agree to the Terms of Service
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface WalletButtonProps {
  icon: React.ReactNode;
  name: string;
  onClick: () => void;
  disabled: boolean;
  isAvailable?: boolean;
}

function WalletButton({ icon, name, onClick, disabled, isAvailable = true }: WalletButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full h-[60px] bg-gray-900/50 border rounded-lg px-4 py-3 text-white font-semibold text-base flex items-center justify-between transition-all duration-200 ease-in-out ${
        disabled || !isAvailable
          ? 'opacity-50 cursor-not-allowed border-white/10'
          : 'hover:bg-white/10 hover:border-cyan-400/30 hover:scale-[1.02] border-white/10'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-6 h-6">
          {icon}
        </div>
        <span>{name}</span>
      </div>
      {!isAvailable && (
        <span className="text-xs text-gray-400">Not installed</span>
      )}
    </button>
  );
}
