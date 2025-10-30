'use client';

import React, { createContext, useContext, useRef } from 'react';
import { TurnkeyProvider, TurnkeyProviderConfig } from '@turnkey/react-wallet-kit';
import '@turnkey/react-wallet-kit/styles.css';

// Context to provide a way to register handlers
interface TurnkeyAuthContextType {
  registerAbstraxionLogin: (handler: () => Promise<void>) => void;
  registerAbstraxionLogout: (handler: () => void) => void;
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
  const abstraxionLogoutRef = useRef<(() => void) | null>(null);
  const createWalletRef = useRef<((params: any) => Promise<string>) | null>(null);
  const walletsGetterRef = useRef<(() => any[]) | null>(null);

  const registerAbstraxionLogin = (handler: () => Promise<void>) => {
    abstraxionLoginRef.current = handler;
  };

  const registerAbstraxionLogout = (handler: () => void) => {
    abstraxionLogoutRef.current = handler;
  };

  const registerCreateWallet = (handler: (params: any) => Promise<string>) => {
    createWalletRef.current = handler;
  };

  const registerWalletsGetter = (getter: () => any[]) => {
    walletsGetterRef.current = getter;
  };

  // Generate dynamic username based on timestamp just to be able to make infinite wallets during testing
  const generateUserName = () => {
    const now = new Date();
    const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
    return `Demo User ${date} ${time}`;
  };

  const turnkeyConfig: TurnkeyProviderConfig = {
    organizationId: process.env.NEXT_PUBLIC_TURNKEY_ORG_ID!,
    authProxyConfigId: '5119dae0-9dd2-4b94-a7df-131c945f3afc',

    // Enable authentication methods
    auth: {
      // Create wallets for Cosmos chains (Xion, Noble) and EVM chains (Base)
      createSuborgParams: {
        emailOtpAuth: {
          userName: generateUserName(),
          customWallet: {
            walletName: 'Demo-app Wallet Abstraxion',
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
          userName: generateUserName(),
          customWallet: {
            walletName: 'Demo-app Wallet Abstraxion',
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
      },
      autoRefreshSession: true,
    },
  };

  return (
    <TurnkeyAuthContext.Provider value={{ registerAbstraxionLogin, registerAbstraxionLogout, registerCreateWallet, registerWalletsGetter }}>
      <TurnkeyProvider
        config={turnkeyConfig}
        callbacks={{
          onError: (error) => {
            console.error('[Turnkey] Error:', error);
          },
          onAuthenticationSuccess: async () => {
            // Ensure wallet is populated before calling Abstraxion login
            let wallets: any[] = [];
            const maxAttempts = 10; // 1 second max
            let attempts = 0;

            while (attempts < maxAttempts) {
              wallets = walletsGetterRef.current ? walletsGetterRef.current() : [];
              if (wallets.length > 0) {
                break;
              }
              await new Promise(resolve => setTimeout(resolve, 100));
              attempts++;
            }

            if (wallets.length === 0) {
              console.warn('[Turnkey] No wallets found after waiting');
              return;
            }

            // Call Abstraxion login directly On succes
            if (abstraxionLoginRef.current) {
              try {
                await abstraxionLoginRef.current();
              } catch (error) {
                console.error('[Turnkey] Error calling Abstraxion login:', error);
              }
            }
          },
          onSessionExpired: () => {
            // Logout from Abstraxion when Turnkey session expires
            if (abstraxionLogoutRef.current) {
              abstraxionLogoutRef.current();
            }
          },
        }}
      >
        {children}
      </TurnkeyProvider>
    </TurnkeyAuthContext.Provider>
  );
}