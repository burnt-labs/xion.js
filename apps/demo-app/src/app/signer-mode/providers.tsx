'use client';

import React, { createContext, useContext, useRef } from 'react';
import { TurnkeyProvider, TurnkeyProviderConfig } from '@turnkey/react-wallet-kit';
import '@turnkey/react-wallet-kit/styles.css';

// Context to provide a way to register handlers
interface TurnkeyAuthContextType {
  registerAbstraxionLogin: (handler: () => Promise<void>) => void;
  registerCreateWallet: (handler: (params: any) => Promise<string>) => void;
  registerWalletsGetter: (getter: () => any[]) => void;
}

const TurnkeyAuthContext = createContext<TurnkeyAuthContextType | null>(null);

export function useTurnkeyAuth() {
  const context = useContext(TurnkeyAuthContext);
  if (!context) {
    throw new Error('useTurnkeyAuth must be used within TurnkeyAuthProvider');
  }
  return context;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const abstraxionLoginRef = useRef<(() => Promise<void>) | null>(null);
  const createWalletRef = useRef<((params: any) => Promise<string>) | null>(null);
  const walletsGetterRef = useRef<(() => any[]) | null>(null);

  const registerAbstraxionLogin = (handler: () => Promise<void>) => {
    abstraxionLoginRef.current = handler;
  };

  const registerCreateWallet = (handler: (params: any) => Promise<string>) => {
    createWalletRef.current = handler;
  };

  const registerWalletsGetter = (getter: () => any[]) => {
    walletsGetterRef.current = getter;
  };
  const turnkeyConfig: TurnkeyProviderConfig = {
    organizationId: process.env.NEXT_PUBLIC_TURNKEY_ORG_ID!,
    authProxyConfigId: '5119dae0-9dd2-4b94-a7df-131c945f3afc',

    // Enable authentication methods
    auth: {
      // Create wallets for Cosmos chains (Xion, Noble) and EVM chains (Base)
      createSuborgParams: {
        emailOtpAuth: {
          userName: 'XION User',
          customWallet: {
            walletName: 'Multi-Chain Wallet',
            walletAccounts: [
                // EVM chain account - We'll derive Cosmos addresses from this
                {
                    curve: "CURVE_SECP256K1",
                    pathFormat: "PATH_FORMAT_BIP32",
                    path: "m/44'/60'/0'/0/0", // Ethereum derivation path
                    addressFormat: "ADDRESS_FORMAT_ETHEREUM",
                },
            ],
          },
        },
        passkeyAuth: {
          userName: 'XION User',
          customWallet: {
            walletName: 'Multi-Chain Wallet',
            walletAccounts: [
                // EVM chain accounts FIRST (Base, Polygon, etc.)
                {
                    curve: "CURVE_SECP256K1",
                    pathFormat: "PATH_FORMAT_BIP32",
                    path: "m/44'/60'/0'/0/0", // Ethereum derivation path
                    addressFormat: "ADDRESS_FORMAT_ETHEREUM",
                },
                // Cosmos chain accounts (Xion, Noble)
                {
                    curve: "CURVE_SECP256K1",
                    pathFormat: "PATH_FORMAT_BIP32",
                    path: "m/44'/118'/0'/0/0",
                    addressFormat: "ADDRESS_FORMAT_UNCOMPRESSED",
                },
                {
                    curve: "CURVE_SECP256K1",
                    pathFormat: "PATH_FORMAT_BIP32",
                    path: "m/44'/118'/0'/0/0",
                    addressFormat: "ADDRESS_FORMAT_COSMOS",
                },
            ],
          },
        },
      },
      autoRefreshSession: true,
    },

    // UI customization
    ui: {
      darkMode: false,
      colors: {
        light: {
          primary: '#6366f1', // Indigo primary color
        },
      },
    },
  };

  return (
    <TurnkeyAuthContext.Provider value={{ registerAbstraxionLogin, registerCreateWallet, registerWalletsGetter }}>
      <TurnkeyProvider
        config={turnkeyConfig}
        callbacks={{
          onError: (error) => {
            console.error('[Turnkey] ERROR:', error);
            console.error('[Turnkey] Error details:', JSON.stringify(error, null, 2));
          },
          onAuthenticationSuccess: async ({ session }) => {
            console.log('[Turnkey] Authentication SUCCESS!');
            console.log('[Turnkey] Session:', session);
            console.log('[Turnkey] Session details:', JSON.stringify(session, null, 2));

            // Wait a bit for the SDK to populate wallets state
            await new Promise(resolve => setTimeout(resolve, 500));

            // Get current wallets from the page component
            const wallets = walletsGetterRef.current ? walletsGetterRef.current() : [];
            console.log('[Turnkey] Current wallets from state after delay:', wallets);

            // Only try to create wallet if user doesn't already have one
            if (createWalletRef.current && (!wallets || wallets.length === 0)) {
              console.log('[Turnkey] No existing wallets found. Creating new wallet...');

              // Generate unique wallet name with timestamp
              const timestamp = Date.now();
              const walletName = `XION Wallet ${timestamp}`;

              try {
                const walletId = await createWalletRef.current({
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
                console.log('[Turnkey] Wallet created successfully:', walletId);
              } catch (error) {
                console.error('[Turnkey] Error creating wallet:', error);
                console.error('[Turnkey] Full error object:', JSON.stringify(error, null, 2));
                // Try with just Ethereum if multi-format fails
                console.log('[Turnkey] Retrying with only Ethereum account...');
                try {
                  const walletId = await createWalletRef.current({
                    walletName: `${walletName} (ETH only)`,
                    accounts: [
                      {
                        curve: 'CURVE_SECP256K1',
                        pathFormat: 'PATH_FORMAT_BIP32',
                        path: "m/44'/60'/0'/0/0",
                        addressFormat: 'ADDRESS_FORMAT_ETHEREUM',
                      },
                    ],
                  });
                  console.log('[Turnkey] Wallet created successfully (Ethereum only):', walletId);
                } catch (retryError) {
                  console.error('[Turnkey] Retry also failed:', retryError);
                }
              }
            } else if (wallets && wallets.length > 0) {
              console.log('[Turnkey] User already has', wallets.length, 'wallet(s). Skipping wallet creation.');
            }

            // Give more time for wallet to be fully initialized and public keys to be indexed
            // This is critical - Turnkey needs time to register the public keys before signing
            console.log('[Turnkey] Waiting for wallet to be fully ready...');
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Get the updated wallets to log public key info
            const updatedWallets = walletsGetterRef.current ? walletsGetterRef.current() : [];
            console.log('[Turnkey] Updated wallets after delay:', updatedWallets);
            if (updatedWallets.length > 0) {
              const wallet = updatedWallets[0];
              console.log('[Turnkey] Wallet ID:', wallet.walletId);
              console.log('[Turnkey] Wallet accounts:', wallet.accounts);
              wallet.accounts?.forEach((acc, idx) => {
                console.log(`[Turnkey] Account ${idx}:`, {
                  address: acc.address,
                  addressFormat: acc.addressFormat,
                  publicKey: acc.publicKey,
                  path: acc.path,
                  curve: acc.curve
                });
              });
            }

            // Call Abstraxion login directly if handler is registered
            if (abstraxionLoginRef.current) {
              console.log('[Turnkey] Calling Abstraxion login...');
              try {
                await abstraxionLoginRef.current();
              } catch (error) {
                console.error('[Turnkey] Error calling Abstraxion login:', error);
              }
            }
          },
          onSessionExpired: () => {
            console.log('[Turnkey] Session EXPIRED, please log in again');
          },
        }}
      >
        {children}
      </TurnkeyProvider>
    </TurnkeyAuthContext.Provider>
  );
}