"use client";
import { useMemo } from "react";
import {
  AbstraxionProvider,
  type AbstraxionConfig,
  type BrowserWalletAuthentication,
  BUILT_IN_WALLETS,
} from "@burnt-labs/abstraxion";
import { WalletModal } from "../../components/WalletModal";

export default function DirectModeLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  // Browser wallet authentication configuration
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

    authentication: {
      type: "browser",
      aaApiUrl: process.env.NEXT_PUBLIC_AA_API_URL,
      autoConnect: false, // Show wallet selection UI

      // Use built-in wallet definitions
      wallets: [
        BUILT_IN_WALLETS.metamask,
        BUILT_IN_WALLETS.keplr,
        BUILT_IN_WALLETS.okx,
      ],
    },
  }), []);

  return (
    <AbstraxionProvider config={directModeConfig}>
      {children}
      {/* Wallet modal - renders when login() is called */}
      (
        <WalletModal
          authentication={directModeConfig.authentication as BrowserWalletAuthentication}
        />
      )
    </AbstraxionProvider>
  );
}
