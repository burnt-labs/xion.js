'use client';

import React from 'react';
import { Providers as TurnkeyProviders } from './providers';
import { AbstraxionProvider } from '@burnt-labs/abstraxion';
import { useTurnkeyForAbstraxion, TurnkeySigningMethod } from '../../hooks/useTurnkeyForAbstraxion';

function AbstraxionWrapper({
  children,
  signingMethod
}: {
  children: React.ReactNode;
  signingMethod: TurnkeySigningMethod;
}) {
  const { getSignerConfig, isReady } = useTurnkeyForAbstraxion(signingMethod);

  const config = {
    chainId: process.env.NEXT_PUBLIC_CHAIN_ID!,
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL!,
    restUrl: process.env.NEXT_PUBLIC_REST_URL!,
    gasPrice: process.env.NEXT_PUBLIC_GAS_PRICE!,

    authentication: {
      type: 'signer' as const,
      aaApiUrl: process.env.NEXT_PUBLIC_AA_API_URL!,
      getSignerConfig,
      autoConnect: false, // Manual login - wait for user to click connect
    },

    // Indexer configuration - required to find existing accounts (fast)
    // Supports both Numia (with token) and Subquery (without token)
    indexer: (() => {
      if (!process.env.NEXT_PUBLIC_INDEXER_URL) return undefined;

      // If type is explicitly set to subquery, use Subquery
      if (process.env.NEXT_PUBLIC_INDEXER_TYPE === 'subquery') {
        return {
          type: 'subquery' as const,
          url: process.env.NEXT_PUBLIC_INDEXER_URL,
          rpcUrl: process.env.NEXT_PUBLIC_RPC_URL,
        };
      }

      // Otherwise, use Numia (default)
      if (process.env.NEXT_PUBLIC_INDEXER_TOKEN) {
        return {
          type: 'numia' as const,
          url: process.env.NEXT_PUBLIC_INDEXER_URL,
          authToken: process.env.NEXT_PUBLIC_INDEXER_TOKEN,
        };
      }

      return undefined;
    })(),

    // Treasury indexer configuration - for fetching grant configs from DaoDao indexer (fast)
    treasuryIndexer: process.env.NEXT_PUBLIC_TREASURY_INDEXER_URL ? {
      url: process.env.NEXT_PUBLIC_TREASURY_INDEXER_URL,
    } : undefined,

    // Local/RPC configuration - fallback for finding existing accounts (reliable)
    localConfig: process.env.NEXT_PUBLIC_CODE_ID && process.env.NEXT_PUBLIC_CHECKSUM ? {
      codeId: parseInt(process.env.NEXT_PUBLIC_CODE_ID),
      checksum: process.env.NEXT_PUBLIC_CHECKSUM,
      feeGranter: process.env.NEXT_PUBLIC_FEE_GRANTER_ADDRESS!,
      addressPrefix: process.env.NEXT_PUBLIC_ADDRESS_PREFIX || 'xion',
    } : undefined,

    // Optional: Treasury for automatic grants
    treasury: process.env.NEXT_PUBLIC_TREASURY_ADDRESS,

    // Optional: Fee granter - must match the fee granter configured in AA API
    feeGranter: process.env.NEXT_PUBLIC_FEE_GRANTER_ADDRESS,
  };

  return (
    <AbstraxionProvider config={config}>
      {children}
    </AbstraxionProvider>
  );
}

export default function SignerModeLayout({
  children
}: {
  children: React.ReactNode
}) {
  const signingMethod: TurnkeySigningMethod = 'raw-api';

  return (
    <TurnkeyProviders>
      <AbstraxionWrapper signingMethod={signingMethod}>
        {children}
      </AbstraxionWrapper>
    </TurnkeyProviders>
  );
}
