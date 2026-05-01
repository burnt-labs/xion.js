import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AbstraxionProvider,
  useAbstraxionAccount,
  useAbstraxionSigningClient,
} from "@burnt-labs/abstraxion-react";
import { Button } from "@/components/Button";
import { SendTokens } from "@/components/SendTokens";
import { DirectSigningPanel } from "@/components/DirectSigningPanel";
import { ManageAuthenticatorsCard } from "@/components/ManageAuthenticatorsCard";
import { authAppUrl, baseConfig } from "@/config";

/**
 * `auto` is the recommended dashboard auth mode — it resolves to popup on
 * desktop and redirect on mobile/PWA. Devs shouldn't pick popup or redirect
 * directly anymore; both are exposed as the underlying controllers but live
 * behind `auto` in normal usage.
 */
const config = {
  ...baseConfig,
  authentication: { type: "auto" as const, authAppUrl },
};

export function AutoModePage(): JSX.Element {
  return (
    <AbstraxionProvider config={config}>
      <AutoModeContent />
    </AbstraxionProvider>
  );
}

function AutoModeContent(): JSX.Element {
  const {
    data: account,
    login,
    logout,
    isConnected,
    isDisconnected,
    isLoading,
    isInitializing,
    isLoggingIn,
    isConnecting,
    isReturningFromAuth,
  } = useAbstraxionAccount();
  const { client } = useAbstraxionSigningClient();

  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    if (isConnected || isInitializing) setLoginError(null);
  }, [isConnected, isInitializing]);

  const handleLogin = async () => {
    setLoginError(null);
    try {
      await login();
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="m-auto flex w-full max-w-lg flex-col items-center gap-6">
      <div className="text-center">
        <h1 className="mb-2 text-2xl font-bold tracking-tighter">Auto Mode</h1>
        <p className="text-sm text-gray-400">
          Default and recommended mode. Resolves to{" "}
          <strong>popup</strong> on desktop and <strong>redirect</strong> on
          mobile/PWA — your dApp doesn&apos;t pick one explicitly.
        </p>
      </div>

      <StatePanel
        isInitializing={isInitializing}
        isConnecting={isConnecting}
        isConnected={isConnected}
        isDisconnected={isDisconnected}
        isLoading={isLoading}
        isReturningFromAuth={isReturningFromAuth}
        isLoggingIn={isLoggingIn}
      />

      <Button
        fullWidth
        onClick={isConnected && account.bech32Address ? logout : handleLogin}
        structure={isConnected ? "outlined" : "base"}
        disabled={isLoading}
      >
        {isConnected && account.bech32Address ? (
          <span className="flex w-full items-center justify-between px-2">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
              Connected: {account.bech32Address.slice(0, 12)}…
            </span>
            <span className="text-lg opacity-60">×</span>
          </span>
        ) : isReturningFromAuth ? (
          "COMPLETING AUTH…"
        ) : isLoggingIn ? (
          "STARTING AUTH…"
        ) : isConnecting ? (
          "WAITING FOR POPUP / REDIRECT…"
        ) : isInitializing ? (
          "CHECKING SESSION…"
        ) : (
          "CONNECT WALLET →"
        )}
      </Button>

      {loginError && (
        <div className="w-full rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <p className="text-xs font-semibold text-red-400">Connection failed</p>
          <p className="text-xs text-gray-300">{loginError}</p>
          {loginError.toLowerCase().includes("popup") && (
            <p className="mt-2 text-xs text-gray-400">
              Allow popups for this site in your browser settings and try
              again. (Auto mode falls back to redirect on mobile, where popups
              don&apos;t work.)
            </p>
          )}
        </div>
      )}

      {isConnected && account.bech32Address && (
        <>
          <div className="grid w-full gap-4 md:grid-cols-2">
            <SendTokens
              accountAddress={account.bech32Address}
              client={client}
              memo="Auto-mode demo: send"
            />
            <DirectSigningPanel accountAddress={account.bech32Address} />
          </div>
          <ManageAuthenticatorsCard />
        </>
      )}

      <Link to="/" className="text-sm text-gray-400 underline">
        ← Back to home
      </Link>
    </div>
  );
}

interface StatePanelProps {
  isInitializing: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  isDisconnected: boolean;
  isLoading: boolean;
  isReturningFromAuth: boolean;
  isLoggingIn: boolean;
}

function StatePanel(props: StatePanelProps): JSX.Element {
  const items: Array<{ label: string; value: boolean; on: string }> = [
    {
      label: "isInitializing",
      value: props.isInitializing,
      on: "text-yellow-400",
    },
    { label: "isConnecting", value: props.isConnecting, on: "text-blue-400" },
    { label: "isConnected", value: props.isConnected, on: "text-green-400" },
    {
      label: "isDisconnected",
      value: props.isDisconnected,
      on: "text-red-400",
    },
    { label: "isLoading", value: props.isLoading, on: "text-orange-400" },
    {
      label: "isReturningFromAuth",
      value: props.isReturningFromAuth,
      on: "text-purple-400",
    },
    { label: "isLoggingIn", value: props.isLoggingIn, on: "text-pink-400" },
  ];

  return (
    <div className="w-full rounded-lg border border-white/10 bg-gray-900/50 p-4 text-xs">
      <p className="mb-3 font-mono font-semibold text-cyan-400">
        useAbstraxionAccount() state
      </p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
        {items.map(({ label, value, on }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="font-mono text-gray-400">{label}:</span>
            <span className={`font-mono ${value ? on : "text-gray-600"}`}>
              {String(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
