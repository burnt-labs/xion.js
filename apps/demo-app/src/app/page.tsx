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
        <Link href="/direct-mode">
          <Button fullWidth structure="base">
            DIRECT MODE
          </Button>
        </Link>
      </div>
      <p className="text-center text-xs text-gray-500 mt-4">
        <strong>Direct Mode</strong> allows wallet connections without dashboard redirect,
        <br />
        <strong>Loading States</strong> shows how the app reacts to state changes in standard redirect mode.
      </p>
    </main>
  );
}
