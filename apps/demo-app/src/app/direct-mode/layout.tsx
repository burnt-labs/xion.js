"use client";
import { useMemo } from "react";
import {
  AbstraxionProvider,
  type AbstraxionConfig,
} from "@burnt-labs/abstraxion";
import { WalletModal } from "../../components/WalletModal";

export default function DirectModeLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
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
      // Only include if BOTH url and authToken are provided
      ...(process.env.NEXT_PUBLIC_INDEXER_URL && process.env.NEXT_PUBLIC_INDEXER_TOKEN && {
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

      // Define wallets to support
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

      // Custom wallet selection UI - all state management and auto-close is handled internally!
      renderWalletSelection: ({ isOpen, onClose, wallets, connect, isConnecting, error }) => (
        <WalletModal
          isOpen={isOpen}
          onClose={onClose}
          wallets={wallets}
          onConnect={connect}
          loading={isConnecting}
          error={error}
        />
      ),
    },
  }), []);

  return (
    <AbstraxionProvider config={directModeConfig}>
      {children}
    </AbstraxionProvider>
  );
}
