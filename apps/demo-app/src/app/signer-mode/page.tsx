"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTurnkey, AuthState } from "@turnkey/react-wallet-kit";
import {
  useAbstraxionAccount,
  useAbstraxionSigningClient,
} from "@burnt-labs/abstraxion";
import { Button } from "@burnt-labs/ui";
import "@burnt-labs/ui/dist/index.css";
import Link from "next/link";
import { SendTokens } from "@/components/SendTokens";
import { useTurnkeyAuth } from "./providers";

// Prevent static generation - this page requires runtime env vars
export const dynamic = 'force-dynamic';
export default function SignerModePage() {
  const {
    authState,
    handleLogin: turnkeyLogin,
    logout: turnkeyLogout,
    user,
    wallets,
    httpClient,
    createWallet,
  } = useTurnkey();
  const {
    registerAbstraxionLogin,
    registerAbstraxionLogout,
    registerCreateWallet,
    registerWalletsGetter,
  } = useTurnkeyAuth();
  const {
    data: abstraxionAccount,
    isConnected,
    isConnecting,
    isInitializing,
    login: abstraxionLogin,
    logout: abstraxionLogout,
  } = useAbstraxionAccount();

  // Get the signing client to pass to child components
  const { client } = useAbstraxionSigningClient();

  // can create a smart account with any Account but we use the Eth style account in this example
  const wallet = wallets?.[0];
  const ethAccount = wallet?.accounts.find(
    (a) => a.addressFormat === "ADDRESS_FORMAT_ETHEREUM",
  );

  // Check if Turnkey is fully ready (authenticated + wallet + httpClient)
  const isTurnkeyReady =
    authState === AuthState.Authenticated && !!wallet && !!httpClient;

  // Function to be called to handle the login in case the Callback from @turnkey/react-wallet-kit fails to connect to Abstraxion
  // Could also use only this style and remove the integration with Turnkey onSuccess callback
  const handleAbstraxionConnect = useCallback(async () => {
    try {
      await abstraxionLogin();
    } catch (err: any) {
      console.error("Abstraxion connection error:", err);
    }
  }, [abstraxionLogin]);

  // Called when connect button is clicked
  const handleTurnkeyLogin = useCallback(() => {
    turnkeyLogin();
  }, [turnkeyLogin]);

  // Register functions for Turnkey callbacks (only run once on mount and when functions change)
  // These functions are used by the onSuccess callback from @turnkey/react-wallet-kit to connect to Abstraxion
  useEffect(() => {
    registerWalletsGetter(() => wallets || []);

    if (createWallet) {
      registerCreateWallet(createWallet);
    }

    registerAbstraxionLogin(async () => {
      if (!isConnected && !isConnecting) {
        await handleAbstraxionConnect();
      }
    });

    // Register logout handler so Turnkey can trigger Abstraxion logout on session expiration
    registerAbstraxionLogout(() => {
      if (abstraxionLogout) {
        abstraxionLogout();
      }
    });
  }, [
    wallets,
    createWallet,
    registerWalletsGetter,
    registerCreateWallet,
    registerAbstraxionLogin,
    registerAbstraxionLogout,
    isConnected,
    isConnecting,
    handleAbstraxionConnect,
    abstraxionLogout,
  ]);

  // Single sync check: Ensure Turnkey auth and Abstraxion connection states are consistent
  // This is tried once if for some reason the onSuccess callback fails to connect to Abstraxion
  useEffect(() => {
    let hasAttempted = false;

    // Only attempt connection if Turnkey is fully ready but Abstraxion is not connected
    if (isTurnkeyReady && !isConnected && !isConnecting && !hasAttempted) {
      hasAttempted = true;

      // Small delay to ensure wallet is fully indexed
      const timer = setTimeout(() => {
        handleAbstraxionConnect();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isTurnkeyReady, isConnected, isConnecting, handleAbstraxionConnect]);

  // Combined disconnect function to logout from both Abstraxion and Turnkey
  const handleDisconnect = useCallback(() => {
    // Logout from both Abstraxion and Turnkey
    if (abstraxionLogout) {
      abstraxionLogout();
    }

    if (turnkeyLogout) {
      turnkeyLogout();
    }
  }, [abstraxionLogout, turnkeyLogout]);

  // Combined initialization state: both Abstraxion and Turnkey need to initialize, can separate if you want to see the difference
  const isSystemInitializing =
    isInitializing ||
    (authState !== AuthState.Authenticated &&
      authState !== AuthState.Unauthenticated);

  return (
    <main className="m-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 p-4">
      {/* Initialization Loading Overlay - System is checking for existing sessions */}
      {isSystemInitializing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-lg">
          <div className="mx-4 max-w-sm rounded-lg border border-yellow-500/50 bg-black/80 p-8 text-center shadow-2xl backdrop-blur-xl">
            <div className="mb-6">
              <div className="mx-auto flex h-16 w-16 animate-pulse items-center justify-center rounded-full border-4 border-yellow-500/40 bg-yellow-500/20">
                <div className="border-3 h-8 w-8 animate-spin rounded-full border-solid border-yellow-400 border-r-transparent"></div>
              </div>
            </div>
            <p className="text-lg font-bold text-yellow-400">Initializing</p>
            <p className="mt-3 text-sm text-gray-300">
              Checking for existing sessions...
            </p>
          </div>
        </div>
      )}

      {/* Wallet Connection Loading Overlay - only show when creating smart account */}
      {isConnecting && !isSystemInitializing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-lg">
          <div className="mx-4 max-w-sm rounded-lg border border-blue-500/50 bg-black/80 p-8 text-center shadow-2xl backdrop-blur-xl">
            <div className="mb-6">
              <div className="mx-auto flex h-16 w-16 animate-pulse items-center justify-center rounded-full border-4 border-blue-500/40 bg-blue-500/20">
                <div className="border-3 h-8 w-8 animate-spin rounded-full border-solid border-blue-400 border-r-transparent"></div>
              </div>
            </div>
            <p className="text-lg font-bold text-blue-400">
              Creating Smart Account
            </p>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold tracking-tighter text-white">
        Signer Mode Abstraxion Example
      </h1>
      <p className="text-center text-gray-400">
        This example uses <strong>signer mode</strong> with Turnkey embedded
        wallets. Turnkey creates a secure wallet, then Abstraxion creates a
        smart account with session keys for gasless transactions.
      </p>

      <div className="w-full space-y-4">
        {/* Authentication Flow Indicator */}
        <div className="w-full rounded-lg border border-gray-600/30 bg-gray-800/50 p-4">
          <p className="mb-3 text-xs font-semibold text-gray-400">
            Authentication Flow:
          </p>
          <div className="flex items-center justify-between text-xs">
            {/* Init */}
            <div
              className={`flex items-center gap-1 ${
                isSystemInitializing
                  ? "text-yellow-400"
                  : !isSystemInitializing &&
                      (authState !== AuthState.Unauthenticated || wallet)
                    ? "text-green-400"
                    : "text-gray-400"
              }`}
            >
              <div
                className={`h-2 w-2 rounded-full ${
                  isSystemInitializing
                    ? "animate-pulse bg-yellow-400"
                    : !isSystemInitializing &&
                        (authState !== AuthState.Unauthenticated || wallet)
                      ? "bg-green-400"
                      : "bg-gray-400"
                }`}
              ></div>
              <span>Init</span>
            </div>
            <div
              className={`mx-2 h-px flex-1 ${
                !isSystemInitializing && authState !== AuthState.Unauthenticated
                  ? "bg-green-400/50"
                  : "bg-gray-600"
              }`}
            ></div>

            {/* Turnkey Auth */}
            <div
              className={`flex items-center gap-1 ${
                authState === AuthState.Authenticated && !wallet
                  ? "text-yellow-400"
                  : authState === AuthState.Authenticated && wallet
                    ? "text-green-400"
                    : "text-gray-600"
              }`}
            >
              <div
                className={`h-2 w-2 rounded-full ${
                  authState === AuthState.Authenticated && !wallet
                    ? "animate-pulse bg-yellow-400"
                    : authState === AuthState.Authenticated && wallet
                      ? "bg-green-400"
                      : "bg-gray-600"
                }`}
              ></div>
              <span>Turnkey</span>
            </div>
            <div
              className={`mx-2 h-px flex-1 ${
                isTurnkeyReady ? "bg-green-400/50" : "bg-gray-600"
              }`}
            ></div>

            {/* Smart Account */}
            <div
              className={`flex items-center gap-1 ${
                isTurnkeyReady && isConnecting
                  ? "text-blue-400"
                  : isConnected
                    ? "text-green-400"
                    : "text-gray-600"
              }`}
            >
              <div
                className={`h-2 w-2 rounded-full ${
                  isTurnkeyReady && isConnecting
                    ? "animate-pulse bg-blue-400"
                    : isConnected
                      ? "bg-green-400"
                      : "bg-gray-600"
                }`}
              ></div>
              <span>Account</span>
            </div>
            <div
              className={`mx-2 h-px flex-1 ${
                isConnected ? "bg-green-400/50" : "bg-gray-600"
              }`}
            ></div>

            {/* Ready */}
            <div
              className={`flex items-center gap-1 ${
                isConnected ? "text-green-400" : "text-gray-600"
              }`}
            >
              <div
                className={`h-2 w-2 rounded-full ${
                  isConnected ? "animate-pulse bg-green-400" : "bg-gray-600"
                }`}
              ></div>
              <span>Ready</span>
            </div>
          </div>
        </div>

        {!isConnected && (
          <>
            {/* Connect Button */}
            {!isTurnkeyReady && (
              <Button fullWidth onClick={handleTurnkeyLogin} structure="base">
                CONNECT WALLET
              </Button>
            )}
          </>
        )}

        {/* Abstraxion Account Info */}
        {isConnected && abstraxionAccount && (
          <>
            <div className="space-y-2 rounded-lg border border-white/10 bg-gray-900/50 p-4 backdrop-blur-sm">
              <h3 className="mb-2 font-semibold">Turnkey Info</h3>
              <p className="break-all text-sm text-gray-400">
                Ethereum Address: {ethAccount?.address || "N/A"}
              </p>
              <div className="border-t border-white/10 pt-2">
                <p className="text-sm text-gray-400">
                  User:{" "}
                  <span className="font-mono text-white">
                    {user?.userEmail || user?.userName || "Anonymous"}
                  </span>
                </p>
              </div>
            </div>

            <SendTokens
              accountAddress={abstraxionAccount.bech32Address}
              client={client}
              memo="Send XION via Abstraxion Signer Mode"
            />

            <Button fullWidth onClick={handleDisconnect} structure="outlined">
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
    </main>
  );
}
