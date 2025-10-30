"use client";

import {
  useBrowserWallet,
  type BrowserWalletAuthentication,
} from "@burnt-labs/abstraxion";
import { KeplrLogo } from "./icons/KeplrLogo";
import { OKXLogo } from "./icons/OKXLogo";
import { MetamaskLogo } from "./icons/MetamaskLogo";

interface WalletModalProps {
  authentication: BrowserWalletAuthentication;
}

/**
 * Combined wallet selection modal component.
 * Uses the abstraxion hook to get state and renders the wallet selection UI.
 */
export function WalletModal({ authentication }: WalletModalProps) {
  const {
    showWalletSelectionModal,
    setShowWalletSelectionModal,
    walletSelectionError,
    handleWalletConnect,
    isConnecting,
  } = useBrowserWallet();

  console.log('[WalletModal] Render state:', {
    showWalletSelectionModal,
    isConnecting,
    shouldRender: showWalletSelectionModal || isConnecting
  });

  // Don't render if modal shouldn't be shown AND we're not in the middle of connecting
  // Keep modal open during connection even if showWalletSelectionModal becomes false
  if (!showWalletSelectionModal && !isConnecting) {
    console.log('[WalletModal] ❌ Not rendering - both flags are false');
    return null;
  }

  const wallets = authentication.wallets || [];
  const error = walletSelectionError;
  // Map wallet IDs to logos
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-lg">
      {/* Backdrop - click to close (disabled when connecting) */}
      <div
        className="fixed inset-0"
        onClick={() => !isConnecting && setShowWalletSelectionModal(false)}
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
              onClick={() => setShowWalletSelectionModal(false)}
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
            {wallets.map((wallet) => (
              <WalletButton
                key={wallet.id}
                icon={wallet.icon || getWalletLogo(wallet.id)}
                name={wallet.name}
                onClick={() => handleWalletConnect(wallet.id)}
                disabled={isConnecting}
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
}

function WalletButton({ icon, name, onClick, disabled }: WalletButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full h-[60px] bg-gray-900/50 hover:bg-white/10 border border-white/10 hover:border-cyan-400/30 rounded-lg px-4 py-3 text-white font-semibold text-base flex items-center gap-3 transition-all duration-200 ease-in-out hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-900/50 disabled:hover:border-white/10 disabled:hover:scale-100"
    >
      <div className="flex items-center justify-center w-6 h-6">
        {icon}
      </div>
      <span>{name}</span>
    </button>
  );
}
