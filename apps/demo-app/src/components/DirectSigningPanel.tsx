"use client";

import { useState } from "react";
import { useAbstraxionSigningClient } from "@burnt-labs/abstraxion";
import { Button } from "@burnt-labs/ui";

type Tab = "send" | "contract";

interface DirectSigningPanelProps {
  accountAddress: string;
}

/**
 * DirectSigningPanel — reusable card for demos that feature `requireAuth: true`.
 *
 * Toggle between two demonstrations:
 *  • Send Tokens  — sendTokens() to self (0.001 XION)
 *  • Execute Contract — signAndBroadcast with MsgExecuteContract
 *
 * Contract execute tab demonstrates the correct msg encoding pattern:
 * pass `msg` as a plain JS object, NOT as toUtf8(JSON.stringify(msg)).
 * The dashboard's normalizeMessages handles byte encoding before signing.
 * Pre-encoding as Uint8Array corrupts the payload through the postMessage
 * channel (JSON.stringify(Uint8Array) → {"0":1,...} → "unknown variant `0`").
 */
export function DirectSigningPanel({
  accountAddress,
}: DirectSigningPanelProps) {
  const { client, error } = useAbstraxionSigningClient({ requireAuth: true });
  const [tab, setTab] = useState<Tab>("send");

  const contractAddress = process.env.NEXT_PUBLIC_DEMO_CONTRACT_ADDRESS;

  // ── Send tab state ──────────────────────────────────────────────────────────
  const [isSending, setIsSending] = useState(false);
  const [sendHash, setSendHash] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!client) return;
    setIsSending(true);
    setSendHash(null);
    setSendError(null);
    try {
      const result = await client.sendTokens(
        accountAddress,
        accountAddress, // send to self
        [{ denom: "uxion", amount: "1000" }],
        "auto",
        "Direct signing demo: send tokens",
      );
      setSendHash(result.transactionHash);
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : "Transaction failed");
    } finally {
      setIsSending(false);
    }
  };

  // ── Contract tab state ──────────────────────────────────────────────────────
  const [isExecuting, setIsExecuting] = useState(false);
  const [execHash, setExecHash] = useState<string | null>(null);
  const [execError, setExecError] = useState<string | null>(null);

  const handleExecute = async () => {
    if (!client || !contractAddress) return;
    setIsExecuting(true);
    setExecHash(null);
    setExecError(null);
    try {
      // ✅ msg is a plain JS object — dashboard normalizeMessages encodes to bytes.
      // ❌ Never use: msg: toUtf8(JSON.stringify(contractMsg))
      //    JSON.stringify(Uint8Array) → {"0":1,...} → contract: "unknown variant `0`"
      const contractMsg = {
        initialize_user: { username: `demo_${Date.now()}` },
      };

      const result = await client.signAndBroadcast(
        accountAddress,
        [
          {
            typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
            value: {
              sender: accountAddress,
              contract: contractAddress,
              msg: contractMsg, // ✅ plain object
              funds: [],
            },
          },
        ],
        "auto",
      );
      setExecHash(result.transactionHash);
    } catch (err: unknown) {
      setExecError(err instanceof Error ? err.message : "Transaction failed");
    } finally {
      setIsExecuting(false);
    }
  };

  const inProgress = isSending || isExecuting;

  return (
    <div className="overflow-hidden rounded-lg border border-amber-500/30 bg-gray-900/50">
      {/* Tab bar — flush with card top */}
      <div className="flex border-b border-amber-500/20 text-xs">
        <button
          type="button"
          onClick={() => setTab("send")}
          className={`flex-1 px-4 py-2.5 font-medium transition-colors ${
            tab === "send"
              ? "border-b-2 border-amber-400 bg-amber-500/10 text-amber-300"
              : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
          }`}
        >
          Send Tokens
        </button>
        <button
          type="button"
          onClick={() => setTab("contract")}
          className={`flex-1 px-4 py-2.5 font-medium transition-colors ${
            tab === "contract"
              ? "border-b-2 border-amber-400 bg-amber-500/10 text-amber-300"
              : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
          }`}
        >
          Execute Contract
        </button>
      </div>

      <div className="space-y-3 p-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-amber-500" />
          <h3 className="font-semibold text-amber-400">Direct Signing</h3>
          <span className="ml-auto text-xs text-gray-500">
            {error ? (
              <span className="text-red-400">Error</span>
            ) : client ? (
              <span className="text-amber-400">Ready</span>
            ) : (
              <span className="text-yellow-400">Creating…</span>
            )}
          </span>
        </div>

        <p className="text-xs text-gray-400">
          Signs via dashboard popup — user pays gas.{" "}
          <code className="text-amber-300">requireAuth: true</code>
        </p>

        {error && (
          <div className="rounded border border-red-500/20 bg-red-500/10 p-2">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {/* Send tab */}
        {tab === "send" && (
          <div className="space-y-3">
            <div className="space-y-1 text-xs text-gray-400">
              <p>
                <code>client.sendTokens(…)</code> — 0.001 XION to self
              </p>
            </div>

            <Button
              fullWidth
              onClick={handleSend}
              disabled={inProgress || !client || !!error}
              structure="base"
              className="border-amber-500/50 hover:border-amber-400"
            >
              {isSending ? "SENDING…" : "SEND 0.001 XION"}
            </Button>

            {sendHash && (
              <div className="rounded border border-amber-500/20 bg-amber-500/10 p-2">
                <p className="text-xs text-amber-400">Success!</p>
                <p className="truncate text-xs text-gray-400">
                  Hash: {sendHash}
                </p>
              </div>
            )}
            {sendError && (
              <div className="rounded border border-red-500/20 bg-red-500/10 p-2">
                <p className="text-xs text-red-400">Error: {sendError}</p>
              </div>
            )}
          </div>
        )}

        {/* Contract tab */}
        {tab === "contract" && (
          <div className="space-y-3">
            <div className="rounded border border-white/10 bg-black/30 p-2 font-mono text-xs leading-relaxed text-gray-300">
              <span className="text-gray-500">
                // ✅ correct — plain object
              </span>
              <br />
              {'{ typeUrl: "/cosmwasm…MsgExecuteContract",'}
              <br />
              {"  value: { msg: contractMsg } }"}
              <br />
              <span className="text-red-400/70 line-through">
                {"msg: toUtf8(JSON.stringify(…))"}
              </span>
            </div>

            {!contractAddress && (
              <div className="rounded border border-yellow-500/20 bg-yellow-500/10 p-2">
                <p className="text-xs text-yellow-400">
                  Set <code>NEXT_PUBLIC_DEMO_CONTRACT_ADDRESS</code> to enable.
                </p>
              </div>
            )}

            <Button
              fullWidth
              onClick={handleExecute}
              disabled={inProgress || !client || !!error || !contractAddress}
              structure="base"
              className="border-amber-500/50 hover:border-amber-400"
            >
              {isExecuting ? "EXECUTING…" : "EXECUTE CONTRACT"}
            </Button>

            {execHash && (
              <div className="rounded border border-amber-500/20 bg-amber-500/10 p-2">
                <p className="text-xs text-amber-400">Success!</p>
                <p className="truncate text-xs text-gray-400">
                  Hash: {execHash}
                </p>
              </div>
            )}
            {execError && (
              <div className="rounded border border-red-500/20 bg-red-500/10 p-2">
                <p className="text-xs text-red-400">Error: {execError}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
