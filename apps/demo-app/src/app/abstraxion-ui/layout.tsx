"use client";
import { AbstraxionProvider } from "@burnt-labs/abstraxion-react";

const redirectModeConfig = {
  chainId: process.env.NEXT_PUBLIC_CHAIN_ID!,
  treasury: process.env.NEXT_PUBLIC_TREASURY_ADDRESS,
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL,
  restUrl: process.env.NEXT_PUBLIC_REST_URL,
  gasPrice: process.env.NEXT_PUBLIC_GAS_PRICE,
};

export default function AbstraxionUILayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <AbstraxionProvider config={redirectModeConfig}>
      {children}
    </AbstraxionProvider>
  );
}
