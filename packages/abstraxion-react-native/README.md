# @burnt-labs/abstraxion-react-native

A React Native implementation of the Abstraxion authentication system for XION blockchain. This package mirrors the supported hook API from `@burnt-labs/abstraxion-react` where React Native has an equivalent transport.

## Features

- Authentication with the XION blockchain network
- Storage strategy using AsyncStorage instead of localStorage
- Redirect handling using Expo WebBrowser instead of browser navigation
- React Native optimized hooks aligned with `@burnt-labs/abstraxion-react`
- Explicit unsupported status for web-only popup, embedded iframe, and manage-authenticator transports

## Installation

```sh
npm install @burnt-labs/abstraxion-react-native @react-native-async-storage/async-storage expo-web-browser expo-linking
```

or

```sh
yarn add @burnt-labs/abstraxion-react-native @react-native-async-storage/async-storage expo-web-browser expo-linking
```

## Usage

### Setting up the AbstraxionProvider

You can set up the AbstraxionProvider using a configuration object:

```tsx
import React from "react";
import { AbstraxionProvider } from "@burnt-labs/abstraxion-react-native";

const config = {
  // Network configuration
  rpcUrl: "https://rpc.xion-testnet-2.burnt.com:443",
  restUrl: "https://api.xion-testnet-2.burnt.com:443",
  gasPrice: "0.001uxion",

  // Optional configurations
  treasury: "xion13jetl8j9kcgsva86l08kpmy8nsnzysyxs06j4s69c6f7ywu7q36q4k5smc",
  callbackUrl: "your-app-scheme://",
};

const App = () => {
  return (
    <AbstraxionProvider config={config}>
      {/* Your app components */}
    </AbstraxionProvider>
  );
};

export default App;
```

## Configuration Options

The `config` object accepts the following properties:

```typescript
interface AbstraxionConfig {
  // Required network configuration
  rpcUrl?: string; // RPC endpoint (defaults to testnet)
  restUrl?: string; // REST API endpoint (defaults to testnet)
  gasPrice?: string; // Gas price (e.g. "0.025uxion")

  // Optional configurations
  treasury?: string; // Treasury contract address
  callbackUrl?: string; // Callback URL after authorization
  authentication?: AuthenticationConfig; // "auto" resolves to redirect in RN; popup/embedded are web-only
}

// Contract authorization can be either a string or an object
type ContractGrantDescription =
  | string
  | {
      address: string;
      amounts: SpendLimit[];
    };

// Token spending limit
interface SpendLimit {
  denom: string; // Token denomination
  amount: string; // Maximum amount
}
```

## Available Hooks

This package provides the same public hook names as `@burnt-labs/abstraxion-react`:

- `useAbstraxionAccount`: Returns information about the connected account
- `useAbstraxionClient`: Provides a CosmWasmClient for read-only blockchain operations
- `useAbstraxionSigningClient`: Provides a signing client for blockchain transactions
- `useManageAuthenticators`: Exposes unsupported status for the currently web-only dashboard add-authenticator flow
- `useAbstraxionContext`: Provides access to the complete Abstraxion context

## Authentication Modes

React Native supports redirect auth as the primary dashboard flow. `{ type: "auto" }` resolves to redirect in React Native, because popup windows and embedded iframes require browser APIs that are not available in native runtimes.

Signer mode is supported when you provide a React Native compatible signer configuration. In signer mode, `useAbstraxionSigningClient({ requireAuth: true })` can create a direct `AAClient`.

Popup and embedded iframe modes are web-only in this release. Redirect mode supports login, logout, session restoration, and session-key signing. Dashboard-mediated direct signing and manage-authenticator callback flows still depend on browser `window`/`sessionStorage` handling, so React Native exposes them as unsupported instead of attempting a partial flow.

## Hook Interfaces

The hooks in this package maintain a similar interface to `@burnt-labs/abstraxion-react`, with React Native transport limitations called out explicitly.

```typescript
// useAbstraxionAccount
const {
  data,
  isConnected,
  isConnecting,
  isInitializing,
  isDisconnected,
  isLoading,
  isReturningFromAuth,
  isLoggingIn,
  isError,
  error,
  login,
  logout,
} = useAbstraxionAccount();
// data.bech32Address: string - The connected wallet address
// isConnected: boolean - Whether a wallet is connected
// isConnecting: boolean - Whether a connection is in progress
// isDisconnected: boolean - Whether the user explicitly logged out
// isLoading: boolean - Whether the account is initializing or connecting
// login: () => Promise<void> - Function to initiate wallet connection
// logout: () => Promise<void> - Function to disconnect the wallet

// useAbstraxionClient
const { client, error } = useAbstraxionClient();
// client: CosmWasmClient | undefined - A client for read-only operations
// error: Error | undefined - RPC connection error, when one occurs

// useAbstraxionSigningClient
const { client, signArb, rpcUrl, error, signResult, clearSignResult } =
  useAbstraxionSigningClient();
// client: SigningClient | undefined - Session-key signing client by default
// signArb: ((signerAddress: string, message: string | Uint8Array) => Promise<string>) | undefined
// rpcUrl: string - Active RPC URL
// error: string | undefined - Direct-signing availability error
// signResult: null - Reserved for React hook parity; redirect direct signing is web-only in RN
// clearSignResult: undefined - Reserved for React hook parity

const direct = useAbstraxionSigningClient({ requireAuth: true });
// In signer mode, direct.client can be an AAClient.
// In redirect mode, direct.error explains that session-key signing is the supported RN path.

// useManageAuthenticators
const {
  manageAuthenticators,
  isSupported,
  unsupportedReason,
  manageAuthResult,
  clearManageAuthResult,
} = useManageAuthenticators();
// isSupported: false - Dashboard manage-authenticator transport is web-only in RN
// unsupportedReason: string - Explanation suitable for app UI or logs

// useAbstraxionContext
const context = useAbstraxionContext();
// Full context with all state and methods
```

## Context Provider Props

The `AbstraxionProvider` accepts the following props:

```typescript
interface AbstraxionProviderProps {
  children: ReactNode;
  config: {
    // Network configuration
    rpcUrl?: string; // RPC endpoint (defaults to testnet)
    restUrl?: string; // REST API endpoint (defaults to testnet)
    gasPrice?: string; // Gas price (e.g. "0.025uxion")

    // Optional configurations
    treasury?: string; // Treasury contract address
    callbackUrl?: string; // Callback URL after authorization
    authentication?: AuthenticationConfig; // "auto" resolves to redirect in RN; popup/embedded are web-only
  };
}

// Contract authorization can be either a string or an object
type ContractGrantDescription =
  | string
  | {
      address: string;
      amounts: SpendLimit[];
    };

// Token spending limit
interface SpendLimit {
  denom: string; // Token denomination
  amount: string; // Maximum amount
}
```

## Deep Linking Configuration

For authentication to work properly, your app should be configured to handle deep links according to Expo/React Native guidelines:

1. For Expo, update your `app.json`:

```json
{
  "expo": {
    "scheme": "your-app-scheme",
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "category": ["DEFAULT", "BROWSABLE"],
          "data": {
            "scheme": "your-app-scheme"
          }
        }
      ]
    }
  }
}
```

2. For bare React Native, follow the platform-specific deep linking setup instructions.

The authentication flow uses Expo's WebBrowser with authentication sessions, which will automatically handle the redirect flow when the user completes authentication.

## License

MIT
