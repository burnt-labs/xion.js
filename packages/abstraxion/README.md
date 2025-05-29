# abstraxion

The `abstraxion` library is an account abstraction solution tailored for the XION chain. It offers a clean and streamlined way to create abstract accounts, sign transactions, integrating seamlessly with [graz](https://github.com/graz-sh/graz), to additionally provide traditional cosmos wallet functionalities.

## Installation

Run the following:

```
npm i @burnt-labs/abstraxion
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
import { AbstraxionProvider } from "@burnt-labs/abstraxion";
import "@burnt-labs/abstraxion/dist/index.css";

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

Then, import the `Abstraxion` modal and trigger however you'd like, for example:

```
"use client";
import { Abstraxion } from "abstraxion";
import { useState } from "react";

export default function Home() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div>
      <Abstraxion onClose={() => setIsOpen(false)} isOpen={isOpen} />
      <button onClick={() => setIsOpen(true)}>Click here</button>
    </div>
  );
}

```

Finally, call the exported hooks to serve your functionality needs:

```
const { data: account } = useAbstraxionAccount();
const { client } = useAbstraxionSigningClient();
```

Feel free to consult the documentation for more advanced usage and configuration.

Please check back regularly for updates and feel free to report any issues. Thank you for using `abstraxion` by Burnt Labs!
