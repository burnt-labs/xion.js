"use client";
import { AbstraxionProvider } from "@burnt-labs/abstraxion";

// Redirect mode configuration (OAuth dashboard flow)
const redirectModeConfig = {
  chainId: "xion-testnet-2",
  treasury: process.env.NEXT_PUBLIC_TREASURY_ADDRESS,
  rpcUrl:
    process.env.NEXT_PUBLIC_RPC_URL ||
    "https://rpc.xion-testnet-2.burnt.com:443",
  restUrl:
    process.env.NEXT_PUBLIC_REST_URL || "https://api.xion-testnet-2.burnt.com",
  gasPrice: process.env.NEXT_PUBLIC_GAS_PRICE || "0.001uxion",

  // Authentication defaults to redirect mode if not specified
  // This demonstrates the traditional OAuth flow through the dashboard
};

export default function LoadingStatesLayout({
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
