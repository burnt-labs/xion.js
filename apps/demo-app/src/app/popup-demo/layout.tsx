"use client";
import { AbstraxionProvider } from "@burnt-labs/abstraxion";

/**
 * Auto mode — popup on desktop, redirect on mobile/PWA.
 *
 * The "auto" authentication type detects the environment and resolves to:
 * - Desktop browsers → popup (user stays on this page)
 * - Mobile / PWA → redirect (navigates to auth app and back)
 *
 * Auth app URL defaults to the chain-specific dashboard URL from constants.
 * Override with the authAppUrl option if using a local or custom deployment.
 */
const autoModeConfig = {
  chainId: "xion-testnet-2",
  treasury: process.env.NEXT_PUBLIC_TREASURY_ADDRESS,
  rpcUrl:
    process.env.NEXT_PUBLIC_RPC_URL ||
    "https://rpc.xion-testnet-2.burnt.com:443",
  restUrl:
    process.env.NEXT_PUBLIC_REST_URL || "https://api.xion-testnet-2.burnt.com",
  gasPrice: process.env.NEXT_PUBLIC_GAS_PRICE || "0.001uxion",

  authentication: {
    type: "auto" as const,
    authAppUrl: "http://localhost:3000",
  },
};

export default function PopupDemoLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <AbstraxionProvider config={autoModeConfig}>
      {children}
    </AbstraxionProvider>
  );
}
