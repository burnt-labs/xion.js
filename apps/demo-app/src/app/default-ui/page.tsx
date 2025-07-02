"use client";
import { useState } from "react";
import {
  Abstraxion,
  useAbstraxionAccount,
  useAbstraxionSigningClient,
  useModal,
} from "@burnt-labs/abstraxion";
import { Button } from "@burnt-labs/ui";
import "@burnt-labs/ui/dist/index.css";
import "@burnt-labs/abstraxion/dist/index.css";
import Link from "next/link";

export default function DefaultUIPage(): JSX.Element {
  const { data: account } = useAbstraxionAccount();
  const { client, logout } = useAbstraxionSigningClient();
  const [showModal, setShowModal] = useModal();

  return (
    <main className="m-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-2xl font-bold tracking-tighter text-white">
        Legacy UI Abstraxion Example
      </h1>
      <p className="text-center text-gray-400">
        This example uses the legacy Abstraxion modal UI for wallet connection.
        Click the button below to open the modal.
      </p>

      <div className="w-full space-y-4">
        <Button fullWidth onClick={() => setShowModal(true)} structure="base">
          {account.bech32Address ? (
            <div className="flex items-center justify-center">VIEW ACCOUNT</div>
          ) : (
            "CONNECT WITH ABSTRAXION MODAL"
          )}
        </Button>

        {account.bech32Address && (
          <>
            <div className="rounded border border-white/20 p-4">
              <h3 className="mb-2 font-semibold">Account Info</h3>
              <p className="text-sm text-gray-400">
                Address: {account.bech32Address}
              </p>
              <p className="text-sm text-gray-400">
                Client: {client ? "Connected" : "Not connected"}
              </p>
            </div>

            <Button
              fullWidth
              onClick={() => {
                if (logout) logout();
              }}
              structure="outlined"
            >
              DISCONNECT
            </Button>
          </>
        )}
      </div>

      <Abstraxion
        onClose={() => {
          setShowModal(false);
        }}
      />

      <Link
        href="/"
        className="mt-4 inline-block text-sm text-gray-400 underline hover:text-gray-300"
      >
        ← Back to examples
      </Link>
    </main>
  );
}
