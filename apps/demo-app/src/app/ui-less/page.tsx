"use client";
import { useState, useEffect } from "react";
import {
  useAbstraxionAccount,
  useAbstraxionSigningClient,
} from "@burnt-labs/abstraxion";
import { Button } from "@burnt-labs/ui";
import "@burnt-labs/ui/dist/index.css";
import Link from "next/link";

export default function UILessPage(): JSX.Element {
  // Direct consumption - no intermediate state
  const { data: account, login, logout, isConnecting, isConnected } = useAbstraxionAccount();
  const { client } = useAbstraxionSigningClient();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showUI, setShowUI] = useState(false);

  // After isConnecting resolves to false, wait 1s then show UI
  useEffect(() => {
    if (!isConnecting && !isLoggingIn) {
      const timer = setTimeout(() => {
        setShowUI(true);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setShowUI(false);
    }
  }, [isConnecting, isLoggingIn]);

  // Debug logging to understand state transitions - Shows a race condition between isconnecting and isconnected and account address
  useEffect(() => {
    console.log('AUTH STATE:', {
      isConnecting,
      isConnected,
      account,
      hasAccount: !!account?.bech32Address,
      accountAddress: account?.bech32Address,
      isLoggingIn,
    });
  }, [isConnecting, isConnected, account, isLoggingIn]);

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      await login();
    } catch (error) {
      console.error("Error logging in:", error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Show loading until timer completes and we're ready to show UI
  const shouldShowLoading = !showUI;

  return (
    <main className="m-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-2xl font-bold tracking-tighter text-white">
        Custom UI Abstraxion Example
      </h1>
      <p className="text-center text-gray-400">
        This example demonstrates using Abstraxion with a custom UI instead of
        the default modal. The login flow redirects to an external page and
        returns to the app.
      </p>

      {shouldShowLoading ? (
        <div className="w-full flex justify-center">
          <div className="rounded border border-white/20 p-6 text-center">
            <p className="font-bold">
              {isConnecting || isLoggingIn ? "Completing authentication..." : "Loading..."}
            </p>
            <p className="text-sm">
              {isConnecting || isLoggingIn ? "Processing your login..." : "Please wait..."}
            </p>
            <div className="mt-4">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full space-y-4">
          <Button
            fullWidth
            onClick={handleLogin}
            structure="base"
            disabled={isLoggingIn}
          >
            {isConnected && account?.bech32Address ? (
              <div className="flex items-center justify-center">
                Connected: {account.bech32Address.slice(0, 10)}...
              </div>
            ) : (
              <div className="flex items-center justify-center">
                "CONNECT WALLET"
              </div>
            )}
          </Button>

          {isConnected && account?.bech32Address && (
            <>
              <div className="rounded border border-white/20 p-4">
                <h3 className="mb-2 font-semibold">Account Info</h3>
                <p className="text-sm text-gray-400">
                  Address: {account?.bech32Address}
                </p>
                <p className="text-sm text-gray-400">
                  Client: {client ? "Connected" : "Not connected"}
                </p>
              </div>

              <Button fullWidth onClick={() => logout()} structure="outlined">
                DISCONNECT
              </Button>
            </>
          )}
        </div>
      )}

      <Link
        href="/"
        className="mt-4 inline-block text-sm text-gray-400 underline hover:text-gray-300"
      >
        ← Back to examples
      </Link>
    </main>
  );
}
