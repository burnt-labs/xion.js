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

const rainbowKeyframes = `
  @keyframes rainbow-sweep {
    0%   { background-position: 0% 50%; }
    100% { background-position: 300% 50%; }
  }
  @keyframes border-spin {
    0%   { background-position: 0% 50%; }
    100% { background-position: 300% 50%; }
  }
  @keyframes btn-glow-pulse {
    0%, 100% { box-shadow: 0 0 16px 2px rgba(255,80,160,0.55), 0 0 40px 6px rgba(80,80,255,0.3); }
    33%       { box-shadow: 0 0 20px 4px rgba(255,200,0,0.55),  0 0 50px 8px rgba(0,220,120,0.3); }
    66%       { box-shadow: 0 0 18px 3px rgba(0,180,255,0.55),  0 0 45px 7px rgba(180,0,255,0.3); }
  }
`;

export default function EmbeddedDynamicPage(): JSX.Element {
  const {
    data: account,
    isConnected,
    logout,
  } = useAbstraxionAccount();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 p-6">
      <style>{rainbowKeyframes}</style>
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-bold tracking-tighter text-white">
            Embedded · Dynamic
          </h1>
          <p className="text-sm text-gray-400">
            The iframe is hidden until needed. A button triggers the login flow;
            signing approvals appear as a modal overlay. Style both with{" "}
            <code className="rounded bg-white/10 px-1 py-0.5 text-xs text-purple-300">
              loginButtonClassName
            </code>{" "}
            and{" "}
            <code className="rounded bg-white/10 px-1 py-0.5 text-xs text-purple-300">
              modalClassName
            </code>
            .
          </p>
        </div>

        {/*
         * Extravagant styles intentionally demonstrate that loginButtonClassName
         * and modalClassName are fully under the developer's control.
         *
         * AbstraxionEmbed states:
         *   idle/disconnected → gradient "Sign in" button  (idleView="button")
         *   connecting        → inline iframe for auth flow
         *   connected         → iframe collapsed to 0×0    (connectedView="hidden")
         *   signing approval  → full modal overlay          (approvalView="modal")
         */}
        <AbstraxionEmbed
          idleView="button"
          connectedView="hidden"
          approvalView="modal"
          className="w-full overflow-hidden rounded-2xl border border-white/10 bg-white"
          style={{ height: 600 }}
          /* ── Rainbow login button ────────────────────────────────────── */
          loginLabel={
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, position: "relative" }}>
              {/* Animated icon */}
              <svg
                width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ filter: "drop-shadow(0 0 4px currentColor)" }}
              >
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              {/* Rainbow-clipped text */}
              <span style={{
                backgroundImage: "linear-gradient(90deg, #ff0080, #ff8c00, #ffe600, #00ff80, #00cfff, #cc00ff, #ff0080)",
                backgroundSize: "300% 100%",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                animation: "rainbow-sweep 2s linear infinite",
                fontWeight: 800,
                letterSpacing: "0.15em",
              }}>
                SIGN IN WITH XION
              </span>
              {/* Sparkles */}
              <span style={{ fontSize: 14, lineHeight: 1 }}>✦</span>
            </span>
          }
          loginButtonClassName="w-full rounded-2xl px-6 py-4 text-sm uppercase cursor-pointer"
          loginButtonStyle={{
            background: "#0a0a0f",
            border: "2px solid transparent",
            backgroundClip: "padding-box",
            boxShadow: "0 0 16px 2px rgba(255,80,160,0.55), 0 0 40px 6px rgba(80,80,255,0.3), inset 0 0 0 2px rgba(255,255,255,0.06)",
            animation: "btn-glow-pulse 3s ease-in-out infinite",
            outline: "2px solid transparent",
            outlineOffset: 2,
            position: "relative",
          }}
          /* ── Rainbow modal border ────────────────────────────────────── */
          modalClassName="rounded-3xl overflow-hidden"
          modalStyle={{
            // Spread-only shadow = solid colored ring; second layer = bloom
            boxShadow: "0 0 0 3px #a855f7, 0 0 60px 12px rgba(139,92,246,0.55)",
            animation: "btn-glow-pulse 3s ease-in-out infinite",
          }}
        />

        {/* Tip: bring-your-own button */}
        <details className="rounded-xl border border-white/10 bg-white/5 text-xs text-gray-400">
          <summary className="cursor-pointer select-none px-4 py-3 font-semibold text-gray-300 hover:text-white transition-colors">
            Tip — use your own button instead
          </summary>
          <div className="space-y-2 px-4 pb-4">
            <p>
              If you already have a standard button style, skip{" "}
              <code className="rounded bg-white/10 px-1 py-0.5 text-purple-300">loginButtonClassName</code>{" "}
              entirely. Set{" "}
              <code className="rounded bg-white/10 px-1 py-0.5 text-purple-300">idleView="hidden"</code>{" "}
              and call{" "}
              <code className="rounded bg-white/10 px-1 py-0.5 text-purple-300">login()</code>{" "}
              from{" "}
              <code className="rounded bg-white/10 px-1 py-0.5 text-purple-300">useAbstraxionAccount()</code>{" "}
              yourself:
            </p>
            <pre className="overflow-x-auto rounded bg-black/40 p-3 text-[11px] leading-relaxed text-gray-300">{`const { login } = useAbstraxionAccount();

<AbstraxionEmbed idleView="hidden" ... />

{/* your own button, your own styles */}
<YourButton onClick={login}>
  Sign in with XION
</YourButton>`}</pre>
          </div>
        </details>

        {/* Connected state — app content */}
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
        "Embedded dynamic demo: session key send",
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
      <Button fullWidth onClick={handleSend} disabled={isSending || !client} structure="base">
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
        "Embedded dynamic demo: direct signing (user pays gas)",
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
      {error && (
        <p className="text-xs text-red-400">Error: {error}</p>
      )}
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
