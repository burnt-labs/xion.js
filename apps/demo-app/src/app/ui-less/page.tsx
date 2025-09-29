"use client";
import { useEffect } from "react";
import {
  useAbstraxionAccount,
} from "@burnt-labs/abstraxion";
import { Button } from "@burnt-labs/ui";
import "@burnt-labs/ui/dist/index.css";
import Link from "next/link";
import { StateTooltip } from "../../components/StateTooltip";

export default function UILessPage(): JSX.Element {
  const { data: account, login, logout, isConnected, isLoading, isInitializing, isLoggingIn, isConnecting, isReturningFromAuth } = useAbstraxionAccount();

  // Log state changes to show how your Dapp reacts
  useEffect(() => {
    console.log("[UILessPage] State update:", {
      isInitializing,
      isConnecting,
      isConnected,
      isLoading,
      isReturningFromAuth,
      hasAddress: !!account.bech32Address,
      address: account.bech32Address?.slice(0, 10) + "...",
      isLoggingIn
    });
  }, [isInitializing, isConnecting, isConnected, isLoading, account.bech32Address, isLoggingIn]);

  const handleLogin = async () => {
    try {
      await login();
    } catch (error) {
    }
  };

  return (
    <main className="m-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tighter text-white mb-2">
          Enhanced Loading States Demo
        </h1>
        <p className="text-gray-400 text-sm max-w-md">
          This demo showcases how to setup a connection flow for your dApp throug Abstraxion.
        </p>
      </div>

      {/* Enhanced Debug Panel */}
      <div className="w-full rounded border border-white/10 bg-gray-900/50 backdrop-blur-sm p-4 text-xs">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse"></div>
          <p className="font-mono text-cyan-400 font-semibold">Authentication States</p>
        </div>

        {/* There is a short period before the UI knows the actual connected state of the user. Consider it the mounting of the  UI */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="font-mono text-gray-400">isInitializing:</span>
              <StateTooltip text="There is a short period before the UI knows the actual connected state of the user. Consider it the mounting of the UI" />
            </div>
            <div className="flex items-center gap-1">
              <div className={`h-2 w-2 rounded-full ${isInitializing ? 'bg-yellow-400 animate-pulse' : 'bg-gray-600'}`}></div>
              <span className={`font-mono ${isInitializing ? "text-yellow-400 font-semibold" : "text-gray-600"}`}>
                {String(isInitializing)}
              </span>
            </div>
          </div>

          {/* If the user clicked the login button they are actively connecting to the dApp. isConnecting is true in this state */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="font-mono text-gray-400">isConnecting:</span>
              <StateTooltip text="If the user clicked the login button they are actively connecting to the dApp. isConnecting is true in this state" />
            </div>
            <div className="flex items-center gap-1">
              <div className={`h-2 w-2 rounded-full ${isConnecting ? 'bg-blue-400 animate-pulse' : 'bg-gray-600'}`}></div>
              <span className={`font-mono ${isConnecting ? "text-blue-400 font-semibold" : "text-gray-600"}`}>
                {String(isConnecting)}
              </span>
            </div>
          </div>

          {/* When the abstraxion context is fully considered it returns a valid isConnected state as either true or false */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="font-mono text-gray-400">isConnected:</span>
              <StateTooltip text="When the abstraxion context is fully considered it returns a valid isConnected state as either true or false" />
            </div>
            <div className="flex items-center gap-1">
              <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`}></div>
              <span className={`font-mono ${isConnected ? "text-green-400 font-semibold" : "text-gray-600"}`}>
                {String(isConnected)}
              </span>
            </div>
          </div>

          {/* The ui also has access to the aggregated loading state of the abstraxion context- isLoading is true if the user is initializing, connecting, or in transition state */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="font-mono text-gray-400">isLoading:</span>
              <StateTooltip text="The UI also has access to the aggregated loading state of the abstraxion context - isLoading is true if the user is initializing, connecting, or in transition state" />
            </div>
            <div className="flex items-center gap-1">
              <div className={`h-2 w-2 rounded-full ${isLoading ? 'bg-orange-400 animate-pulse' : 'bg-gray-600'}`}></div>
              <span className={`font-mono ${isLoading ? "text-orange-400 font-semibold" : "text-gray-600"}`}>
                {String(isLoading)}
              </span>
            </div>
          </div>

          {/* isReturningFromAuth is true when the user is returning from the abstraxion login callback, this way you can show a different UI when people return if you want to. */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="font-mono text-gray-400">isReturningFromAuth:</span>
              <StateTooltip text="isReturningFromAuth is true when the user is returning from the abstraxion login callback, this way you can show a different UI when people return if you want to" />
            </div>
            <div className="flex items-center gap-1">
              <div className={`h-2 w-2 rounded-full ${isReturningFromAuth ? 'bg-purple-400 animate-pulse' : 'bg-gray-600'}`}></div>
              <span className={`font-mono ${isReturningFromAuth ? "text-purple-400 font-semibold" : "text-gray-600"}`}>
                {String(isReturningFromAuth)}
              </span>
            </div>
          </div>

          {/* isLoggingIn is true when the user has just clicked the login button and the login process is being initiated */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="font-mono text-gray-400">isLoggingIn:</span>
              <StateTooltip text="isLoggingIn is true when the user has just clicked the login button and the login process is being initiated" />
            </div>
            <div className="flex items-center gap-1">
              <div className={`h-2 w-2 rounded-full ${isLoggingIn ? 'bg-pink-400 animate-pulse' : 'bg-gray-600'}`}></div>
              <span className={`font-mono ${isLoggingIn ? "text-pink-400 font-semibold" : "text-gray-600"}`}>
                {String(isLoggingIn)}
              </span>
            </div>
          </div>
        </div>

      </div>

      <div className="w-full space-y-4">
        <Button
          fullWidth
          onClick={isConnected && account.bech32Address ? () => {
            console.log("[UILessPage] User clicked disconnect (X icon)");
            logout();
          } : handleLogin}
          structure={isConnected ? "outlined" : "base"}
          disabled={isLoading}
          className={`transition-all duration-200 ${isConnected
            ? "border-green-500/50 text-green-400 hover:bg-red-500/10 hover:border-red-500/50 group"
            : isLoading
              ? "opacity-50 cursor-not-allowed"
              : "hover:scale-[1.02]"
            }`}
        >
          {isConnected && account.bech32Address ? (
            <div className="flex items-center justify-between w-full px-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse"></div>
                <span>Connected: {account.bech32Address.slice(0, 10)}...</span>
              </div>
              <div className="text-lg group-hover:text-red-400 transition-colors opacity-60 group-hover:opacity-100">×</div>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <div className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent`}></div>
              <span>
                {isInitializing
                  ? "CHECKING SESSION..."
                  : isConnecting && isReturningFromAuth
                    ? "COMPLETING AUTH..."
                    : isConnecting
                      ? "CONNECTING..."
                      : "LOADING..."
                }
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <span>CONNECT WALLET</span>
              <div className="text-xs opacity-60">→</div>
            </div>
          )}
        </Button>

        {/* State Flow Indicator */}
        <div className="w-full rounded border border-gray-600/30 bg-gray-800/50 p-3">
          <p className="text-xs text-gray-400 mb-2 font-semibold">Authentication Flow:</p>
          <div className="flex items-center justify-between text-xs">
            <div className={`flex items-center gap-1 ${isInitializing ? 'text-yellow-400' : isInitializing === false ? 'text-green-400' : 'text-gray-600'
              }`}>
              <div className={`h-2 w-2 rounded-full ${isInitializing
                ? 'bg-yellow-400 animate-pulse'
                : isInitializing === false
                  ? 'bg-green-400'
                  : 'bg-gray-600'
                }`}></div>
              <span>Init</span>
            </div>
            <div className={`h-px flex-1 mx-2 ${isInitializing === false ? 'bg-green-400/50' : 'bg-gray-600'
              }`}></div>
            <div className={`flex items-center gap-1 ${isConnecting && !isReturningFromAuth ? 'text-blue-400' : isConnected ? 'text-green-400' : 'text-gray-600'
              }`}>
              <div className={`h-2 w-2 rounded-full ${isConnecting && !isReturningFromAuth
                ? 'bg-blue-400 animate-pulse'
                : isConnected
                  ? 'bg-green-400'
                  : 'bg-gray-600'
                }`}></div>
              <span>Connect</span>
            </div>
            <div className={`h-px flex-1 mx-2 ${isConnecting || isConnected ? 'bg-green-400/50' : 'bg-gray-600'
              }`}></div>
            <div className={`flex items-center gap-1 ${isReturningFromAuth ? 'text-purple-400' : isConnected ? 'text-green-400' : 'text-gray-600'
              }`}>
              <div className={`h-2 w-2 rounded-full ${isReturningFromAuth
                ? 'bg-purple-400 animate-pulse'
                : isConnected
                  ? 'bg-green-400'
                  : 'bg-gray-600'
                }`}></div>
              <span>Auth</span>
            </div>
            <div className={`h-px flex-1 mx-2 ${isConnected ? 'bg-green-400/50' : 'bg-gray-600'
              }`}></div>
            <div className={`flex items-center gap-1 ${isConnected ? 'text-green-400' : 'text-gray-600'
              }`}>
              <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-gray-600'
                }`}></div>
              <span>Ready</span>
            </div>
          </div>
        </div>

      </div>

      <Link
        href="/"
        className="mt-4 inline-block text-sm text-gray-400 underline hover:text-gray-300"
      >
        ← Back to examples
      </Link>

      {/* Loading Overlays and UI Lock */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/10 z-40" />
      )}

      {/* Loading Overlays - Show for initialization, login flows, and Auth callbacks */}
      {(isInitializing || isConnecting || isReturningFromAuth || isLoggingIn) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          {/* Priority order: Auth callback > logging in > regular connecting > isInitializing */}
          {isReturningFromAuth ? (
            <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 backdrop-blur-md p-6 text-center max-w-sm mx-4">
              <div className="mb-4">
                <div className="mx-auto h-12 w-12 animate-pulse rounded-full border-4 border-purple-500/30 bg-purple-500/20 flex items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-solid border-purple-400 border-r-transparent"></div>
                </div>
              </div>
              <p className="font-bold text-purple-400">Completing Authentication</p>
              <p className="text-sm text-gray-400 mt-2">
                Processing authentication from authorization server
              </p>
            </div>
          ) : isLoggingIn ? (
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 backdrop-blur-md p-6 text-center max-w-sm mx-4">
              <div className="mb-4">
                <div className="mx-auto h-12 w-12 animate-pulse rounded-full border-4 border-blue-500/30 bg-blue-500/20 flex items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-400 border-r-transparent"></div>
                </div>
              </div>
              <p className="font-bold text-blue-400">Redirecting to Authorization</p>
              <p className="text-sm text-gray-400 mt-2">
                Opening XION dashboard for secure authentication
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <div className="inline-block h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.3s]"></div>
                <div className="inline-block h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.15s]"></div>
                <div className="inline-block h-2 w-2 animate-bounce rounded-full bg-blue-400"></div>
              </div>
              <p className="text-xs text-gray-500 mt-4">
                You'll be redirected back here after authentication
              </p>
            </div>
          ) : isConnecting && !isReturningFromAuth ? (
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 backdrop-blur-md p-6 text-center max-w-sm mx-4">
              <div className="mb-4">
                <div className="mx-auto h-12 w-12 animate-pulse rounded-full border-4 border-blue-500/30 bg-blue-500/20 flex items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-400 border-r-transparent"></div>
                </div>
              </div>
              <p className="font-bold text-blue-400">Establishing Connection</p>
              <p className="text-sm text-gray-400 mt-2">
                Connecting to your XION account and verifying permissions
              </p>
            </div>
          ) : isInitializing ? (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 backdrop-blur-md p-6 text-center max-w-sm mx-4">
              <div className="mb-4">
                <div className="mx-auto h-12 w-12 animate-pulse rounded-full border-4 border-yellow-500/30 bg-yellow-500/20 flex items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-solid border-yellow-400 border-r-transparent"></div>
                </div>
              </div>
              <p className="font-bold text-yellow-400">Initializing Application</p>
              <p className="text-sm text-gray-400 mt-2">
                Checking for existing authentication and restoring session
              </p>
              <div className="mt-4">
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-yellow-400 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </main>
  );
}
