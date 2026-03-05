"use client";
import { AbstraxionProvider } from "@burnt-labs/abstraxion";

/**
 * Inline iframe mode — embeds the dashboard inside an iframe on the page.
 *
 * The user authenticates and approves grants inside the iframe. The dApp
 * controls where and how big the iframe is via a container element.
 * Auth completion is signaled via postMessage (CONNECT_SUCCESS).
 *
 * Auth app URL defaults to localhost:3000 for local development.
 * Override with NEXT_PUBLIC_IFRAME_URL env var for deployed dashboards.
 */
const inlineModeConfig = {
  chainId: "xion-testnet-2",
  treasury: process.env.NEXT_PUBLIC_TREASURY_ADDRESS,
  rpcUrl:
    process.env.NEXT_PUBLIC_RPC_URL ||
    "https://rpc.xion-testnet-2.burnt.com:443",
  restUrl:
    process.env.NEXT_PUBLIC_REST_URL || "https://api.xion-testnet-2.burnt.com",
  gasPrice: process.env.NEXT_PUBLIC_GAS_PRICE || "0.001uxion",

  authentication: {
    type: "iframe" as const,
    iframeUrl: process.env.NEXT_PUBLIC_IFRAME_URL || "http://localhost:3000",
  },
};

export default function InlineDemoLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <AbstraxionProvider config={inlineModeConfig}>
      {children}
    </AbstraxionProvider>
  );
}
