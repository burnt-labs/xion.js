"use client";

import { useEffect } from "react";
import type { WalletConnectionMethods, GenericWalletConfig } from "@burnt-labs/abstraxion";
import { KeplrLogo } from "./icons/KeplrLogo";
import { LeapLogo } from "./icons/LeapLogo";
import { OKXLogo } from "./icons/OKXLogo";
import { MetamaskLogo } from "./icons/MetamaskLogo";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectionMethods: WalletConnectionMethods | null;
  chainId: string;
}

// Define wallet configurations using the generic interface
const WALLET_CONFIGS: GenericWalletConfig[] = [
  {
    name: "MetaMask",
    windowKey: "ethereum",
    signingMethod: "ethereum",
  },
  {
    name: "Keplr",
    windowKey: "keplr",
    signingMethod: "cosmos",
  },
  {
    name: "OKX",
    windowKey: "okxwallet.keplr",
    signingMethod: "cosmos",
  },
];

export function WalletModal({
  isOpen,
  onClose,
  connectionMethods,
  chainId,
}: WalletModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !connectionMethods) return null;

  const { connectWallet, isConnecting, error } = connectionMethods;

  // Map wallet configs to logos
  const getWalletLogo = (walletName: string) => {
    switch (walletName) {
      case "MetaMask":
        return <MetamaskLogo className="w-6 h-6" />;
      case "Keplr":
        return <KeplrLogo className="w-6 h-6" />;
      case "Leap":
        return <LeapLogo className="w-6 h-6" />;
      case "OKX":
        return <OKXLogo className="w-6 h-6" />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-[#0A0A0A] border border-white/10 rounded-2xl w-full max-w-md p-6 pointer-events-auto shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-bold text-white">
                Connect Wallet
              </h2>
              <button
                onClick={onClose}
                className="text-white/50 hover:text-white transition-colors p-1"
                aria-label="Close"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M15 5L5 15M5 5L15 15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
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

          {/* Wallet Buttons - Now using generic connectWallet */}
          <div className="space-y-3">
            {WALLET_CONFIGS.map((wallet) => (
              <WalletButton
                key={wallet.name}
                icon={getWalletLogo(wallet.name)}
                name={wallet.name}
                onClick={() => connectWallet(wallet, chainId)}
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
    </>
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
