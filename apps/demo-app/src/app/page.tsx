"use client";
import Link from "next/link";
import { Button } from "@burnt-labs/ui";
import "@burnt-labs/ui/dist/index.css";

export default function Page(): JSX.Element {
  return (
    <main className="m-auto flex min-h-screen max-w-xs flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-2xl font-bold tracking-tighter text-white">
        ABSTRAXION
      </h1>
      <div className="flex w-full flex-col gap-2">
        <Link href="/loading-states">
          <Button fullWidth structure="base">
            LOADING STATES
          </Button>
        </Link>
        <Link href="/abstraxion-ui">
          <Button fullWidth structure="base">
            ABSTRAXION UI COMPONENT
          </Button>
        </Link>
        <Link href="/signer-mode">
          <Button fullWidth structure="base">
            SIGNER MODE
          </Button>
        </Link>
        <Link href="/direct-signing-demo">
          <Button fullWidth structure="base">
            DIRECT SIGNING DEMO
          </Button>
        </Link>
        <Link href="/popup-demo">
          <Button fullWidth structure="base">
            POPUP AUTH DEMO
          </Button>
        </Link>
        <Link href="/inline-demo">
          <Button fullWidth structure="base">
            INLINE IFRAME DEMO
          </Button>
        </Link>
      </div>
      <p className="mt-4 text-center text-xs text-gray-500">
        <strong>Loading States</strong> shows manual hook usage with custom UI.
        <br />
        <strong>Abstraxion UI Component</strong> demonstrates the pre-built
        modal component.
        <br />
        <strong>Signer Mode</strong> allows wallet connections without dashboard
        redirect.
        <br />
        <strong>Direct Signing Demo</strong> compares session key vs direct
        signing modes.
        <br />
        <strong>Popup Auth Demo</strong> opens the auth app in a popup window
        — dApp stays loaded.
      </p>
    </main>
  );
}
