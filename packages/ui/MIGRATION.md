# Migration Guide: Abstraxion UI Components

## Overview

The `Abstraxion` component and UI-related functionality have been moved from `@burnt-labs/abstraxion` to `@burnt-labs/ui`. The `@abstraxion` package is now UI-less and focuses on core logic and state management.

## What's Available

- ✅ `useAbstraxionModal` hook in `@burnt-labs/ui` - **Recommended approach**
- ✅ `Abstraxion` component in `@burnt-labs/ui` - Simple wrapper (optional)
- ✅ `AbstraxionProvider` and hooks remain in `@burnt-labs/abstraxion`
- ✅ Automatic modal and loading overlay management
- ✅ Success state display
- ✅ Error handling
- ✅ Full-screen loading overlays for different connection states

## Recommended Usage Pattern

**Import both packages separately and use the hook approach:**

This pattern makes dependencies clear and gives you full control over the UI:

```tsx
"use client";
import { AbstraxionProvider, useAbstraxionAccount } from "@burnt-labs/abstraxion";
import { useAbstraxionModal } from "@burnt-labs/ui";
import "@burnt-labs/ui/dist/index.css";

function AppContent() {
  // Get account state from @abstraxion
  const accountState = useAbstraxionAccount();
  
  // Get UI components from @ui
  const { Modal, LoadingOverlay, openModal, closeModal } = useAbstraxionModal(
    accountState,
    {
      autoShowOnConnecting: true,
      showSuccessState: true,
      successDuration: 2000,
      onConnectSuccess: () => {
        console.log("Connected successfully!");
      },
    }
  );

  return (
    <div>
      {accountState.isConnected ? (
        <div>
          <p>Connected: {accountState.data.bech32Address}</p>
          <button onClick={accountState.logout}>Disconnect</button>
        </div>
      ) : (
        <button onClick={openModal}>Connect</button>
      )}
      <Modal />
      <LoadingOverlay />
    </div>
  );
}

export default function App() {
  return (
    <AbstraxionProvider config={{ chainId: "xion-testnet-1" }}>
      <AppContent />
    </AbstraxionProvider>
  );
}
```

**Why this approach?**
- ✅ Clear separation: `@abstraxion` = logic, `@ui` = UI
- ✅ No circular dependencies
- ✅ Full control over when/how to show modals
- ✅ Easy to customize or replace UI components
- ✅ Works with React Native (they use `@abstraxion-react-native` + their own UI)

**Note for React Native:** The `@burnt-labs/ui` package is web-only (uses DOM APIs, Radix UI, etc.). React Native developers should use `@burnt-labs/abstraxion-react-native` for the logic and build their own UI components, or use React Native-compatible UI libraries.

## Migration from Old Component

### Before

```tsx
import { AbstraxionProvider, Abstraxion } from "@burnt-labs/abstraxion";
import "@burnt-labs/abstraxion/dist/index.css";

function App() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <AbstraxionProvider config={{ chainId: "xion-testnet-1" }}>
      <Abstraxion onClose={() => setIsOpen(false)} isOpen={isOpen} />
      <button onClick={() => setIsOpen(true)}>Click here</button>
    </AbstraxionProvider>
  );
}
```

### After (Recommended - Hook Approach)

```tsx
import { AbstraxionProvider, useAbstraxionAccount } from "@burnt-labs/abstraxion";
import { useAbstraxionModal } from "@burnt-labs/ui";
import "@burnt-labs/ui/dist/index.css";

function AppContent() {
  const accountState = useAbstraxionAccount();
  const { Modal, LoadingOverlay, openModal } = useAbstraxionModal(accountState, {
    autoShowOnConnecting: true,
  });

  return (
    <>
      <button onClick={openModal}>Click here</button>
      <Modal />
      <LoadingOverlay />
    </>
  );
}

function App() {
  return (
    <AbstraxionProvider config={{ chainId: "xion-testnet-1" }}>
      <AppContent />
    </AbstraxionProvider>
  );
}
```

### After (Alternative - Component Wrapper)

If you prefer the simple component approach, you can still use the `Abstraxion` component wrapper:

```tsx
import { AbstraxionProvider } from "@burnt-labs/abstraxion";
import { Abstraxion } from "@burnt-labs/ui";
import "@burnt-labs/ui/dist/index.css";

function App() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <AbstraxionProvider config={{ chainId: "xion-testnet-1" }}>
      <Abstraxion onClose={() => setIsOpen(false)} isOpen={isOpen} />
      <button onClick={() => setIsOpen(true)}>Click here</button>
    </AbstraxionProvider>
  );
}
```

## Hook API

### Parameters

```typescript
useAbstraxionModal(
  accountState: AbstraxionAccountState,
  options?: UseAbstraxionModalOptions
)
```

#### `accountState` (required)
The return value from `useAbstraxionAccount()` hook.

#### `options` (optional)

```typescript
interface UseAbstraxionModalOptions {
  defaultOpen?: boolean;              // Default: false
  autoShowOnConnecting?: boolean;     // Default: true
  showSuccessState?: boolean;         // Default: true
  successDuration?: number;           // Default: 2000ms
  error?: string;                     // Custom error message
  onClose?: () => void;               // Callback when modal closes
  onConnectSuccess?: () => void;     // Callback when connection succeeds
}
```

### Return Value

```typescript
interface UseAbstraxionModalReturn {
  isOpen: boolean;                    // Current modal state
  openModal: () => void;              // Open the modal
  closeModal: () => void;             // Close the modal
  toggleModal: () => void;            // Toggle modal state
  Modal: React.ComponentType;         // Modal component to render
  LoadingOverlay: React.ComponentType; // Loading overlay component
}
```

## Features

### 1. Automatic Modal Management

The hook automatically shows the modal when connecting starts (if `autoShowOnConnecting` is true):

```tsx
const { Modal, LoadingOverlay } = useAbstraxionModal({
  accountState,
  autoShowOnConnecting: true, // Modal shows automatically when connecting
});
```

### 2. Loading States

The `LoadingOverlay` component shows different states:
- **Initializing**: Yellow theme, shows progress bar
- **Connecting**: Blue theme
- **Logging In**: Blue theme with animated dots
- **Returning from Auth**: Purple theme

### 3. Success State

After successful connection, shows a success message with checkmark:

```tsx
const { Modal } = useAbstraxionModal({
  accountState,
  showSuccessState: true,
  successDuration: 2000, // Show success for 2 seconds
});
```

### 4. Error Handling

Display custom error messages:

```tsx
const { Modal } = useAbstraxionModal({
  accountState,
  error: "Connection failed. Please try again.",
});
```

## Advanced Examples

### Custom Success Callback

```tsx
const { Modal, LoadingOverlay } = useAbstraxionModal({
  accountState,
  onConnectSuccess: () => {
    // Redirect or update UI after successful connection
    router.push("/dashboard");
  },
});
```

### Manual Modal Control

```tsx
const { Modal, openModal, closeModal, isOpen } = useAbstraxionModal({
  accountState,
  autoShowOnConnecting: false, // Manual control
});

// Control modal manually
<button onClick={openModal}>Open</button>
<button onClick={closeModal}>Close</button>
{isOpen && <Modal />}
```

### Without Success State

```tsx
const { Modal, LoadingOverlay } = useAbstraxionModal({
  accountState,
  showSuccessState: false, // Don't show success, just close modal
  onConnectSuccess: () => {
    // Handle success yourself
    console.log("Connected!");
  },
});
```

## Migration from Manual Implementation

### Before (Manual Loading States)

```tsx
function MyComponent() {
  const accountState = useAbstraxionAccount();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Connect</button>
      {isOpen && (
        <Dialog>
          {/* Manual modal content */}
        </Dialog>
      )}
      {(accountState.isInitializing || accountState.isConnecting) && (
        <div className="fixed inset-0 z-50">
          {/* Manual loading overlay */}
        </div>
      )}
    </>
  );
}
```

### After (Using Hook)

```tsx
function MyComponent() {
  const accountState = useAbstraxionAccount();
  const { Modal, LoadingOverlay, openModal } = useAbstraxionModal({
    accountState,
  });

  return (
    <>
      <button onClick={openModal}>Connect</button>
      <Modal />
      <LoadingOverlay />
    </>
  );
}
```

## Comparison with Loading States Demo

The `useAbstraxionModal` hook provides the same functionality as the loading-states demo page, but as a reusable hook:

- ✅ Automatic loading overlay management
- ✅ Different states for initializing, connecting, logging in, returning from auth
- ✅ Success state display
- ✅ Error handling
- ✅ Modal management

## Package Dependencies

```bash
npm install @burnt-labs/abstraxion @burnt-labs/ui
```

## TypeScript Support

Full TypeScript support is included. The hook exports all necessary types:

```typescript
import type {
  AbstraxionAccountState,
  UseAbstraxionModalOptions,
  UseAbstraxionModalReturn,
} from "@burnt-labs/ui";
```

## Troubleshooting

### Modal not showing
- Ensure `accountState` is passed correctly from `useAbstraxionAccount()`
- Check that `AbstraxionProvider` wraps your component tree
- Verify `autoShowOnConnecting` is true or call `openModal()` manually

### Loading overlay not showing
- Make sure `<LoadingOverlay />` is rendered in your component
- Check that loading states are being triggered (isInitializing, isConnecting, etc.)

### Success state not showing
- Ensure `showSuccessState` is true (default)
- Check that connection actually succeeds (`isConnected` becomes true)

## Support

For issues or questions:
- [Abstraxion Documentation](https://docs.burnt.com/xion/developers)
- [GitHub Issues](https://github.com/burnt-labs/xion.js/issues)

