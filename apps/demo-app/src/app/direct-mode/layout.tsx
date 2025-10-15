"use client";
import { useState, useEffect, useMemo } from "react";
import {
  AbstraxionProvider,
  type AbstraxionConfig,
  type WalletConnectionMethods,
  useAbstraxionAccount,
} from "@burnt-labs/abstraxion";
import { WalletModal } from "../../components/WalletModal";

export default function DirectModeLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletMethods, setWalletMethods] = useState<WalletConnectionMethods | null>(null);

  // Direct mode configuration with treasury contract
  const directModeConfig: AbstraxionConfig = useMemo(() => ({
    // REQUIRED: Chain ID
    chainId: "xion-testnet-2",

    // REQUIRED: RPC URL for blockchain connection
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.xion-testnet-2.burnt.com:443",

    // REQUIRED: REST API endpoint
    restUrl: process.env.NEXT_PUBLIC_REST_URL || "https://api.xion-testnet-2.burnt.com",

    // REQUIRED: Gas price
    gasPrice: "0.001uxion",

    // Treasury contract address (optional - for dynamic grant configs)
    treasury: process.env.NEXT_PUBLIC_TREASURY_ADDRESS,

    // Fee granter address (optional - pays transaction fees for grant creation)
    // Must match the FEE_GRANTER_ADDRESS used by your AA API
    feeGranter:
      process.env.NEXT_PUBLIC_FEE_GRANTER_ADDRESS ||
      "xion10y5pzqs0jn89zpm6va625v6xzsqjkm293efwq8",

    // Enable direct mode for in-app wallet connections
    walletAuth: {
      mode: "direct" as const,

      // Point to local AA API for development
      aaApiUrl: "http://localhost:8787",

      // Use custom strategy to show our custom wallet modal
      walletSelectionStrategy: "custom" as const,

      // Define wallets to support (optional - defaults to MetaMask + Keplr for auto mode)
      // You can add any Ethereum or Cosmos wallet by specifying its window key!
      wallets: [
        { name: "MetaMask", windowKey: "ethereum", signingMethod: "ethereum" },
        { name: "Keplr", windowKey: "keplr", signingMethod: "cosmos" },
        { name: "OKX", windowKey: "okxwallet.keplr", signingMethod: "cosmos" },
        // Example: Add Leap wallet (Cosmos)
        // { name: "Leap", windowKey: "leap", signingMethod: "cosmos" },
        // Example: Add Rainbow wallet (Ethereum)
        // { name: "Rainbow", windowKey: "ethereum", signingMethod: "ethereum" },
        // Example: Add Compass wallet (Cosmos)
        // { name: "Compass", windowKey: "compass", signingMethod: "cosmos" },
      ],

      // Custom wallet selection callback - shows our modal
      onWalletSelectionRequired: (methods) => {
        setWalletMethods(methods);
        setShowWalletModal(true);
      },
    },
  }), []);

  return (
    <AbstraxionProvider config={directModeConfig}>
      <ModalHandler
        showWalletModal={showWalletModal}
        setShowWalletModal={setShowWalletModal}
        walletMethods={walletMethods}
      >
        {children}
      </ModalHandler>
    </AbstraxionProvider>
  );
}

// Component inside provider that can access context to close modal on connection
function ModalHandler({
  children,
  showWalletModal,
  setShowWalletModal,
  walletMethods,
}: {
  children: React.ReactNode;
  showWalletModal: boolean;
  setShowWalletModal: (show: boolean) => void;
  walletMethods: WalletConnectionMethods | null;
}) {
  const { isConnected } = useAbstraxionAccount();

  // Close modal when connection succeeds
  useEffect(() => {
    if (isConnected && showWalletModal) {
      setShowWalletModal(false);
    }
  }, [isConnected, showWalletModal, setShowWalletModal]);

  return (
    <>
      {children}

      {/* Custom Wallet Selection Modal */}
      <WalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        connectionMethods={walletMethods}
        chainId="xion-testnet-1"
      />
    </>
  );
}
