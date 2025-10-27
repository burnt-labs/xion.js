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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      {/* Backdrop - click to close (disabled when connecting) */}
      <div
        className="fixed inset-0"
        onClick={() => !isConnecting && setShowWalletSelectionModal(false)}
      />

      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-md mx-auto px-4">
        <div className="bg-gray-900/95 border border-white/10 rounded-2xl p-6 shadow-2xl">
          {/* Loading Overlay */}
          {isConnecting && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl">
              <div className="mx-4 max-w-sm rounded-lg border border-blue-500/30 bg-blue-500/10 p-6 text-center backdrop-blur-md">
                <div className="mb-4">
                  <div className="mx-auto flex h-12 w-12 animate-pulse items-center justify-center rounded-full border-4 border-blue-500/30 bg-blue-500/20">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-400 border-r-transparent"></div>
                  </div>
                </div>
                <p className="font-bold text-blue-400">Connecting Wallet</p>
                <p className="mt-2 text-sm text-gray-400">
                  Please approve the connection and sign the grant creation transaction in your wallet
                </p>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">
              Connect Wallet
            </h2>
            <p className="text-white/60 text-sm">
              Choose a wallet to create or access your smart account
            </p>
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
          <div className="mt-6 pt-4 border-t border-white/5">
            <p className="text-white/40 text-xs text-center">
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
      className="w-full h-[60px] bg-white/[0.05] hover:bg-white/[0.12] border border-white/10 hover:border-white/20 rounded-xl px-4 py-3 text-white font-semibold text-base flex items-center gap-3 transition-all duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/[0.05] disabled:hover:border-white/10"
    >
      <div className="flex items-center justify-center w-6 h-6">
        {icon}
      </div>
      <span>{name}</span>
    </button>
  );
}
