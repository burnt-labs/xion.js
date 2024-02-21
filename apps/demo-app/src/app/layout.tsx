"use client";
import "./globals.css";
import { Inter } from "next/font/google";
import { AbstraxionProvider } from "@burnt-labs/abstraxion";
import "@burnt-labs/abstraxion/dist/index.css";

const inter = Inter({ subsets: ["latin"] });

// Example XION seat contract
const seatContractAddress =
  "xion1z70cvc08qv5764zeg3dykcyymj5z6nu4sqr7x8vl4zjef2gyp69s9mmdka";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AbstraxionProvider
          config={{
            contracts: [
              // Usually, you would have a list of different contracts here
              seatContractAddress,
              {
                address: seatContractAddress,
                amounts: [{ denom: "uxion", amount: "1000000" }],
              },
            ],
          }}
        >
          {children}
        </AbstraxionProvider>
      </body>
    </html>
  );
}
