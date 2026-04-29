"use client";
import { useEffect, useState } from "react";
import {
  useAbstraxionAccount,
  useAbstraxionSigningClient,
} from "@burnt-labs/abstraxion";
import { Button } from "@burnt-labs/ui";
import "@burnt-labs/ui/dist/index.css";
import Link from "next/link";
import { DirectSigningPanel } from "@/components/DirectSigningPanel";

export default function PopupDemoPage(): JSX.Element {
  const {
    data: account,
    login,
    logout,
    isConnected,
    isLoading,
    isInitializing,
    isConnecting,
  } = useAbstraxionAccount();

  const [loginError, setLoginError] = useState<string | null>(null);

  // Clear error when state changes
  useEffect(() => {
    if (isConnected || isInitializing) {
      setLoginError(null);
    }
  }, [isConnected, isInitializing]);

  const handleLogin = async () => {
    setLoginError(null);
    try {
      await login();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setLoginError(msg);
    }
  };

  return (
    <main className="m-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        <h1 className="mb-2 text-2xl font-bold tracking-tighter text-white">
          Popup Auth Demo
        </h1>
        <p className="max-w-md text-sm text-gray-400">
          Authentication happens in a{" "}
          <span className="font-semibold text-white">popup window</span>. You
          stay on this page while the auth app handles login and grant approval.
          The popup closes automatically when done.
        </p>
      </div>

      {/* Auth states panel */}
      <div className="w-full rounded-lg border border-white/10 bg-gray-900/50 p-4 text-xs backdrop-blur-sm">
        <div className="mb-3 flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-cyan-400"></div>
          <p className="font-mono font-semibold text-cyan-400">Auth State</p>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          {[
            { label: "isInitializing", value: isInitializing, color: "yellow" },
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
      </div>

      <div className="w-full space-y-4">
        {/* Connect / Disconnect button */}
        <Button
          fullWidth
          onClick={isConnected && account.bech32Address ? logout : handleLogin}
          structure={isConnected ? "outlined" : "base"}
          disabled={isLoading}
          className={`transition-all duration-200 ${
            isConnected
              ? "group border-green-500/50 text-green-400 hover:border-red-500/50 hover:bg-red-500/10"
              : isLoading
                ? "cursor-not-allowed opacity-50"
                : "hover:scale-[1.02]"
          }`}
        >
          {isConnected && account.bech32Address ? (
            <div className="flex w-full items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                <span>Connected: {account.bech32Address.slice(0, 12)}...</span>
              </div>
              <span className="text-lg opacity-60 transition-colors group-hover:text-red-400 group-hover:opacity-100">
                ×
              </span>
            </div>
          ) : isConnecting ? (
            <div className="flex items-center justify-center gap-2">
              <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
              <span>WAITING FOR POPUP...</span>
            </div>
          ) : isInitializing ? (
            <div className="flex items-center justify-center gap-2">
              <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
              <span>CHECKING SESSION...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <span>OPEN AUTH POPUP</span>
              <span className="text-xs opacity-60">↗</span>
            </div>
          )}
        </Button>

        {/* Popup blocked / other errors */}
        {loginError && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
            <p className="mb-1 text-xs font-semibold text-red-400">
              Connection failed
            </p>
            <p className="text-xs text-gray-300">{loginError}</p>
            {loginError.toLowerCase().includes("popup") && (
              <p className="mt-2 text-xs text-gray-400">
                Allow popups for this site in your browser settings and try
                again.
              </p>
            )}
          </div>
        )}

        {/* Connected: signing cards side by side */}
        {isConnected && account.bech32Address && (
          <div className="flex w-full gap-4">
            <SessionKeySendCard accountAddress={account.bech32Address} />
            <DirectSigningPanel accountAddress={account.bech32Address} />
          </div>
        )}

        {/* Compare with redirect */}
        <div className="w-full rounded-lg border border-gray-600/30 bg-gray-800/50 p-4">
          <p className="mb-2 text-xs font-semibold text-gray-400">
            Session Key vs Direct Signing
          </p>
          <div className="overflow-auto text-xs text-gray-300">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="pb-2 pr-4">Feature</th>
                  <th className="pb-2 pr-4">Session Key</th>
                  <th className="pb-2">Direct (requireAuth)</th>
                </tr>
              </thead>
              <tbody className="space-y-1">
                {[
                  ["Signs with", "grantee keypair", "meta-account (via popup)"],
                  ["User sees", "nothing (silent)", "approval popup"],
                  [
                    "Gas payment",
                    "fee grant (gasless)",
                    "user pays from balance",
                  ],
                  ["Use case", "normal operations", "security-critical ops"],
                  [
                    "On-chain signer",
                    "Authz Exec / Grantee",
                    "Direct / meta-account",
                  ],
                ].map(([feature, sessionKey, direct]) => (
                  <tr key={feature}>
                    <td className="py-0.5 pr-4 text-gray-500">{feature}</td>
                    <td className="py-0.5 pr-4 text-green-300">{sessionKey}</td>
                    <td className="py-0.5 text-amber-300">{direct}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Link
        href="/"
        className="mt-2 inline-block text-sm text-gray-400 underline hover:text-gray-300"
      >
        ← Back to examples
      </Link>
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
        "Popup demo: session key send",
      );
      setTxHash(result.transactionHash);
    } catch (err: any) {
      setTxError(err.message || "Transaction failed");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex-1 space-y-3 rounded-lg border border-green-500/30 bg-gray-900/50 p-4">
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full bg-green-500" />
        <h3 className="font-semibold text-green-400">Session Key</h3>
      </div>

      <div className="space-y-1 text-xs text-gray-400">
        <p>
          <strong>Hook:</strong> useAbstraxionSigningClient()
        </p>
        <p>
          <strong>Signs with:</strong> grantee keypair (no popup)
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
