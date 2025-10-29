'use client';

import React, { useState } from 'react';
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
    indexer: process.env.NEXT_PUBLIC_INDEXER_URL && process.env.NEXT_PUBLIC_INDEXER_TOKEN ? {
      url: process.env.NEXT_PUBLIC_INDEXER_URL,
      authToken: process.env.NEXT_PUBLIC_INDEXER_TOKEN,
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
  const [signingMethod, setSigningMethod] = useState<TurnkeySigningMethod>('viem');

  return (
    <TurnkeyProviders>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Signer Mode Demo</h1>
            <p className="text-sm text-gray-600 mt-1">
              Testing Turnkey + Abstraxion integration
            </p>

            <div className="mt-3 flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">
                Signing Method:
              </label>
              <select
                value={signingMethod}
                onChange={(e) => setSigningMethod(e.target.value as TurnkeySigningMethod)}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="viem">Viem (Recommended)</option>
                <option value="raw-api">Raw API</option>
              </select>
              <span className="text-xs text-gray-500">
                {signingMethod === 'viem' ? 'Using @turnkey/viem' : 'Using signRawPayload API'}
              </span>
            </div>
          </div>
        </header>

        <AbstraxionWrapper signingMethod={signingMethod}>
          {children}
        </AbstraxionWrapper>
      </div>
    </TurnkeyProviders>
  );
}
