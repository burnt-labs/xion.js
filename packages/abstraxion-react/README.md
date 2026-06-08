# @burnt-labs/abstraxion-react

The `abstraxion-react` library is the React wrapper for Abstraxion account abstraction on XION. It provides the React provider, embed component, and hooks for creating abstract accounts and signing transactions while delegating framework-agnostic controller logic to `@burnt-labs/abstraxion-js`.

## Migrating from `@burnt-labs/abstraxion`

Starting with the v1 alpha line, this package was **renamed** from `@burnt-labs/abstraxion` to `@burnt-labs/abstraxion-react`. The public surface (provider, hooks, `<AbstraxionEmbed>`, config shape) is unchanged — the migration is a one-line find/replace in your imports plus a `package.json` dependency swap:

```diff
- import { AbstraxionProvider, useAbstraxionAccount } from "@burnt-labs/abstraxion";
+ import { AbstraxionProvider, useAbstraxionAccount } from "@burnt-labs/abstraxion-react";
```

If you also depended on `@burnt-labs/ui` for the legacy `<Abstraxion>` modal, that package is deprecated in v1; use `<AbstraxionEmbed>` from this package instead.

## Installation

Run the following:

```
npm i @burnt-labs/abstraxion-react
```

## Xion Quick Start Integration

If you're new to Xion blockchain development, we recommend using our Quick Start tool before integrating Abstraxion into your custom project.

Visit [quickstart.dev.testnet.burnt.com](https://quickstart.dev.testnet.burnt.com) to deploy the necessary contracts (UserMap and treasury) with a single click, and automatically generate the environment variables required for Abstraxion integration.

This tool eliminates the complexity of manual contract deployment and configuration, allowing you to start building with Abstraxion immediately. The deployed contracts provide gasless transactions and data storage capabilities essential for most dApps.

For full documentation on the Quick Start approach, see our [Zero to dApp in 5 Minutes](https://docs.burnt.com/xion/developers/xion-quick-start/zero-to-dapp-in-5-minutes/launch-a-user-map-dapp-on-xion-in-5-minutes) guide.

## Basic Usage

First, wrap your app in the `AbstraxionProvider` at the top level with the appropriate config

```
"use client";
import "./globals.css";
import { Inter } from "next/font/google";
import { AbstraxionProvider } from "@burnt-labs/abstraxion-react";

const inter = Inter({ subsets: ["latin"] });

// Example XION seat contract
const seatContractAddress =
  "xion1z70cvc08qv5764zeg3dykcyymj5z6nu4sqr7x8vl4zjef2gyp69s9mmdka";

// Legacy config with individual params for stake, bank and contracts
const legacyConfig = {
  contracts: [
    // Usually, you would have a list of different contracts here
    seatContractAddress,
    {
      address: seatContractAddress,
      amounts: [{ denom: "uxion", amount: "1000000" }],
    },
  ],
  stake: true,
  bank: [
    {
      denom: "uxion",
      amount: "1000000",
    },
  ],
  // Optional params to activate mainnet config
  // rpcUrl: "https://rpc.xion-mainnet-1.burnt.com:443",
  // restUrl: "https://api.xion-mainnet-1.burnt.com:443",
};

// New treasury contract config
const treasuryConfig = {
  treasury: "xion17ah4x9te3sttpy2vj5x6hv4xvc0td526nu0msf7mt3kydqj4qs2s9jhe90", // Example XION treasury contract
  // Optional params to activate mainnet config
  // rpcUrl: "https://rpc.xion-mainnet-1.burnt.com:443",
  // restUrl: "https://api.xion-mainnet-1.burnt.com:443",
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
```

Then, use the exported hooks and iframe embed to drive the auth flow:

```
"use client";
import {
  AbstraxionEmbed,
  useAbstraxionAccount,
  useAbstraxionSigningClient,
} from "@burnt-labs/abstraxion-react";

export default function Home() {
  const { data: account } = useAbstraxionAccount();
  const { client } = useAbstraxionSigningClient();

  return (
    <div>
      <AbstraxionEmbed />
      <p>{account?.bech32Address}</p>
    </div>
  );
}

```

You can also call the exported hooks directly in your own UI:

```
const { data: account } = useAbstraxionAccount();
const { client } = useAbstraxionSigningClient();
```

Feel free to consult the documentation for more advanced usage and configuration.

Please check back regularly for updates and feel free to report any issues. Thank you for using `abstraxion-react` by Burnt Labs!
