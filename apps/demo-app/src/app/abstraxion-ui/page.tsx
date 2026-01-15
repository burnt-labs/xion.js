"use client";
import { useState } from "react";
import {
  useAbstraxionAccount,
  useAbstraxionSigningClient,
} from "@burnt-labs/abstraxion";
import { Abstraxion } from "@burnt-labs/ui";
import { Button } from "@burnt-labs/ui";
import "@burnt-labs/ui/dist/index.css";
import Link from "next/link";
import { SendTokens } from "@/components/SendTokens";

export default function AbstraxionUIPage(): JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const {
    data: account,
    logout,
    isConnected,
    isLoading,
  } = useAbstraxionAccount();
  const { client } = useAbstraxionSigningClient();

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <main className="m-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        <h1 className="mb-3 text-2xl font-bold tracking-tighter text-white">
          Abstraxion UI Component Demo
        </h1>
        <p className="max-w-md text-sm text-gray-400">
          This demo showcases the{" "}
          <code className="rounded bg-gray-800 px-1 py-0.5 text-xs">
            Abstraxion
          </code>{" "}
          component from{" "}
          <code className="rounded bg-gray-800 px-1 py-0.5 text-xs">
            @burnt-labs/ui
          </code>
          . The component handles all modal and loading overlay states
          automatically.
        </p>
      </div>

      <div className="w-full space-y-5">
        <Button
          fullWidth
          onClick={
            isConnected && account.bech32Address
              ? () => {
                  console.log("[AbstraxionUIPage] User clicked disconnect");
                  logout();
                }
              : handleOpenModal
          }
          structure={isConnected ? "outlined" : "base"}
          disabled={isLoading && !isModalOpen}
          className={`transition-all duration-200 ${
            isConnected
              ? "group border-green-500/50 text-green-400 hover:border-red-500/50 hover:bg-red-500/10"
              : isLoading && !isModalOpen
                ? "cursor-not-allowed opacity-50"
                : "hover:scale-[1.02]"
          }`}
        >
          {isConnected && account.bech32Address ? (
            <div className="flex w-full items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-400"></div>
                <span>Connected: {account.bech32Address.slice(0, 10)}...</span>
              </div>
              <div className="text-lg opacity-60 transition-colors group-hover:text-red-400 group-hover:opacity-100">
                ×
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <span>OPEN ABSTRAXION MODAL</span>
              <div className="text-xs opacity-60">→</div>
            </div>
          )}
        </Button>

        {/* Account Info and Send Tokens - Only show when connected */}
        {isConnected && account.bech32Address && (
          <SendTokens
            accountAddress={account.bech32Address}
            client={client}
            memo="Send XION via Abstraxion UI"
          />
        )}

        {/* Info Box */}
        <div className="w-full rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-4">
          <p className="mb-2 text-xs font-semibold text-indigo-400">
            💡 Using Abstraxion Component
          </p>
          <p className="text-xs text-gray-300">
            The{" "}
            <code className="rounded bg-gray-800 px-1 py-0.5">Abstraxion</code>{" "}
            component from{" "}
            <code className="rounded bg-gray-800 px-1 py-0.5">
              @burnt-labs/ui
            </code>{" "}
            automatically handles:
          </p>
          <ul className="ml-4 mt-2 list-disc space-y-1 text-xs text-gray-400">
            <li>Modal display and management</li>
            <li>Loading overlays for all connection states</li>
            <li>Success state display</li>
            <li>Error handling</li>
          </ul>
          <p className="mt-2 text-xs text-gray-400">
            Compare with the{" "}
            <Link
              href="/loading-states"
              className="text-indigo-400 underline hover:text-indigo-300"
            >
              loading-states demo
            </Link>{" "}
            to see the difference between manual hook usage and the component
            approach.
          </p>
        </div>
      </div>

      <Link
        href="/"
        className="mt-4 inline-block text-sm text-gray-400 underline hover:text-gray-300"
      >
        ← Back to examples
      </Link>

      {/* Abstraxion Modal Component - Handles all UI automatically */}
      <Abstraxion isOpen={isModalOpen} onClose={handleCloseModal} />
    </main>
  );
}
