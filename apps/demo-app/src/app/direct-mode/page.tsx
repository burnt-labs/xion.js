"use client";
import {
  useAbstraxionAccount,
  useAbstraxionSigningClient,
} from "@burnt-labs/abstraxion";
import { Button } from "@burnt-labs/ui";
import "@burnt-labs/ui/dist/index.css";
import "@burnt-labs/abstraxion/dist/index.css";
import Link from "next/link";
import { SendTokens } from "@/components/SendTokens";
import { useDirectMode } from "./layout";

export default function DirectModePage(): JSX.Element {
  // Get setShowModal from the layout context
  const { setShowModal } = useDirectMode();

  const {
    data: account,
    logout,
    isConnecting,
    isInitializing,
    isLoading
  } = useAbstraxionAccount();
  const { client } = useAbstraxionSigningClient();

  // Show modal when connect button is clicked
  // The useConnectorSelection hook handles the actual connection via orchestrator
  const handleLogin = () => {
    setShowModal(true);
  };

  return (
    <main className="m-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 p-4">
      {/* Initialization Loading Overlay */}
      {isInitializing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-lg">
          <div className="mx-4 max-w-sm rounded-lg border border-yellow-500/50 bg-black/80 backdrop-blur-xl p-8 text-center shadow-2xl">
            <div className="mb-6">
              <div className="mx-auto flex h-16 w-16 animate-pulse items-center justify-center rounded-full border-4 border-yellow-500/40 bg-yellow-500/20">
                <div className="h-8 w-8 animate-spin rounded-full border-3 border-solid border-yellow-400 border-r-transparent"></div>
              </div>
            </div>
            <p className="text-lg font-bold text-yellow-400">Initializing</p>
            <p className="mt-3 text-sm text-gray-300">
              Checking for existing session...
            </p>
          </div>
        </div>
      )}

      {/* Wallet Connection Loading Overlay */}
      {isConnecting && !isInitializing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-lg">
          <div className="mx-4 max-w-sm rounded-lg border border-blue-500/50 bg-black/80 backdrop-blur-xl p-8 text-center shadow-2xl">
            <div className="mb-6">
              <div className="mx-auto flex h-16 w-16 animate-pulse items-center justify-center rounded-full border-4 border-blue-500/40 bg-blue-500/20">
                <div className="h-8 w-8 animate-spin rounded-full border-3 border-solid border-blue-400 border-r-transparent"></div>
              </div>
            </div>
            <p className="text-lg font-bold text-blue-400">Connecting Wallet</p>
            <p className="mt-3 text-sm text-gray-300">
              Please approve the connection in your wallet
            </p>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold tracking-tighter text-white">
        Direct Mode Abstraxion Example
      </h1>
      <p className="text-center text-gray-400">
        This example uses custom connectors with the <strong>useConnectorSelection</strong> hook
        which allows in-app wallet connections without redirecting to the dashboard. 
        Connect with MetaMask, Keplr, Leap, or OKX directly in this app.
      </p>

      <div className="w-full space-y-4">
        {!account.bech32Address && (
          <Button
            fullWidth
            onClick={handleLogin}
            structure="base"
            disabled={isLoading || isConnecting}
          >
            {isLoading || isConnecting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></div>
                <span>
                  {isConnecting ? "CONNECTING..." : "LOADING..."}
                </span>
              </div>
            ) : (
              "CONNECT WALLET (DIRECT MODE)"
            )}
          </Button>
        )}

        {account.bech32Address && (
          <>
            <div className="rounded border border-green-500/20 bg-green-500/10 p-4">
              <p className="text-sm text-green-400">
                ✓ Successfully connected using direct mode! No dashboard redirect needed.
              </p>
            </div>

            <SendTokens
              accountAddress={account.bech32Address}
              client={client}
              memo="Send XION via Abstraxion Direct Mode"
            />

            <Button
              fullWidth
              onClick={() => {
                if (logout) logout();
              }}
              structure="outlined"
            >
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
