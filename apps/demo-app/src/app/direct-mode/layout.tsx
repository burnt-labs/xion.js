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
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL!,

    // REQUIRED: REST API endpoint
    restUrl: process.env.NEXT_PUBLIC_REST_URL!,

    // REQUIRED: Gas price
    gasPrice: process.env.NEXT_PUBLIC_GAS_PRICE || "0.001uxion",

    // Treasury contract address (optional - for dynamic grant configs)
    treasury: process.env.NEXT_PUBLIC_TREASURY_ADDRESS,

    // Fee granter address (optional - pays transaction fees for grant creation)
    feeGranter: process.env.NEXT_PUBLIC_FEE_GRANTER_ADDRESS,

    // Enable direct mode for in-app wallet connections
    walletAuth: {
      mode: "direct" as const,

      // Point to local AA API for development
      aaApiUrl: process.env.NEXT_PUBLIC_AA_API_URL,

      // Indexer configuration for account lookup (optional but recommended)
      ...(process.env.NEXT_PUBLIC_INDEXER_URL && {
        indexer: {
          url: process.env.NEXT_PUBLIC_INDEXER_URL,
          authToken: process.env.NEXT_PUBLIC_INDEXER_TOKEN,
        },
      }),

      // Local configuration for RPC fallback (required for direct chain queries)
      ...(process.env.NEXT_PUBLIC_CHECKSUM && process.env.NEXT_PUBLIC_FEE_GRANTER_ADDRESS && {
        localConfig: {
          codeId: Number(process.env.NEXT_PUBLIC_CODE_ID) || 1,
          checksum: process.env.NEXT_PUBLIC_CHECKSUM,
          feeGranter: process.env.NEXT_PUBLIC_FEE_GRANTER_ADDRESS,
          addressPrefix: process.env.NEXT_PUBLIC_ADDRESS_PREFIX || "xion",
        },
      }),

      // Use custom strategy to show our custom wallet modal
      walletSelectionStrategy: "custom" as const,

      // Define wallets to support in the custom modal
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
