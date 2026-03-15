"use client";
import { AbstraxionProvider } from "@burnt-labs/abstraxion";

const autoModeConfig = {
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

export default function PopupDemoLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <AbstraxionProvider config={autoModeConfig}>{children}</AbstraxionProvider>
  );
}
