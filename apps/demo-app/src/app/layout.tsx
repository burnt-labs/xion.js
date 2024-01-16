"use client";
import "./globals.css";
import { Inter } from "next/font/google";
import { AbstraxionProvider } from "@burnt-labs/abstraxion";
import "@burnt-labs/abstraxion/styles.css";

const inter = Inter({ subsets: ["latin"] });

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
              "xion1ly5vunf97qzevm6cu8jq3c5ltj2mlwf4s7g6x5du4atd206m2w0qf2hxsz",
              "xion1ug4wpsjpn9k0r9rcdx5dq39h6hhe9uvwn3z0gfqnpz6xxvw3cd3sygy3x6",
            ],
            dashboardUrl: "https://dashboard.burnt.com",
          }}
        >
          {children}
        </AbstraxionProvider>
      </body>
    </html>
  );
}
