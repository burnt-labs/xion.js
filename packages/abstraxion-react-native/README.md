# @burnt-labs/abstraxion-react-native

A React Native implementation of the Abstraxion authentication system for XION blockchain. This package provides the same functionality as @burnt-labs/abstraxion but is designed to work with React Native and Expo applications.

## Features

- Authentication with the XION blockchain network
- Storage strategy using AsyncStorage instead of localStorage
- Redirect handling using Expo WebBrowser instead of browser navigation
- React Native optimized hooks with the exact same interfaces as @burnt-labs/abstraxion
- Auto logout on grant changes for enhanced security

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
  autoLogoutOnGrantChange?: boolean; // Auto logout when grants change (defaults to true)
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

## Security Features

### Auto Logout on Grant Changes

Abstraxion React Native includes an optional security feature that automatically logs out users when treasury contract grant configurations change between app sessions. This prevents users from operating with outdated or incorrect permissions.

#### Configuration

Auto logout is enabled by default. To disable it for custom handling, set `autoLogoutOnGrantChange: false`:

```tsx
const config = {
  treasury: "xion13jetl8j9kcgsva86l08kpmy8nsnzysyxs06j4s69c6f7ywu7q36q4k5smc",
  autoLogoutOnGrantChange: false, // Disable auto logout for custom handling
  gasPrice: "0.001uxion",
};
```

#### Detecting Grant Changes

Access the `grantsChanged` property from the `useAbstraxionAccount` hook to implement custom handling:

```tsx
import { useAbstraxionAccount } from "@burnt-labs/abstraxion-react-native";
import { useEffect } from "react";
import { Alert } from "react-native";

const MyComponent = () => {
  const {
    data: account,
    grantsChanged,
    isConnected,
    login,
  } = useAbstraxionAccount();

  useEffect(() => {
    if (grantsChanged && !isConnected) {
      // Handle grant changes with custom UX
      Alert.alert(
        "Permissions Updated",
        "The app's permissions have been updated. Please reconnect to continue.",
        [{ text: "Reconnect", onPress: () => login() }],
      );
    }
  }, [grantsChanged, isConnected, login]);

  return (
    <View>
      {grantsChanged && !isConnected && (
        <Text style={{ color: "orange" }}>
          Permissions have changed. Please reconnect.
        </Text>
      )}
    </View>
  );
};
```

#### How It Works

- **Startup Validation**: When the app starts, Abstraxion compares current on-chain grants with the expected treasury configuration
- **Automatic Logout**: If `autoLogoutOnGrantChange` is enabled (default) and changes are detected, users are automatically logged out
- **Developer Control**: The `grantsChanged` property allows developers to implement custom notifications and handling
- **Session Safety**: The feature only triggers during app startup, not during active login processes

## Available Hooks

This package provides the exact same hooks as @burnt-labs/abstraxion:

- `useAbstraxionAccount`: Returns information about the connected account
- `useAbstraxionClient`: Provides a CosmWasmClient for read-only blockchain operations
- `useAbstraxionSigningClient`: Provides a signing client for blockchain transactions
- `useAbstraxionContext`: Provides access to the complete Abstraxion context

## Hook Interfaces

The hooks in this package maintain a similar interface to @burnt-labs/abstraxion, with changes to include login and logout functions returned from the useAbstraxionAccount hook

```typescript
// useAbstraxionAccount
const { data, isConnected, isConnecting, grantsChanged, login, logout } =
  useAbstraxionAccount();
// data.bech32Address: string - The connected wallet address
// isConnected: boolean - Whether a wallet is connected
// isConnecting: boolean - Whether a connection is in progress
// grantsChanged: boolean - Whether grant configuration has changed since last session
// login: () => Promise<void> - Function to initiate wallet connection
// logout: () => void - Function to disconnect the wallet

// useAbstraxionClient
const { client } = useAbstraxionClient();
// client: CosmWasmClient | undefined - A client for read-only operations

// useAbstraxionSigningClient
const { client, signArb } = useAbstraxionSigningClient();
// client: GranteeSignerClient | undefined - A client for signing transactions
// signArb: ((signerAddress: string, message: string | Uint8Array) => Promise<string>) | undefined

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

## Best Practices

### Grant Change Handling

When using the auto logout feature, consider these best practices:

1. **User Communication**: Always inform users why they were logged out
2. **Graceful Reconnection**: Provide easy reconnection options
3. **State Preservation**: Save user progress before logout when possible
4. **Custom Notifications**: Use platform-appropriate alerts (Alert.alert for React Native)

Example implementation:

```tsx
import { useAbstraxionAccount } from "@burnt-labs/abstraxion-react-native";
import { useEffect } from "react";
import { Alert } from "react-native";

const useGrantChangeHandler = () => {
  const { grantsChanged, isConnected, login } = useAbstraxionAccount();

  useEffect(() => {
    if (grantsChanged && !isConnected) {
      Alert.alert(
        "Security Update",
        "Your app permissions have been updated for security. Please sign in again to continue.",
        [
          { text: "Later", style: "cancel" },
          { text: "Sign In", onPress: login }
        ]
      );
    }
  }, [grantsChanged, isConnected, login]);
};

// Usage in your component
const MyApp = () => {
  useGrantChangeHandler();

  return (
    // Your app content
  );
};
```

## License

MIT
