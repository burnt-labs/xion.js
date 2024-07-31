# abstraxion

The `abstraxion` library is an account abstraction solution tailored for the XION chain. It offers a clean and streamlined way to create abstract accounts, sign transactions, integrating seamlessly with [graz](https://github.com/graz-sh/graz), to additionally provide traditional cosmos wallet functionalities.

## Installation

Run the following:

```
npm i @burnt-labs/abstraxion
```

## Basic Usage

Find an implementation demo here: [abstraxion demo](../../apps/demo-app)

First, wrap your app in the `AbstraxionProvider` at the top level

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
            stake: true,
            bank: [
              {
                denom: "uxion",
                amount: "1000000",
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
```

to activate Mainnet just add rpcUrl and restUrl endpoints to the config:

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
            stake: true,
            bank: [
              {
                denom: "uxion",
                amount: "1000000",
              },
            ],
            rpcUrl: "https://rpc.xion-mainnet-1.burnt.com:443",
            restUrl: "https://api.xion-mainnet-1.burnt.com:443",
          }}
        >
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

## Treasury Contract

If using a treasury contract instance, your Abstraxion config should look something like:

```
"use client";
import "./globals.css";
import { Inter } from "next/font/google";
import { AbstraxionProvider } from "@burnt-labs/abstraxion";
import "@burnt-labs/abstraxion/dist/index.css";

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
            treasury:
              "xion1q5f8dclqahevxpytk85ruj8njaukczvhmturnsuw9dlyps9wlasq9z37n3",
          }}
        >
          {children}
        </AbstraxionProvider>
      </body>
    </html>
  );
}
```

Feel free to consult the documentation for more advanced usage and configuration.

Please check back regularly for updates and feel free to report any issues. Thank you for using `abstraxion` by Burnt Labs!
