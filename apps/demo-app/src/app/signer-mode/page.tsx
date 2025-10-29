'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTurnkey, AuthState } from '@turnkey/react-wallet-kit';
import { useAbstraxionAccount, useAbstraxionSigningClient } from '@burnt-labs/abstraxion';
import { Button } from '@burnt-labs/ui';
import '@burnt-labs/ui/dist/index.css';
import '@burnt-labs/abstraxion/dist/index.css';
import Link from 'next/link';
import { useSignerMode } from '@/hooks/useSignerMode';
import { useTurnkeyAuth } from './providers';

export default function SignerModePage() {
  const { authState, handleLogin: turnkeyLogin, user, wallets, httpClient, createWallet } = useTurnkey();
  const { registerAbstraxionLogin, registerCreateWallet, registerWalletsGetter } = useTurnkeyAuth();
  const {
    data: abstraxionAccount,
    isConnected,
    isConnecting,
    isLoading,
    login: abstraxionLogin,
    logout: abstraxionLogout
  } = useAbstraxionAccount();
  const { client } = useAbstraxionSigningClient();

  // Use the signer mode hook for balance and transactions
  const {
    balance,
    isLoadingBalance,
    sendTokens,
    isSending,
    txHash,
    txError,
    resetTxState
  } = useSignerMode(abstraxionAccount.bech32Address);

  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [hasAttemptedAutoConnect, setHasAttemptedAutoConnect] = useState(false);

  // Send transaction state
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');

  const wallet = wallets?.[0];
  const ethAccount = wallet?.accounts.find(
    a => a.addressFormat === 'ADDRESS_FORMAT_ETHEREUM'
  );

  // Check if Turnkey is fully ready (authenticated + wallet + httpClient)
  const isTurnkeyReady = authState === AuthState.Authenticated && !!wallet && !!httpClient;

  // Define handlers
  const handleAbstraxionConnect = useCallback(async () => {
    try {
      setError('');
      setStatus('Connecting to Abstraxion (creating smart account)...');
      await abstraxionLogin();
      setStatus('Connected successfully!');
    } catch (err: any) {
      console.error('Abstraxion connection error:', err);
      setError(err.message || 'Failed to connect to Abstraxion');
      setStatus('');
    }
  }, [abstraxionLogin]);

  const handleTurnkeyLogin = () => {
    turnkeyLogin();
  };

  // Debug Turnkey state changes
  useEffect(() => {
    console.log('[SignerModePage] Turnkey state changed:');
    console.log('  authState:', authState, '(Authenticated =', AuthState.Authenticated + ')');
    console.log('  wallets array length:', wallets?.length);
    console.log('  wallets:', wallets);
    console.log('  wallet:', wallet);
    console.log('  wallet accounts:', wallet?.accounts);
    console.log('  httpClient:', httpClient ? 'present' : 'missing');
    console.log('  isTurnkeyReady:', isTurnkeyReady);
    console.log('  user:', user);

    if (authState === AuthState.Authenticated && !wallet) {
      console.error('[SignerModePage] ❌ CRITICAL: Authenticated but no wallet available!');
      console.error('[SignerModePage] This means Turnkey created a session but no wallet was created or loaded');
      console.error('[SignerModePage] Wallets array:', wallets);
    }

    if (authState === AuthState.Authenticated && !httpClient) {
      console.warn('[SignerModePage] ISSUE: Authenticated but no httpClient available!');
    }

    if (authState === AuthState.Authenticated && wallet && wallet.accounts) {
      console.log('[SignerModePage] ✓ Wallet found with accounts:', wallet.accounts.length);
      wallet.accounts.forEach((acc, idx) => {
        console.log(`[SignerModePage]   Account ${idx}:`, {
          address: acc.address,
          addressFormat: acc.addressFormat,
          path: acc.path
        });
      });
    }
  }, [authState, wallets, wallet, httpClient, isTurnkeyReady, user]);

  // Register a getter function to access current wallets state
  useEffect(() => {
    registerWalletsGetter(() => wallets || []);
  }, [wallets, registerWalletsGetter]);

  // Register the createWallet function so it can be called from Turnkey success callback
  useEffect(() => {
    if (createWallet) {
      registerCreateWallet(createWallet);
    }
  }, [createWallet, registerCreateWallet]);

  // Register the Abstraxion login handler so it can be called from Turnkey success callback
  useEffect(() => {
    registerAbstraxionLogin(async () => {
      if (!isConnected && !isConnecting) {
        await handleAbstraxionConnect();
      }
    });
  }, [registerAbstraxionLogin, isConnected, isConnecting, handleAbstraxionConnect]);

  // FALLBACK: Only create wallet if authenticated but no wallet after a reasonable delay
  // This ensures callbacks have time to execute first
  useEffect(() => {
    const attemptWalletCreation = async () => {
      if (authState === AuthState.Authenticated && wallets?.length === 0 && createWallet && httpClient) {
        console.log('[SignerModePage] FALLBACK: User authenticated but no wallet found after delay.');
        console.log('[SignerModePage] FALLBACK: Attempting to create wallet...');

        // Generate unique wallet name with timestamp
        const timestamp = Date.now();
        const walletName = `XION Wallet ${timestamp}`;

        try {
          const walletId = await createWallet({
            walletName,
            accounts: [
              {
                curve: 'CURVE_SECP256K1',
                pathFormat: 'PATH_FORMAT_BIP32',
                path: "m/44'/60'/0'/0/0",
                addressFormat: 'ADDRESS_FORMAT_ETHEREUM',
              },
              {
                curve: 'CURVE_SECP256K1',
                pathFormat: 'PATH_FORMAT_BIP32',
                path: "m/44'/118'/0'/0/0",
                addressFormat: 'ADDRESS_FORMAT_UNCOMPRESSED',
              },
              {
                curve: 'CURVE_SECP256K1',
                pathFormat: 'PATH_FORMAT_BIP32',
                path: "m/44'/118'/0'/0/0",
                addressFormat: 'ADDRESS_FORMAT_COSMOS',
              },
            ],
          });
          console.log('[SignerModePage] FALLBACK: Wallet created successfully:', walletId);
        } catch (error) {
          console.error('[SignerModePage] FALLBACK: Error creating wallet:', error);
        }
      }
    };

    // Wait 2 seconds to give callbacks time to execute first
    const timer = setTimeout(attemptWalletCreation, 2000);
    return () => clearTimeout(timer);
  }, [authState, wallets, createWallet, httpClient]);

  // Auto-login to Abstraxion when Turnkey is ready but Abstraxion isn't connected
  // This handles the edge case of returning users with persisted Turnkey sessions
  useEffect(() => {
    if (isTurnkeyReady && !isConnected && !isConnecting && !hasAttemptedAutoConnect) {
      console.log('[SignerModePage] AUTO-CONNECT: Turnkey ready but Abstraxion not connected.');
      console.log('[SignerModePage] AUTO-CONNECT: Wallet details:', {
        walletId: wallet?.walletId,
        accountsCount: wallet?.accounts?.length,
        accounts: wallet?.accounts?.map(a => ({ address: a.address, format: a.addressFormat }))
      });
      console.log('[SignerModePage] AUTO-CONNECT: Waiting for wallet to be fully initialized with public keys...');

      // Mark that we're attempting auto-connect to prevent multiple attempts
      setHasAttemptedAutoConnect(true);

      // Wait 3 seconds to ensure wallet public keys are fully indexed by Turnkey
      // This prevents the PUBLIC_KEY_NOT_FOUND error when signing
      const timer = setTimeout(() => {
        console.log('[SignerModePage] AUTO-CONNECT: Automatically connecting to Abstraxion...');
        handleAbstraxionConnect();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isTurnkeyReady, isConnected, isConnecting, hasAttemptedAutoConnect, handleAbstraxionConnect, wallet]);

  // Reset auto-connect flag when user disconnects
  useEffect(() => {
    if (!isConnected && !isTurnkeyReady) {
      setHasAttemptedAutoConnect(false);
    }
  }, [isConnected, isTurnkeyReady]);

  const handleDisconnect = () => {
    abstraxionLogout();
    setStatus('Disconnected');
    setError('');
    setRecipient('');
    setAmount('');
    resetTxState();
  };

  const handleSendTokens = async () => {
    try {
      await sendTokens(recipient, amount);
      setRecipient('');
      setAmount('');
    } catch (error) {
      // Error is already set by the hook
      console.error('Send tokens error:', error);
    }
  };

  return (
    <main className="m-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 p-4">
      {/* Wallet Connection Loading Overlay - only show when creating smart account */}
      {isConnecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 max-w-sm rounded-lg border border-blue-500/30 bg-blue-500/10 p-6 text-center backdrop-blur-md">
            <div className="mb-4">
              <div className="mx-auto flex h-12 w-12 animate-pulse items-center justify-center rounded-full border-4 border-blue-500/30 bg-blue-500/20">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-400 border-r-transparent"></div>
              </div>
            </div>
            <p className="font-bold text-blue-400">Creating Smart Account</p>
            <p className="mt-2 text-sm text-gray-400">
              {status || 'Setting up your XION smart account...'}
            </p>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold tracking-tighter text-white">
        Signer Mode Abstraxion Example
      </h1>
      <p className="text-center text-gray-400">
        This example uses <strong>signer mode</strong> with Turnkey embedded wallets.
        Turnkey creates a secure wallet, then Abstraxion creates a smart account with
        session keys for gasless transactions.
      </p>

      <div className="w-full space-y-4">
        {!isConnected && (
          <>
            {/* Step 1: Turnkey Authentication */}
            {!isTurnkeyReady && (
              <>
                <Button
                  fullWidth
                  onClick={handleTurnkeyLogin}
                  structure="base"
                >
                  CONNECT WITH TURNKEY
                </Button>

                {/* Instructions */}
                <div className="rounded border border-blue-500/20 bg-blue-500/5 p-4">
                  <h3 className="font-semibold text-blue-400 mb-2">Step 1: Turnkey Authentication</h3>
                  <p className="text-sm text-gray-400">
                    Click the button above to authenticate with Turnkey. You'll receive an email with a code to verify your identity.
                  </p>
                </div>

                {/* Loading state after auth starts */}
                {authState === AuthState.Authenticated && !wallet && (
                  <div className="rounded border border-yellow-500/20 bg-yellow-500/10 p-4">
                    <div className="text-sm text-yellow-400 flex items-center gap-2">
                      <div className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-solid border-yellow-400 border-r-transparent"></div>
                      Loading wallet data...
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Step 2: Abstraxion Connection */}
            {isTurnkeyReady && !isConnected && (
              <>
                <div className="rounded border border-green-500/20 bg-green-500/10 p-4">
                  <p className="text-sm text-green-400">
                    ✓ Turnkey authenticated! Now connect to Abstraxion to create your smart account.
                  </p>
                </div>

                <Button
                  fullWidth
                  onClick={handleAbstraxionConnect}
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
                    "CREATE SMART ACCOUNT"
                  )}
                </Button>

                <div className="rounded border border-blue-500/20 bg-blue-500/5 p-4">
                  <h3 className="font-semibold text-blue-400 mb-2">Step 2: Create Smart Account</h3>
                  <p className="text-sm text-gray-400">
                    This will create a XION smart account and set up session keys for gasless transactions.
                  </p>
                </div>
              </>
            )}
          </>
        )}

        {/* Status Messages */}
        {status && !isConnecting && (
          <div className="rounded border border-blue-500/20 bg-blue-500/10 p-3">
            <p className="text-sm text-blue-400">
              {status}
            </p>
          </div>
        )}

        {error && (
          <div className="rounded border border-red-500/20 bg-red-500/10 p-3">
            <p className="text-sm text-red-400">
              <strong>Error:</strong> {error}
            </p>
          </div>
        )}

        {/* Abstraxion Account Info */}
        {isConnected && abstraxionAccount && (
          <>
            <div className="rounded border border-white/20 p-4 space-y-2">
              <h3 className="mb-2 font-semibold">Account Info</h3>
              <p className="text-sm text-gray-400 break-all">
                Address: {abstraxionAccount.bech32Address}
              </p>
              <p className="text-sm text-gray-400">
                Session Key: {client?.granteeAddress ? `${client.granteeAddress.slice(0, 20)}...` : 'N/A'}
              </p>
              <p className="text-sm text-gray-400">
                Client: {client ? "Connected" : "Not connected"}
              </p>
              <div className="pt-2 border-t border-white/10">
                <p className="text-sm text-gray-400">
                  Balance:{" "}
                  {isLoadingBalance ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-solid border-gray-400 border-r-transparent"></span>
                      Loading...
                    </span>
                  ) : balance !== null ? (
                    <span className="font-mono text-white">{balance} XION</span>
                  ) : (
                    "—"
                  )}
                </p>
              </div>
            </div>

            {client && (
              <div className="rounded border border-green-500/20 bg-green-500/10 p-4">
                <p className="text-sm text-green-400">
                  ✓ Successfully connected using signer mode! Session keys are ready for gasless transactions.
                </p>
              </div>
            )}

            {/* Low Balance Warning */}
            {balance !== null && parseFloat(balance) === 0 && (
              <div className="rounded border border-yellow-500/20 bg-yellow-500/10 p-4">
                <p className="text-sm text-yellow-400">
                  ⚠ Your account has no XION tokens. You'll need to fund this address to send transactions.
                </p>
              </div>
            )}

            {/* Send XION Section */}
            <div className="rounded border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
              <h3 className="font-semibold text-blue-400">Send XION</h3>

              <div className="space-y-2">
                <label className="block text-sm text-gray-400">
                  Recipient Address
                </label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="xion1..."
                  className="w-full rounded bg-black/30 border border-white/10 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm text-gray-400">
                    Amount (XION)
                  </label>
                  {balance !== null && parseFloat(balance) > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        // Leave ~0.01 XION for gas fees
                        const maxSend = Math.max(0, parseFloat(balance) - 0.01);
                        setAmount(maxSend.toFixed(6));
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 underline"
                    >
                      Max
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.001"
                  step="0.001"
                  min="0"
                  className="w-full rounded bg-black/30 border border-white/10 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <Button
                fullWidth
                onClick={handleSendTokens}
                disabled={isSending || !recipient || !amount}
                structure="base"
              >
                {isSending ? "SENDING..." : "SEND TOKENS"}
              </Button>

              {txHash && (
                <div className="rounded border border-green-500/20 bg-green-500/10 p-3">
                  <p className="text-xs text-green-400 font-medium mb-1">
                    ✓ Transaction Successful
                  </p>
                  <p className="text-xs text-gray-400 break-all">
                    Hash: {txHash}
                  </p>
                </div>
              )}

              {txError && (
                <div className="rounded border border-red-500/20 bg-red-500/10 p-3">
                  <p className="text-xs text-red-400">
                    ✗ {txError}
                  </p>
                </div>
              )}
            </div>

            {/* Connection Status Details (Collapsible) */}
            <details className="rounded border border-white/20 p-4">
              <summary className="cursor-pointer font-semibold text-sm">Connection Details</summary>
              <div className="mt-3 space-y-3">
                {/* Turnkey Status */}
                <div className="flex items-center justify-between p-3 rounded bg-black/30 border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${authState === AuthState.Authenticated ? 'bg-green-500' : 'bg-gray-500'}`} />
                    <span className="text-sm text-gray-400">Turnkey</span>
                  </div>
                  <span className={`text-sm font-medium ${authState === AuthState.Authenticated ? 'text-green-400' : 'text-gray-400'}`}>
                    {authState}
                  </span>
                </div>

                {/* Abstraxion Status */}
                <div className="flex items-center justify-between p-3 rounded bg-black/30 border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-500'}`} />
                    <span className="text-sm text-gray-400">Abstraxion</span>
                  </div>
                  <span className={`text-sm font-medium ${isConnected ? 'text-green-400' : 'text-gray-400'}`}>
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>

                {/* Turnkey Account Details */}
                {authState === AuthState.Authenticated && ethAccount && (
                  <div className="p-3 rounded bg-black/30 border border-white/10 space-y-2">
                    <p className="text-xs text-gray-400">Turnkey Ethereum Address:</p>
                    <p className="font-mono text-xs text-white break-all">
                      {ethAccount.address}
                    </p>
                    {user && (
                      <>
                        <p className="text-xs text-gray-400">User:</p>
                        <p className="text-xs text-white">
                          {user.userEmail || user.userName || 'Anonymous'}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </details>

            <Button
              fullWidth
              onClick={handleDisconnect}
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
