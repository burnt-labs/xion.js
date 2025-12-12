# xion.js Architecture: Controllers, Orchestrators, and Connectors

This document explains how the three key architectural components work together in the xion.js SDK to provide a unified authentication and account management system.

## Overview

The xion.js SDK uses a **three-layer architecture** to separate concerns and provide flexibility:

```
┌─────────────────────────────────────────────────────────────┐
│                     React Application                        │
│                  (AbstraxionProvider)                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              CONTROLLER LAYER                                │
│         (@burnt-labs/abstraxion)                             │
│                                                              │
│  ┌─────────────────┐         ┌─────────────────┐           │
│  │ RedirectController│        │ SignerController│           │
│  │   (Dashboard)   │        │   (Headless)    │           │
│  └────────┬────────┘         └────────┬────────┘           │
│           │                           │                     │
└───────────┼───────────────────────────┼─────────────────────┘
            │                           │
            ▼                           ▼
┌──────────────────────────────────────────────────────────────┐
│           ORCHESTRATOR LAYER                                 │
│      (@burnt-labs/account-management)                        │
│                                                              │
│         ┌────────────────────────────────┐                  │
│         │   ConnectionOrchestrator       │                  │
│         │                                │                  │
│         │  • Session restoration         │                  │
│         │  • Account discovery/creation  │                  │
│         │  • Grant management            │                  │
│         └────────────┬───────────────────┘                  │
│                      │                                       │
└──────────────────────┼───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│             CONNECTOR LAYER                                  │
│         (@burnt-labs/abstraxion-core)                        │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   Keplr     │  │   MetaMask   │  │  Turnkey/Privy   │   │
│  │  Connector  │  │   Connector  │  │    Connector     │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Layer 1: Connectors (abstraxion-core)

**Purpose**: Abstract wallet/signer connection details into a unified interface

**Location**: `packages/abstraxion-core/src/connectors/`

### What Connectors Do

Connectors handle the low-level wallet/signer integration:

- **Connection**: Establish connection to wallet/signer
- **Signing**: Provide a standardized signing interface
- **Availability**: Check if the wallet/signer is available
- **Metadata**: Provide display information (name, icon, type)

### Connector Types

```typescript
enum ConnectorType {
  COSMOS_WALLET = "cosmos-wallet", // Keplr, Leap, OKX
  ETHEREUM_WALLET = "ethereum-wallet", // MetaMask
  EXTERNAL_SIGNER = "external-signer", // Turnkey, Privy, Web3Auth
}
```

### Example: External Signer Connector

```typescript
const turnkeyConnector = new ExternalSignerConnector({
  metadata: {
    id: "turnkey",
    name: "Turnkey",
    type: ConnectorType.EXTERNAL_SIGNER,
  },
  signerConfig: {
    authenticatorType: "EthWallet",
    authenticator: "0x123...", // Ethereum address
    signMessage: async (hexMessage) => {
      // Sign with Turnkey
      return signature;
    },
  },
});
```

### Why Connectors?

**Separation of concerns**: Wallet integration logic is isolated from business logic. This allows:

- Adding new wallets without changing core logic
- Testing without real wallets
- Consistent interface across different signer types (Cosmos, Ethereum, external)

## Layer 2: Orchestrator (account-management)

**Purpose**: Coordinate the complex multi-step connection flow

**Location**: `packages/account-management/src/orchestrator/`

### What the Orchestrator Does

The `ConnectionOrchestrator` handles the business logic of connecting:

1. **Session Restoration**: Check if a valid session exists (keypair + granter + valid grants)
2. **Account Discovery**: Find existing smart account for an authenticator
3. **Account Creation**: Create new smart account if none exists
4. **Grant Creation**: Create authorization grants (bank, stake, contracts)
5. **Grant Verification**: Verify grants exist on-chain

### Flow Modules

The orchestrator delegates to specialized flow modules:

- `accountConnection.ts`: Connector connection & account discovery/creation
- `grantCreation.ts`: Authorization grant creation
- `sessionRestoration.ts`: Session validation and restoration
- `redirectFlow.ts`: OAuth redirect flow handling

### Example: Complete Connection Flow

```typescript
const orchestrator = new ConnectionOrchestrator({
  sessionManager, // Manages keypair and granter storage
  storageStrategy, // localStorage or AsyncStorage
  accountStrategy, // How to discover/create accounts
  grantConfig, // What grants to create
  chainId: "xion-testnet-1",
  rpcUrl: "https://rpc.xion-testnet-1.burnt.com",
  gasPrice: "0.001uxion",
});

// Try to restore existing session
const restored = await orchestrator.restoreSession();

// If no session, connect with a connector
if (!restored.success) {
  const result = await orchestrator.connectAndSetup(connector);
  // result.smartAccountAddress is the granter address
  // result.signingClient is ready to use
}
```

### Why an Orchestrator?

**Complex coordination**: The connection flow has many steps with conditional logic:

- Session might already exist (skip connection)
- Grants might exist (skip grant creation)
- Account might not exist (trigger creation)
- Different flows for redirect vs signer modes

The orchestrator encapsulates this complexity so controllers stay simple.

## Layer 3: Controllers (abstraxion)

**Purpose**: Provide React-specific state management and lifecycle handling

**Location**: `packages/abstraxion/src/controllers/`

### What Controllers Do

Controllers bridge the React world with the business logic:

- **State Management**: Track connection state (idle, connecting, connected, error)
- **Subscriptions**: Notify React components of state changes
- **Lifecycle**: Handle initialization, cleanup, and reconnection
- **Mode-Specific Logic**: Implement redirect vs signer mode differences

### Controller Types

#### RedirectController

Used for **dashboard-based authentication** (OAuth flow):

```typescript
class RedirectController extends BaseController {
  // Redirects to dashboard for authentication
  async login(): Promise<void> {
    // Save state, redirect to dashboard
  }

  // Called after redirect back from dashboard
  async handleCallback(): Promise<void> {
    // Restore state, verify grants
  }
}
```

**Use case**: Web apps that want a hosted authentication UI

#### SignerController

Used for **headless authentication** with custom connectors:

```typescript
class SignerController extends BaseController {
  // Programmatic connection with connector
  async connect(connector: Connector): Promise<void> {
    // Use orchestrator to handle connection
    const result = await this.orchestrator.connectAndSetup(connector);
    // Update state with result
  }

  // Check for existing session on mount
  async initialize(): Promise<void> {
    const restored = await this.orchestrator.restoreSession();
    // Update state based on restoration result
  }
}
```

**Use case**: Apps that want full control over authentication UI (Turnkey, Privy, custom wallets)

### Why Controllers?

**React integration**: Controllers handle React-specific concerns:

- **State updates**: Trigger re-renders when connection state changes
- **Suspense/SSR**: Handle server-side rendering and hydration
- **Cleanup**: Clean up resources when component unmounts
- **Error boundaries**: Handle errors and surface them to UI

Without controllers, every React app would need to reimplement this logic.

## How They Work Together

### Example: Connecting with Turnkey (Signer Mode)

```typescript
// 1. Application creates controller (via AbstraxionProvider)
const controller = SignerController.fromConfig(config, storage, auth);

// 2. Controller initializes and checks for existing session
await controller.initialize();
  // → Controller creates ConnectionOrchestrator
  // → Orchestrator checks sessionManager for stored keypair/granter
  // → If found, verifies grants on-chain

// 3. User clicks "Connect with Turnkey"
const connector = new ExternalSignerConnector({...});

// 4. Controller handles connection
await controller.connect(connector);
  // → Controller calls orchestrator.connectAndSetup(connector)
  // → Orchestrator calls connector.connect()
  // → Connector returns authenticator and signMessage function
  // → Orchestrator uses accountStrategy to find/create smart account
  // → Orchestrator uses grantConfig to create authorization grants
  // → Orchestrator stores keypair and granter in sessionManager
  // → Controller updates state to "connected"

// 5. React components receive state update and re-render
// 6. User can now sign transactions with session key
```

### Example: Redirect Mode (Dashboard)

```typescript
// 1. Application creates controller (via AbstraxionProvider)
const controller = RedirectController.fromConfig(config, storage, redirect);

// 2. Controller checks if returning from redirect
if (isReturningFromRedirect()) {
  // → Controller calls redirect strategy to complete flow
  // → Verifies grants exist in storage
  // → Updates state to "connected"
} else {
  // Check for existing session
  await controller.initialize();
}

// 3. User clicks "Login"
await controller.login();
// → Controller saves state to localStorage
// → Controller redirects to dashboard URL with config
// → Dashboard authenticates user and creates grants
// → Dashboard redirects back to app with success param

// 4. App loads again, controller detects redirect
// → Restores state from localStorage
// → Verifies grants exist
// → Updates state to "connected"
```

## Key Design Principles

### 1. Separation of Concerns

Each layer has a single responsibility:

- **Connectors**: Wallet/signer integration
- **Orchestrator**: Business logic and flow coordination
- **Controllers**: React state management

This makes the codebase easier to understand, test, and modify.

### 2. Dependency Direction

Dependencies flow downward:

- Controllers depend on orchestrator and connectors
- Orchestrator depends on connectors
- Connectors have no dependencies on other layers

This prevents circular dependencies and makes the code more maintainable.

### 3. Platform Agnostic (where possible)

- **Connectors**: Platform-agnostic (work in Node.js, browser, React Native)
- **Orchestrator**: Platform-agnostic (uses storage strategy abstraction)
- **Controllers**: Platform-specific (React hooks, React Native exports)

This allows reuse across different platforms.

### 4. Testability

Each layer can be tested independently:

- **Connector tests**: Mock wallet APIs
- **Orchestrator tests**: Mock connectors and storage
- **Controller tests**: Mock orchestrator

### 5. Extensibility

New functionality can be added without modifying existing code:

- **New connector**: Implement `Connector` interface
- **New account strategy**: Implement `AccountStrategy` interface
- **New controller mode**: Extend `BaseController`

## File Organization

```
xion.js/
├── packages/
│   ├── abstraxion-core/          # Layer 1: Connectors
│   │   ├── src/connectors/
│   │   │   ├── types.ts          # Connector interface
│   │   │   ├── ConnectorRegistry.ts
│   │   │   └── ExternalSignerConnector.ts
│   │   └── src/AbstraxionAuth.ts # Session manager implementation
│   │
│   ├── account-management/       # Layer 2: Orchestrator
│   │   ├── src/orchestrator/
│   │   │   ├── orchestrator.ts   # Main orchestrator
│   │   │   └── flow/             # Flow modules
│   │   │       ├── accountConnection.ts
│   │   │       ├── grantCreation.ts
│   │   │       ├── sessionRestoration.ts
│   │   │       └── redirectFlow.ts
│   │   └── src/accounts/         # Account strategies
│   │
│   └── abstraxion/               # Layer 3: Controllers
│       ├── src/controllers/
│       │   ├── types.ts          # Controller interface
│       │   ├── BaseController.ts # State management base
│       │   ├── RedirectController.ts
│       │   ├── SignerController.ts
│       │   ├── factory.ts        # Controller factory
│       │   └── typeGuards.ts     # Type guards
│       └── src/components/
│           └── AbstraxionContext/
│               └── index.tsx     # React provider
```

## When to Use Each Mode

### Redirect Mode (RedirectController)

**Best for**:

- Consumer-facing applications
- Apps that want minimal integration work
- Apps that trust the dashboard for authentication

**Pros**:

- Hosted authentication UI
- No wallet integration needed
- Supports Web3Auth, Passkeys, email login

**Cons**:

- Requires redirect (disrupts UX)
- Less control over UI/flow
- Requires dashboard deployment

### Signer Mode (SignerController)

**Best for**:

- Apps with existing authentication
- Apps that want custom UI/UX
- Apps using Turnkey, Privy, or custom signers
- Mobile apps (React Native)

**Pros**:

- Full control over UI/flow
- No redirect required
- Headless integration
- Works in React Native

**Cons**:

- More integration work
- Need to implement connector for each signer
- Handle wallet connection UI yourself

## Summary

The three-layer architecture provides:

1. **Connectors**: Standardize wallet/signer integration
2. **Orchestrator**: Coordinate complex connection flows
3. **Controllers**: Manage React state and lifecycle

This separation makes the codebase:

- **Maintainable**: Each layer has clear responsibilities
- **Testable**: Layers can be tested independently
- **Extensible**: New functionality can be added without breaking changes
- **Reusable**: Lower layers work across platforms

The key insight is that **authentication is complex**, and this architecture breaks that complexity into manageable, well-defined layers.
