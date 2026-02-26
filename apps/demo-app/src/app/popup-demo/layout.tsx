"use client";
import { AbstraxionProvider } from "@burnt-labs/abstraxion";

/**
 * Popup mode — opens the auth app in a popup window.
 *
 * Functionally identical to redirect mode but the user stays on the dApp page.
 * The popup handles login + grant approval, then postMessages CONNECT_SUCCESS back
 * to the opener and closes itself.
 *
 * Auth app URL defaults to the chain-specific dashboard URL from constants.
 * Override with the authAppUrl option if using a local or custom deployment.
 */
const popupModeConfig = {
  chainId: "xion-testnet-2",
  treasury: process.env.NEXT_PUBLIC_TREASURY_ADDRESS,
  rpcUrl:
    process.env.NEXT_PUBLIC_RPC_URL ||
    "https://rpc.xion-testnet-2.burnt.com:443",
  restUrl:
    process.env.NEXT_PUBLIC_REST_URL || "https://api.xion-testnet-2.burnt.com",
  gasPrice: process.env.NEXT_PUBLIC_GAS_PRICE || "0.001uxion",

  authentication: {
    type: "popup" as const,
    authAppUrl: "http://localhost:3000",
  },
};

export default function PopupDemoLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <AbstraxionProvider config={popupModeConfig}>
      {children}
    </AbstraxionProvider>
  );
}
