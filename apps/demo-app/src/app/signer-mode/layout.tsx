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

  // This defines the contract parameters needed for smart account creation
  const smartAccountContractConfig =
    process.env.NEXT_PUBLIC_CODE_ID && process.env.NEXT_PUBLIC_CHECKSUM
      ? {
          codeId: parseInt(process.env.NEXT_PUBLIC_CODE_ID),
          checksum: process.env.NEXT_PUBLIC_CHECKSUM,
          addressPrefix: process.env.NEXT_PUBLIC_ADDRESS_PREFIX || "xion",
        }
      : undefined;

  if (!smartAccountContractConfig) {
    throw new Error(
      "Smart account contract config is required for signer mode. Please provide NEXT_PUBLIC_CODE_ID and NEXT_PUBLIC_CHECKSUM.",
    );
  }

  const config = {
    // Chain configuration (can be simplified - defaults filled in by normalizeAbstraxionConfig)
    chainId: process.env.NEXT_PUBLIC_CHAIN_ID!,
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL!,
    restUrl: process.env.NEXT_PUBLIC_REST_URL!,
    gasPrice: process.env.NEXT_PUBLIC_GAS_PRICE!,

    // Signer-mode configuration
    authentication: {
      type: "signer" as const,

      // AA API URL for account creation
      aaApiUrl: process.env.NEXT_PUBLIC_AA_API_URL!,

      // Function that returns signer configuration (from Turnkey)
      getSignerConfig,

      // Smart account contract configuration (codeId, checksum, addressPrefix)
      smartAccountContract: smartAccountContractConfig,

      // Indexer configuration for account discovery (optional - falls back to RPC if not provided)
      indexer: indexerConfig,

      // Treasury indexer configuration - for fetching grant configs from DaoDao indexer (fast)
      // Optional - falls back to direct RPC queries if not provided
      treasuryIndexer: process.env.NEXT_PUBLIC_TREASURY_INDEXER_URL
        ? {
            url: process.env.NEXT_PUBLIC_TREASURY_INDEXER_URL,
          }
        : undefined,
    },

    // Fee granter - for both grant creation and smart account creation
    // Must match the fee granter configured in AA API
    feeGranter: process.env.NEXT_PUBLIC_FEE_GRANTER_ADDRESS,

    // Treasury configuration (optional)
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
