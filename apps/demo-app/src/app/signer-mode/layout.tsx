"use client";

import React from "react";
import { Providers as TurnkeyProviders } from "./providers";
import { AbstraxionProvider } from "@burnt-labs/abstraxion";
import {
  useTurnkeyForAbstraxion,
  TurnkeySigningMethod,
} from "../../hooks/useTurnkeyForAbstraxion";

function AbstraxionWrapper({
  children,
  signingMethod,
}: {
  children: React.ReactNode;
  signingMethod: TurnkeySigningMethod;
}) {
  const { getSignerConfig } = useTurnkeyForAbstraxion(signingMethod);

  // Runtime validation for required environment variables
  // Only check in browser to avoid build-time errors
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

    // If type is explicitly set to subquery, use Subquery
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

    // Otherwise, use Numia (default)
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

export default function SignerModeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const signingMethod: TurnkeySigningMethod = "viem";
  // Can set the above to 'raw-api' if you want to use the Turnkey Raw API for signing and limit imports
  // see /hooks/useTurnkeyRawAPI.ts and /hooks/useTurnkeyViem.ts for more details

  return (
    <TurnkeyProviders>
      <AbstraxionWrapper signingMethod={signingMethod}>
        {children}
      </AbstraxionWrapper>
    </TurnkeyProviders>
  );
}
