import type { Metadata } from "next";
import localFont from "next/font/local";
import { Providers } from "./providers";
import "./globals.css";
import "@burnt-labs/ui/dist/index.css";
import { Analytics } from "@vercel/analytics/react";
import { AbstraxionProvider } from "@burnt-labs/abstraxion";

const akkuratLL = localFont({
  src: [
    {
      path: "../public/fonts/AkkuratLLWeb-Thin.woff2",
      weight: "100",
    },
    {
      path: "../public/fonts/AkkuratLLWeb-Light.woff2",
      weight: "200 300",
    },
    {
      path: "../public/fonts/AkkuratLLWeb-Regular.woff2",
      weight: "400",
    },
    {
      path: "../public/fonts/AkkuratLLWeb-Bold.woff2",
      weight: "500 700",
    },
    {
      path: "../public/fonts/AkkuratLLWeb-Black.woff2",
      weight: "800 900",
    },
  ],
  variable: "--font-akkuratLL",
});

export const metadata: Metadata = {
  title: "XION Account Dashboard",
  description: "A dashboard for managing XION accounts.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={akkuratLL.variable}>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
