"use client";
import { useState } from "react";
import {
  useAbstraxionAccount,
  useAbstraxionSigningClient,
} from "@burnt-labs/abstraxion";
import { Button } from "@burnt-labs/ui";
import "@burnt-labs/ui/dist/index.css";
import Link from "next/link";
import { GrantChangeNotification } from "../../components/GrantChangeNotification";

export default function UILessPage(): JSX.Element {
  const { data: account, login, logout, isConnecting } = useAbstraxionAccount();
  const { client } = useAbstraxionSigningClient();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

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

  if (isLoggingIn) {
    return (
      <main className="m-auto flex min-h-screen max-w-xs flex-col items-center justify-center gap-4 p-4">
        <div className="rounded border border-white/20 p-6 text-center">
          <p className="font-bold">You are being redirected...</p>
          <p className="text-sm">
            This is a custom loading UI - you can style this however you want!
          </p>
          <div className="mt-4">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          </div>
        </div>
      </main>
    );
  }

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

      <div className="w-full space-y-4">
        <Button
          fullWidth
          onClick={handleLogin}
          structure="base"
          disabled={isConnecting}
        >
          {account.bech32Address ? (
            <div className="flex items-center justify-center">
              Connected: {account.bech32Address.slice(0, 10)}...
            </div>
          ) : isConnecting ? (
            "LOADING..."
          ) : (
            "CONNECT WALLET"
          )}
        </Button>

        {account.bech32Address && (
          <>
            <div className="rounded border border-white/20 p-4">
              <h3 className="mb-2 font-semibold">Account Info</h3>
              <p className="text-sm text-gray-400">
                Address: {account.bech32Address}
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

      <Link
        href="/"
        className="mt-4 inline-block text-sm text-gray-400 underline hover:text-gray-300"
      >
        ← Back to examples
      </Link>

      {/* Grant Change Notification */}
      <GrantChangeNotification />
    </main>
  );
}
