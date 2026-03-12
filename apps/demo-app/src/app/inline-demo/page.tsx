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

export default function InlineDemoPage(): JSX.Element {
  const {
    data: account,
    isConnected,
    isLoading,
    isInitializing,
    isConnecting,
    logout,
  } = useAbstraxionAccount();

  return (
    <main className="flex min-h-screen bg-gray-950 text-white">
      {/* Left side: iframe container */}
      <div className="flex flex-col items-center justify-center border-r border-white/10 p-6">
        <p className="mb-4 text-center text-sm text-gray-400">
          Dashboard iframe (420 x 600)
        </p>
        <AbstraxionEmbed
          style={{ width: 420, height: 600 }}
          className="overflow-hidden rounded-xl border border-white/10 bg-white"
        />
      </div>

      {/* Right side: dApp state */}
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-bold tracking-tighter">
            Inline Iframe Demo
          </h1>
          <p className="max-w-md text-sm text-gray-400">
            The dashboard runs inside an{" "}
            <span className="font-semibold text-white">inline iframe</span>.
            Login and grant approval happen inside the iframe. The parent page
            receives the address via postMessage.
          </p>
        </div>

        {/* Auth state panel */}
        <div className="w-full max-w-2xl rounded-lg border border-white/10 bg-gray-900/50 p-4 text-xs backdrop-blur-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
            <p className="font-mono font-semibold text-cyan-400">Auth State</p>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {[
              {
                label: "isInitializing",
                value: isInitializing,
                color: "yellow",
              },
              { label: "isConnecting", value: isConnecting, color: "blue" },
              { label: "isConnected", value: isConnected, color: "green" },
              { label: "isLoading", value: isLoading, color: "orange" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="font-mono text-gray-400">{label}:</span>
                <div className="flex items-center gap-1">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      value ? `animate-pulse bg-${color}-400` : "bg-gray-600"
                    }`}
                  />
                  <span
                    className={`font-mono ${value ? `font-semibold text-${color}-400` : "text-gray-600"}`}
                  >
                    {String(value)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {isConnected && account.bech32Address && (
            <div className="mt-3 border-t border-white/10 pt-3">
              <p className="font-mono text-gray-400">
                Address:{" "}
                <span className="text-green-400">
                  {account.bech32Address.slice(0, 16)}...
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Disconnect button (SDK-side) */}
        {isConnected && (
          <Button
            fullWidth
            onClick={logout}
            structure="outlined"
            className="max-w-2xl border-red-500/50 text-red-400 hover:bg-red-500/10"
          >
            DISCONNECT (SDK-SIDE)
          </Button>
        )}

        {/* Signing cards side by side */}
        {isConnected && account.bech32Address && (
          <div className="flex w-full max-w-2xl gap-4">
            <SessionKeySendCard accountAddress={account.bech32Address} />
            <DirectSigningCard accountAddress={account.bech32Address} />
          </div>
        )}

        {/* Sizing hint */}
        <div className="w-full max-w-2xl rounded-lg border border-gray-600/30 bg-gray-800/50 p-4">
          <p className="mb-2 text-xs font-semibold text-gray-400">
            How sizing works
          </p>
          <p className="text-xs text-gray-300">
            The iframe fills 100% of its container. The dApp controls sizing via
            the container element&apos;s CSS. In this demo the container is
            420x600px. After connect you could hide or resize the container.
          </p>
        </div>

        <Link
          href="/"
          className="mt-2 inline-block text-sm text-gray-400 underline hover:text-gray-300"
        >
          &larr; Back to examples
        </Link>
      </div>
    </main>
  );
}

/**
 * Session key signing card — uses the grantee keypair, gasless via fee grant
 */
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
        accountAddress, // send to self for demo
        [{ denom: "uxion", amount: "1000" }],
        "auto",
        "Inline iframe demo: session key send",
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

      <div className="space-y-1 text-xs text-gray-400">
        <p>
          <strong>Signs with:</strong> grantee keypair (no popup, no iframe
          interaction)
        </p>
        <p>
          <strong>Gas:</strong> fee grant (gasless)
        </p>
      </div>

      <div className="border-t border-white/10 pt-2">
        <p className="text-xs text-gray-500">
          Client:{" "}
          {client ? (
            <span className="text-green-400">GranteeSignerClient</span>
          ) : (
            <span className="text-yellow-400">Not ready</span>
          )}
        </p>
      </div>

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

/**
 * Direct signing card — routes approval through the iframe, user pays gas
 */
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
        accountAddress, // send to self for demo
        [{ denom: "uxion", amount: "1000" }],
        "auto",
        "Inline iframe demo: direct signing (user pays gas)",
      );
      setTxHash(result.transactionHash);
    } catch (err: any) {
      setTxError(err.message || "Transaction failed");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex-1 space-y-3 rounded-lg border border-amber-500/30 bg-gray-900/50 p-4">
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full bg-amber-500" />
        <h3 className="font-semibold text-amber-400">Direct Signing</h3>
      </div>

      <div className="space-y-1 text-xs text-gray-400">
        <p>
          <strong>Hook:</strong> useAbstraxionSigningClient({"{"} requireAuth:
          true {"}"})
        </p>
        <p>
          <strong>Signs with:</strong> meta-account (iframe approval)
        </p>
        <p>
          <strong>Gas:</strong> user pays from balance
        </p>
      </div>

      <div className="border-t border-white/10 pt-2">
        <p className="text-xs text-gray-500">
          Client:{" "}
          {error ? (
            <span className="text-red-400">{error}</span>
          ) : client ? (
            <span className="text-amber-400">IframeSigningClient</span>
          ) : (
            <span className="text-yellow-400">Not ready</span>
          )}
        </p>
      </div>

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
