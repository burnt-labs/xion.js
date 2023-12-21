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
import { AbstraxionProvider } from "abstraxion";
import "./globals.css";
import "@burnt-labs/ui/styles.css";
import "@burnt-labs/abstraxion/styles.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AbstraxionProvider>{children}</AbstraxionProvider>
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
