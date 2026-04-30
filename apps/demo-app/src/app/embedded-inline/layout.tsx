"use client";

export const dynamic = "force-dynamic";

import { AbstraxionProvider } from "@burnt-labs/abstraxion-react";

const embeddedModeConfig = {
  chainId: process.env.NEXT_PUBLIC_CHAIN_ID!,
  treasury: process.env.NEXT_PUBLIC_TREASURY_ADDRESS,
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL,
  restUrl: process.env.NEXT_PUBLIC_REST_URL,
  gasPrice: process.env.NEXT_PUBLIC_GAS_PRICE,

  authentication: {
    type: "embedded" as const,
    iframeUrl: process.env.NEXT_PUBLIC_IFRAME_URL,
  },
};

export default function EmbeddedInlineLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <AbstraxionProvider config={embeddedModeConfig}>
      {children}
    </AbstraxionProvider>
  );
}
