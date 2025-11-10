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
      </div>
      <p className="text-center text-xs text-gray-500 mt-4">
        <strong>Loading States</strong> shows manual hook usage with custom UI.
        <br />
        <strong>Abstraxion UI Component</strong> demonstrates the pre-built modal component.
        <br />
        <strong>Signer Mode</strong> allows wallet connections without dashboard redirect.
      </p>
    </main>
  );
}
