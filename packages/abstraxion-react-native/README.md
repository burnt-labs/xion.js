# @burnt-labs/abstraxion-react-native

A React Native implementation of the Abstraxion authentication system for XION blockchain. This package provides the same functionality as @burnt-labs/abstraxion but is designed to work with React Native and Expo applications.

## Features

- Authentication with the XION blockchain network
- Storage strategy using AsyncStorage instead of localStorage
- Redirect handling using Expo WebBrowser instead of browser navigation
- React Native optimized hooks with the exact same interfaces as @burnt-labs/abstraxion

## Installation

```sh
npm install @burnt-labs/abstraxion-react-native @react-native-async-storage/async-storage expo-web-browser expo-linking
```

or

```sh
yarn add @burnt-labs/abstraxion-react-native @react-native-async-storage/async-storage expo-web-browser expo-linking
```

## Usage

### Setting up the AbstraxionContextProvider

You can set up the AbstraxionContextProvider in two ways:

#### Option 1: Using chainInfo object (Recommended for React Native apps)

```tsx
import React from 'react';
import { AbstraxionContextProvider } from '@burnt-labs/abstraxion-react-native';

// Define chain info
const xiontestnetChainInfo = {
  chainId: "xion-testnet-2",
  chainName: "XION Testnet 2",
  rpcUrl: "https://testnet-rpc.xion.dance",
  restUrl: "https://testnet-api.xion.dance",
  addressPrefix: "xion",
  gasPrice: "0.025uxion",
  feeToken: "uxion",
  stakingToken: "uxion",
  contracts: {
    bank: "xion...", // Contract address if using
    stake: "xion...", // Contract address if using
    treasury: "xion..." // Contract address if using
  }
};

const App = () => {
  // Optional callbacks
  const handleConnect = (account) => {
    console.log('Connected to: ', account.address);
  };

  const handleDisconnect = () => {
    console.log('Disconnected');
  };

  return (
    <AbstraxionContextProvider 
      chainInfo={xiontestnetChainInfo}
      dashboardUrl="https://dashboard.burnt.com/"
      onConnect={handleConnect}
      onDisconnect={handleDisconnect}
    >
      {/* Your app components */}
    </AbstraxionContextProvider>
  );
};

export default App;
```

#### Option 2: Using individual parameters (Compatible with web abstraxion)

```tsx
import React from 'react';
import { AbstraxionContextProvider } from '@burnt-labs/abstraxion-react-native';

// Define contract grants
const contractGrants = [
  {
    contractAddress: "xion...",
    grantDescription: "Allow this contract to perform actions on your behalf"
  }
];

// Define bank spend limits
const bankSpendLimits = [
  {
    denom: "uxion",
    amount: "1000000"
  }
];

const App = () => {
  return (
    <AbstraxionContextProvider 
      // Network configuration
      rpcUrl="https://testnet-rpc.xion.dance"
      restUrl="https://testnet-api.xion.dance" 
      gasPrice="0.025uxion"
      dashboardUrl="https://dashboard.burnt.com/"
      
      // Contract grants
      contracts={contractGrants}
      bank={bankSpendLimits}
      stake={true}
      treasury="xion..."
      
      // Optional callback URL
      callbackUrl="https://your-app-callback.com"
    >
      {/* Your app components */}
    </AbstraxionContextProvider>
  );
};

export default App;
```

### Using the hooks

```tsx
import React from 'react';
import { View, Text, Button } from 'react-native';
import { useAbstraxionAccount, useAbstraxionSigningClient } from '@burnt-labs/abstraxion-react-native';

const ProfileScreen = () => {
  const { data, isConnected } = useAbstraxionAccount();
  const { client, signArb, logout } = useAbstraxionSigningClient();

  const handleTransaction = async () => {
    if (client && isConnected) {
      try {
        // Example transaction
        const result = await client.sendTokens(
          data.bech32Address,
          'recipient-address',
          [{ denom: 'uxion', amount: '1000' }],
          'auto'
        );
        console.log('Transaction result:', result);
      } catch (error) {
        console.error('Transaction failed:', error);
      }
    }
  };

  const handleSignature = async () => {
    if (signArb && isConnected) {
      try {
        const signature = await signArb(data.bech32Address, 'Message to sign');
        console.log('Signature:', signature);
      } catch (error) {
        console.error('Signing failed:', error);
      }
    }
  };

  return (
    <View>
      {isConnected ? (
        <>
          <Text>Connected Address: {data.bech32Address}</Text>
          <Button title="Send Transaction" onPress={handleTransaction} />
          <Button title="Sign Message" onPress={handleSignature} />
          <Button title="Logout" onPress={logout} />
        </>
      ) : (
        <Text>Not connected</Text>
      )}
    </View>
  );
};

export default ProfileScreen;
```

## Available Hooks

This package provides the exact same hooks as @burnt-labs/abstraxion:

- `useAbstraxionAccount`: Returns information about the connected account
- `useAbstraxionClient`: Provides a CosmWasmClient for read-only blockchain operations
- `useAbstraxionSigningClient`: Provides a signing client for blockchain transactions
- `useAbstraxionContext`: Provides access to the complete Abstraxion context

## Hook Interfaces

The hooks in this package maintain the exact same interface as in @burnt-labs/abstraxion:

```typescript
// useAbstraxionAccount
const { data, isConnected, isConnecting } = useAbstraxionAccount();
// data.bech32Address: string - The connected wallet address
// isConnected: boolean - Whether a wallet is connected
// isConnecting: boolean - Whether a connection is in progress

// useAbstraxionClient
const { client } = useAbstraxionClient();
// client: CosmWasmClient | undefined - A client for read-only operations

// useAbstraxionSigningClient
const { client, signArb, logout } = useAbstraxionSigningClient();
// client: GranteeSignerClient | undefined - A client for signing transactions
// signArb: ((signerAddress: string, message: string | Uint8Array) => Promise<string>) | undefined
// logout: (() => Promise<void>) | undefined - Function to disconnect the wallet

// useAbstraxionContext
const context = useAbstraxionContext();
// Full context with all state and methods
```

## Configuration Options

### ChainInfo Interface

When using the `chainInfo` prop (recommended for React Native apps), you can provide a configuration object with the following structure:

```typescript
interface ChainInfo {
  readonly chainId: string;       // e.g. "xion-testnet-2"
  readonly chainName: string;     // e.g. "XION Testnet 2"
  readonly rpcUrl: string;        // e.g. "https://testnet-rpc.xion.dance"
  readonly restUrl: string;       // e.g. "https://testnet-api.xion.dance"
  readonly addressPrefix: string; // e.g. "xion"
  readonly gasPrice: string;      // e.g. "0.025uxion"
  readonly feeToken: string;      // e.g. "uxion"
  readonly stakingToken: string;  // e.g. "uxion"
  readonly contracts?: {
    bank?: string;                // Optional contract address
    stake?: string;               // Optional contract address
    treasury?: string;            // Optional contract address
  };
}
```

## Context Provider Props

The `AbstraxionContextProvider` accepts the following props, matching the original abstraxion package:

```typescript
interface AbstraxionProviderProps {
  children: ReactNode;
  
  // Network configuration 
  rpcUrl?: string;                 // RPC endpoint
  restUrl?: string;                // REST API endpoint
  gasPrice?: string;               // Gas price (e.g. "0.025uxion")
  dashboardUrl?: string;           // XION dashboard URL
  
  // Contract permissions
  contracts?: ContractGrantDescription[];  // Contract authorizations
  bank?: SpendLimit[];             // Token spending limits
  stake?: boolean;                 // Whether to allow staking
  treasury?: string;               // Treasury contract address
  callbackUrl?: string;            // Callback URL after authorization
  
  // React Native specific
  chainInfo?: ChainInfo;           // Combined chain configuration
  authStateCallback?: (state: AuthStateChanges) => void;  // Auth state change handler
  onConnect?: (account: { address: string }) => void;     // Connection callback
  onDisconnect?: () => void;       // Disconnection callback
}

// Contract authorization
interface ContractGrantDescription {
  contractAddress: string;         // Contract to authorize
  grantDescription?: string;       // Description of the authorization
}

// Token spending limit
interface SpendLimit {
  denom: string;                   // Token denomination
  amount: string;                  // Maximum amount
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