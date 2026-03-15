"use client";
import { useState } from "react";
import {
  AbstraxionEmbed,
  useAbstraxionAccount,
  useAbstraxionSigningClient,
} from "@burnt-labs/abstraxion";
import { Button } from "@burnt-labs/ui";
import "@burnt-labs/ui/dist/index.css";
import Link from "next/link";

export default function EmbeddedInlinePage(): JSX.Element {
  const { data: account, isConnected, logout } = useAbstraxionAccount();

  return (
    <div className="flex min-h-screen flex-col items-center bg-gray-950 p-6">
      <div className="w-full max-w-md space-y-6 py-8">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-bold tracking-tighter text-white">
            Embedded · Inline
          </h1>
          <p className="text-sm text-gray-400">
            The iframe is always visible at full size — login, approval, and
            connected states all render in-place. No button, no modal.
          </p>
        </div>

        {/*
         * The iframe is always visible:
         *   idleView="fullview"      → auto-starts login flow immediately
         *   connectedView="visible"  → keeps iframe shown after login
         *   approvalView="inline"    → signing approval expands in place
         *
         * The outer div provides fixed dimensions; the iframe fills it.
         */}
        <AbstraxionEmbed
          idleView="fullview"
          disconnectedView="fullview"
          connectedView="visible"
          approvalView="inline"
          className="w-full overflow-hidden rounded-2xl border border-white/10 bg-white"
          style={{ height: 600 }}
        />

        {/* App actions shown below the always-visible iframe */}
        {isConnected && account.bech32Address && (
          <div className="space-y-4">
            <div className="rounded-lg border border-white/10 bg-gray-900/50 p-4">
              <p className="text-xs text-gray-400">Connected as</p>
              <p className="mt-1 truncate font-mono text-sm text-green-400">
                {account.bech32Address}
              </p>
            </div>

            <SessionKeySendCard accountAddress={account.bech32Address} />
            <DirectSigningCard accountAddress={account.bech32Address} />

            <Button
              fullWidth
              onClick={logout}
              structure="outlined"
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              DISCONNECT
            </Button>
          </div>
        )}

        <Link
          href="/"
          className="mt-2 inline-block text-sm text-gray-400 underline hover:text-gray-300"
        >
          &larr; Back to examples
        </Link>
      </div>
    </div>
  );
}

function SessionKeySendCard({ accountAddress }: { accountAddress: string }) {
  const { client } = useAbstraxionSigningClient();
  const [isSending, setIsSending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!client || !accountAddress) return;
    setIsSending(true);
    setTxHash(null);
    setTxError(null);
    try {
      const result = await client.sendTokens(
        accountAddress,
        accountAddress,
        [{ denom: "uxion", amount: "1000" }],
        "auto",
        "Embedded inline demo: session key send",
      );
      setTxHash(result.transactionHash);
    } catch (err: any) {
      setTxError(err.message || "Transaction failed");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-green-500/30 bg-gray-900/50 p-4">
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full bg-green-500" />
        <h3 className="font-semibold text-green-400">Session Key Send</h3>
      </div>
      <p className="text-xs text-gray-400">
        Signs with grantee keypair — no popup, gasless via fee grant.
      </p>
      <Button
        fullWidth
        onClick={handleSend}
        disabled={isSending || !client}
        structure="base"
      >
        {isSending ? "SENDING..." : "SEND 0.001 XION"}
      </Button>
      {txHash && (
        <div className="rounded border border-green-500/20 bg-green-500/10 p-2">
          <p className="text-xs text-green-400">Success!</p>
          <p className="truncate text-xs text-gray-400">Hash: {txHash}</p>
        </div>
      )}
      {txError && (
        <div className="rounded border border-red-500/20 bg-red-500/10 p-2">
          <p className="text-xs text-red-400">Error: {txError}</p>
        </div>
      )}
    </div>
  );
}

function DirectSigningCard({ accountAddress }: { accountAddress: string }) {
  const { client, error } = useAbstraxionSigningClient({ requireAuth: true });
  const [isSending, setIsSending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!client || !accountAddress) return;
    setIsSending(true);
    setTxHash(null);
    setTxError(null);
    try {
      const result = await client.sendTokens(
        accountAddress,
        accountAddress,
        [{ denom: "uxion", amount: "1000" }],
        "auto",
        "Embedded inline demo: direct signing (user pays gas)",
      );
      setTxHash(result.transactionHash);
    } catch (err: any) {
      setTxError(err.message || "Transaction failed");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-amber-500/30 bg-gray-900/50 p-4">
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full bg-amber-500" />
        <h3 className="font-semibold text-amber-400">Direct Signing</h3>
      </div>
      <p className="text-xs text-gray-400">
        Signs with meta-account via iframe approval — user pays gas.
      </p>
      {error && <p className="text-xs text-red-400">Error: {error}</p>}
      <Button
        fullWidth
        onClick={handleSend}
        disabled={isSending || !client || !!error}
        structure="base"
        className="border-amber-500/50 hover:border-amber-400"
      >
        {isSending ? "SIGNING..." : "SEND 0.001 XION"}
      </Button>
      {txHash && (
        <div className="rounded border border-amber-500/20 bg-amber-500/10 p-2">
          <p className="text-xs text-amber-400">Success!</p>
          <p className="truncate text-xs text-gray-400">Hash: {txHash}</p>
        </div>
      )}
      {txError && (
        <div className="rounded border border-red-500/20 bg-red-500/10 p-2">
          <p className="text-xs text-red-400">Error: {txError}</p>
        </div>
      )}
    </div>
  );
}
