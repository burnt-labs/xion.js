"use client";

export const dynamic = "force-dynamic";

import React from "react";
import { Providers as MetamaskProviders } from "./providers";
import { AbstraxionProvider } from "@burnt-labs/abstraxion-react";
import { useMetamaskAuth } from "./providers";

function AbstraxionWrapper({ children }: { children: React.ReactNode }) {
  const { metamask } = useMetamaskAuth();
  const { getSignerConfig } = metamask;

  // Runtime validation for required environment variables
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      if (
        !process.env.NEXT_PUBLIC_CODE_ID ||
        !process.env.NEXT_PUBLIC_CHECKSUM
      ) {
        console.error(
          "Smart account contract config is required for signer mode. Please provide NEXT_PUBLIC_CODE_ID and NEXT_PUBLIC_CHECKSUM.",
        );
      }
    }
  }, []);

  // Build indexer config (supports both Numia and Subquery)
  const indexerConfig = (() => {
    if (!process.env.NEXT_PUBLIC_INDEXER_URL) return undefined;

    if (process.env.NEXT_PUBLIC_INDEXER_TYPE === "subquery") {
      if (!process.env.NEXT_PUBLIC_CODE_ID) {
        throw new Error(
          "NEXT_PUBLIC_CODE_ID is required when using Subquery indexer",
        );
      }
      return {
        type: "subquery" as const,
        url: process.env.NEXT_PUBLIC_INDEXER_URL,
        codeId: parseInt(process.env.NEXT_PUBLIC_CODE_ID),
      };
    }

    if (process.env.NEXT_PUBLIC_INDEXER_TOKEN) {
      return {
        type: "numia" as const,
        url: process.env.NEXT_PUBLIC_INDEXER_URL,
        authToken: process.env.NEXT_PUBLIC_INDEXER_TOKEN,
      };
    }

    return undefined;
  })();

  const smartAccountContractConfig = {
    codeId: parseInt(process.env.NEXT_PUBLIC_CODE_ID ?? "0"),
    checksum: process.env.NEXT_PUBLIC_CHECKSUM ?? "",
    addressPrefix: process.env.NEXT_PUBLIC_ADDRESS_PREFIX ?? "xion",
  };

  const config = {
    chainId: process.env.NEXT_PUBLIC_CHAIN_ID!,
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL,
    restUrl: process.env.NEXT_PUBLIC_REST_URL,
    gasPrice: process.env.NEXT_PUBLIC_GAS_PRICE,

    authentication: {
      type: "signer" as const,
      aaApiUrl: process.env.NEXT_PUBLIC_AA_API_URL!,
      getSignerConfig,
      smartAccountContract: smartAccountContractConfig,
      indexer: indexerConfig,
      treasuryIndexer: process.env.NEXT_PUBLIC_TREASURY_INDEXER_URL
        ? {
            url: process.env.NEXT_PUBLIC_TREASURY_INDEXER_URL,
          }
        : undefined,
    },

    feeGranter: process.env.NEXT_PUBLIC_FEE_GRANTER_ADDRESS,
    treasury: process.env.NEXT_PUBLIC_TREASURY_ADDRESS,
  };

  return <AbstraxionProvider config={config}>{children}</AbstraxionProvider>;
}

export default function DirectSigningDemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MetamaskProviders>
      <AbstraxionWrapper>{children}</AbstraxionWrapper>
    </MetamaskProviders>
  );
}
