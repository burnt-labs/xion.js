"use client";
import "./globals.css";
import { Inter } from "next/font/google";
import { AbstraxionProvider } from "@burnt-labs/abstraxion";

const inter = Inter({ subsets: ["latin"] });

// Treasury configuration from environment variables
const treasuryConfig = {
  chainId: "xion-testnet-1",
  treasury: process.env.NEXT_PUBLIC_TREASURY_ADDRESS,
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.xion-testnet-2.burnt.com:443",
  restUrl: process.env.NEXT_PUBLIC_REST_URL || "https://api.xion-testnet-2.burnt.com",
  gasPrice: process.env.NEXT_PUBLIC_GAS_PRICE || "0.001uxion",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AbstraxionProvider config={treasuryConfig}>
          {children}
        </AbstraxionProvider>
      </body>
    </html>
  );
}
