"use client";

export const dynamic = "force-dynamic";

import { AbstraxionProvider } from "@burnt-labs/abstraxion-react";

const popupModeConfig = {
  chainId: process.env.NEXT_PUBLIC_CHAIN_ID!,
  treasury: process.env.NEXT_PUBLIC_TREASURY_ADDRESS,
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL,
  restUrl: process.env.NEXT_PUBLIC_REST_URL,
  gasPrice: process.env.NEXT_PUBLIC_GAS_PRICE,

  authentication: {
    type: "auto" as const,
    authAppUrl: process.env.NEXT_PUBLIC_AUTH_APP_URL,
  },
};

export default function ManageAuthenticatorsLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <AbstraxionProvider config={popupModeConfig}>{children}</AbstraxionProvider>
  );
}
