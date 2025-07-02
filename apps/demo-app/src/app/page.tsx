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
        <Link href="/ui-less">
          <Button fullWidth structure="outlined">
            CUSTOM UI EXAMPLE
          </Button>
        </Link>
        <Link href="/default-ui">
          <Button fullWidth structure="outlined">
            LEGACY UI EXAMPLE
          </Button>
        </Link>
      </div>
    </main>
  );
}
