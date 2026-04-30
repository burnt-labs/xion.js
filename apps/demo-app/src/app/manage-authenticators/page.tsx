"use client";

import { useState } from "react";
import {
  useAbstraxionAccount,
  useManageAuthenticators,
} from "@burnt-labs/abstraxion-react";
import { Button } from "@burnt-labs/ui";
import "@burnt-labs/ui/dist/index.css";
import Link from "next/link";

type ManageStatus = "idle" | "pending" | "success" | "cancelled" | "error";

export default function ManageAuthenticatorsPage(): JSX.Element {
  const {
    data: account,
    login,
    logout,
    isConnected,
    isConnecting,
  } = useAbstraxionAccount();
  const address = account?.bech32Address ?? "";

  const { manageAuthenticators, isSupported } = useManageAuthenticators();

  const [status, setStatus] = useState<ManageStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleManage = async () => {
    setStatus("pending");
    setErrorMsg(null);
    try {
      await manageAuthenticators();
      setStatus("success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const isCancelled = /cancelled|closed/i.test(msg);
      setStatus(isCancelled ? "cancelled" : "error");
      if (!isCancelled) setErrorMsg(msg);
    }
  };

  return (
    <main className="m-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        <h1 className="mb-2 text-2xl font-bold tracking-tighter text-white">
          Manage Authenticators (Popup)
        </h1>
        <p className="text-sm text-gray-400">
          Connect via popup, then open the manage-authenticators flow with{" "}
          <code className="rounded bg-white/10 px-1 py-0.5 text-xs text-purple-300">
            useManageAuthenticators()
          </code>
          .
        </p>
      </div>

      {!isConnected ? (
        <Button
          fullWidth
          onClick={() => login()}
          disabled={isConnecting}
          structure="base"
        >
          {isConnecting ? "WAITING FOR POPUP..." : "CONNECT"}
        </Button>
      ) : (
        <div className="w-full space-y-4">
          <div className="rounded-lg border border-white/10 bg-gray-900/50 p-4">
            <p className="text-xs text-gray-400">Connected as</p>
            <p className="mt-1 truncate font-mono text-sm text-green-400">
              {address}
            </p>
          </div>

          {isSupported && (
            <Button
              fullWidth
              onClick={handleManage}
              disabled={status === "pending"}
              structure="outlined"
            >
              {status === "pending"
                ? "OPENING DASHBOARD..."
                : "MANAGE AUTHENTICATORS ↗"}
            </Button>
          )}

          {status === "success" && (
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-400">
              Authenticators updated successfully.
            </div>
          )}
          {status === "cancelled" && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-400">
              Cancelled.
            </div>
          )}
          {status === "error" && errorMsg && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              {errorMsg}
            </div>
          )}

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
        ← Back to examples
      </Link>
    </main>
  );
}
