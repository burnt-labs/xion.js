import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AbstraxionEmbed,
  AbstraxionProvider,
  useAbstraxionAccount,
} from "@burnt-labs/abstraxion-react";
import { Button } from "@/components/Button";
import { SessionKeySendCard } from "@/components/SessionKeySendCard";
import { DirectSigningPanel } from "@/components/DirectSigningPanel";
import { ManageAuthenticatorsCard } from "@/components/ManageAuthenticatorsCard";
import { baseConfig, iframeUrl } from "@/config";

const config = {
  ...baseConfig,
  authentication: { type: "embedded" as const, iframeUrl },
};

export function EmbeddedModePage(): JSX.Element {
  return (
    <AbstraxionProvider config={config}>
      <EmbeddedContent />
    </AbstraxionProvider>
  );
}

type Mode = "inline" | "dynamic";

function EmbeddedContent(): JSX.Element {
  const [mode, setMode] = useState<Mode>("inline");
  const { data: account, isConnected, logout } = useAbstraxionAccount();

  return (
    <div className="m-auto flex w-full max-w-md flex-col items-center gap-6">
      <div className="text-center">
        <h1 className="mb-2 text-2xl font-bold tracking-tighter">
          Embedded Mode
        </h1>
        <p className="text-sm text-gray-400">
          The dashboard runs inside an iframe. Toggle between <em>inline</em>{" "}
          (always visible) and <em>dynamic</em> (button + modal) presentation.
        </p>
      </div>

      <div className="flex w-full overflow-hidden rounded-lg border border-white/10">
        {(["inline", "dynamic"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 px-4 py-2 text-xs font-medium uppercase tracking-wider transition-colors ${
              mode === m
                ? "bg-white/10 text-white"
                : "bg-transparent text-gray-400 hover:text-white"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {mode === "inline" ? (
        <AbstraxionEmbed
          idleView="fullview"
          disconnectedView="fullview"
          connectedView="visible"
          approvalView="inline"
          className="w-full overflow-hidden rounded-2xl border border-white/10 bg-white"
          style={{ height: 600 }}
        />
      ) : (
        <AbstraxionEmbed
          idleView="button"
          connectedView="hidden"
          approvalView="modal"
          className="w-full overflow-hidden rounded-2xl border border-white/10 bg-white"
          style={{ height: 600 }}
          loginLabel="SIGN IN WITH XION"
          loginButtonClassName="w-full rounded-2xl bg-white text-black px-6 py-4 text-sm font-bold uppercase tracking-wider hover:bg-gray-200 cursor-pointer"
        />
      )}

      {isConnected && account.bech32Address && (
        <>
          <div className="w-full rounded-lg border border-white/10 bg-gray-900/50 p-4">
            <p className="text-xs text-gray-400">Connected as</p>
            <p className="mt-1 truncate font-mono text-sm text-green-400">
              {account.bech32Address}
            </p>
          </div>

          <SessionKeySendCard
            accountAddress={account.bech32Address}
            memo="Embedded demo: session key send"
          />
          <DirectSigningPanel accountAddress={account.bech32Address} />
          <ManageAuthenticatorsCard />

          <Button
            fullWidth
            onClick={logout}
            structure="outlined"
            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
          >
            DISCONNECT
          </Button>
        </>
      )}

      <Link to="/" className="text-sm text-gray-400 underline">
        ← Back to home
      </Link>
    </div>
  );
}
