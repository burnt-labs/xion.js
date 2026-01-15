# Migration Guide: Abstraxion UI Components

## Overview

The `Abstraxion` component and UI-related functionality have been moved from `@burnt-labs/abstraxion` to `@burnt-labs/ui`. The `@abstraxion` package is now UI-less and focuses on core logic and state management.

## 🎉 Good News: Backward Compatible!

**The `Abstraxion` component wrapper is now backward compatible!**

### What Changed

| What Changed           | Old Behavior (main)                     | New Behavior (this PR)                    | Breaking?                           |
| ---------------------- | --------------------------------------- | ----------------------------------------- | ----------------------------------- |
| **Import location**    | `@burnt-labs/abstraxion`                | `@burnt-labs/ui`                          | ⚠️ **Yes** - Update imports         |
| **CSS import**         | `@burnt-labs/abstraxion/dist/index.css` | `@burnt-labs/ui/dist/index.css`           | ⚠️ **Yes** - Update CSS path        |
| **`useModal()` hook**  | ✅ Available                            | ❌ Removed                                | ⚠️ **Yes** - Not needed anymore     |
| **`Abstraxion` props** | Only `onClose` required                 | `onClose` required, `isOpen` **optional** | ✅ **No** - Still works!            |
| **Modal state**        | Managed internally                      | Auto-managed OR externally controlled     | ✅ **No** - Auto-managed by default |

### Quick Migration Checklist

**Minimal migration (old apps work with just import changes):**

- [ ] Install `@burnt-labs/ui` package: `npm install @burnt-labs/ui`
- [ ] Update import: `@burnt-labs/abstraxion` → `@burnt-labs/ui` (for `Abstraxion` component)
- [ ] Update CSS: `@burnt-labs/abstraxion/dist/index.css` → `@burnt-labs/ui/dist/index.css`
- [ ] Remove `useModal()` import (not needed - modal auto-shows when connecting)
- [ ] **Done!** Old code works without other changes

**Optional: Upgrade to new patterns for more control:**

- [ ] Add `isOpen` prop to `<Abstraxion>` for external control (optional)
- [ ] Or migrate to `useAbstraxionModal` hook for full control (recommended)

### Migration Examples

**Old apps work with just import changes:**

```diff
- import { AbstraxionProvider, Abstraxion, useModal } from "@burnt-labs/abstraxion";
- import "@burnt-labs/abstraxion/dist/index.css";
+ import { AbstraxionProvider } from "@burnt-labs/abstraxion";
+ import { Abstraxion } from "@burnt-labs/ui";
+ import "@burnt-labs/ui/dist/index.css";

function App() {
-  const [showModal, setShowModal] = useModal();
  return (
    <AbstraxionProvider config={{ chainId: "xion-testnet-1" }}>
-      <Abstraxion onClose={() => setShowModal(false)} />
+      <Abstraxion onClose={() => console.log('Modal closed')} />
    </AbstraxionProvider>
  );
}
```

**That's it!** The modal now auto-shows when connecting, just like before.

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
import {
  AbstraxionProvider,
  useAbstraxionAccount,
} from "@burnt-labs/abstraxion";
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
    },
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

### Before (Old API - main branch)

```tsx
import {
  AbstraxionProvider,
  Abstraxion,
  useModal,
} from "@burnt-labs/abstraxion";
import "@burnt-labs/abstraxion/dist/index.css";

function App() {
  // OLD: Modal state was managed by AbstraxionContext via useModal hook
  const [showModal, setShowModal] = useModal();

  return (
    <AbstraxionProvider config={{ chainId: "xion-testnet-1" }}>
      {/* OLD: Only required onClose prop - modal controlled its own visibility */}
      <Abstraxion onClose={() => setShowModal(false)} />
      <button onClick={() => setShowModal(true)}>Click here</button>
    </AbstraxionProvider>
  );
}
```

### After - Option 1: Minimal Migration (Component Wrapper - Backward Compatible)

**Easiest migration path** - just update imports, modal auto-shows when connecting:

```tsx
import { AbstraxionProvider } from "@burnt-labs/abstraxion";
import { Abstraxion } from "@burnt-labs/ui";
import "@burnt-labs/ui/dist/index.css";

function App() {
  // No need for useModal() or useState!
  // Modal automatically shows when connecting, just like before

  return (
    <AbstraxionProvider config={{ chainId: "xion-testnet-1" }}>
      {/* isOpen prop is optional - auto-managed by default */}
      <Abstraxion onClose={() => console.log("Modal closed")} />
    </AbstraxionProvider>
  );
}
```

**Benefits:**

- ✅ Minimal code changes
- ✅ No `useModal()` needed
- ✅ Modal auto-shows when connecting
- ✅ Works exactly like the old API

### After - Option 2: Controlled Component (More Control)

If you want manual control over when the modal opens:

```tsx
import { useState } from "react";
import { AbstraxionProvider } from "@burnt-labs/abstraxion";
import { Abstraxion } from "@burnt-labs/ui";
import "@burnt-labs/ui/dist/index.css";

function App() {
  // Optional: Control modal state manually
  const [isOpen, setIsOpen] = useState(false);

  return (
    <AbstraxionProvider config={{ chainId: "xion-testnet-1" }}>
      {/* Pass isOpen for external control */}
      <Abstraxion isOpen={isOpen} onClose={() => setIsOpen(false)} />
      <button onClick={() => setIsOpen(true)}>Click here</button>
    </AbstraxionProvider>
  );
}
```

**Benefits:**

- ✅ Full control over modal visibility
- ✅ Can sync with URL, localStorage, routing, etc.
- ✅ Better for complex UX flows

### After - Option 3: Hook Approach (Recommended - Maximum Control)

Best option for full control and access to all features:

```tsx
import {
  AbstraxionProvider,
  useAbstraxionAccount,
} from "@burnt-labs/abstraxion";
import { useAbstraxionModal } from "@burnt-labs/ui";
import "@burnt-labs/ui/dist/index.css";

function AppContent() {
  const accountState = useAbstraxionAccount();
  const { Modal, LoadingOverlay, openModal } = useAbstraxionModal(
    accountState,
    {
      autoShowOnConnecting: true,
      showSuccessState: true,
      onConnectSuccess: () => console.log("Connected!"),
    },
  );

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

**Benefits:**

- ✅ All benefits of controlled approach
- ✅ Access to success callbacks
- ✅ Customizable auto-show behavior
- ✅ Full control over loading states
- ✅ Easiest to test and customize

## Why the New API is Better

**The `Abstraxion` component is backward compatible, but we still recommend upgrading to the new patterns for better control and flexibility.**

### Problems with the Old API (Solved in New Version)

1. **Hidden State Management** ❌

   ```tsx
   // OLD: Where does showModal live? How does it work?
   const [showModal, setShowModal] = useModal(); // Magic context state
   ```

   - State was hidden inside context, making it hard to reason about
   - Developers couldn't easily integrate with their own state management
   - Poor TypeScript inference for state origin

2. **Tight Coupling** ❌

   ```tsx
   // OLD: Abstraxion component controlled its own visibility
   <Abstraxion onClose={() => setShowModal(false)} />
   ```

   - Component and state management were inseparable
   - Couldn't use different UI libraries with same state logic
   - React Native users had to work around web-only modal state

3. **Limited Flexibility** ❌
   - Couldn't integrate with URL state (e.g., `?modal=open`)
   - Couldn't sync with animation libraries
   - Couldn't persist modal state to localStorage
   - Hard to test in isolation

4. **SSR/Hydration Issues** ❌
   - Context state during server-side rendering caused hydration mismatches
   - Initial state unclear during SSR

### Benefits of the New API

1. **Explicit State Control** ✅

   ```tsx
   // NEW: Crystal clear where state lives
   const [isOpen, setIsOpen] = useState(false);
   ```

   - State is locally managed (standard React pattern)
   - Easy to understand and debug
   - Works with any state management solution

2. **Separation of Concerns** ✅

   ```tsx
   // NEW: Logic and UI are separate
   const accountState = useAbstraxionAccount(); // Logic (from @abstraxion)
   const { Modal } = useAbstraxionModal(accountState); // UI (from @ui)
   ```

   - `@burnt-labs/abstraxion` = Pure logic, no UI dependencies
   - `@burnt-labs/ui` = UI components that accept state
   - React Native can use `@burnt-labs/abstraxion` + their own UI

3. **Full Flexibility** ✅

   ```tsx
   // Examples of what's now possible:

   // Sync with URL
   const [isOpen, setIsOpen] = useSearchParams("modal");

   // Sync with router
   useEffect(() => {
     if (pathname === "/connect") setIsOpen(true);
   }, [pathname]);

   // Sync with localStorage
   const [isOpen, setIsOpen] = useLocalStorage("modal-open", false);

   // Integrate with animation library
   const controls = useAnimation();
   useEffect(() => {
     if (isOpen) controls.start("visible");
   }, [isOpen]);
   ```

4. **Better SSR** ✅
   - No hidden context state during SSR
   - Clear initial state on server and client
   - Proper hydration

5. **Easier Testing** ✅
   ```tsx
   // NEW: Easy to test with controlled props
   render(<Abstraxion isOpen={true} onClose={mockClose} />);
   ```

### Our Recommendation: **Don't Go Back**

The new API is superior in every way. While it requires migration work, it's a one-time cost that pays dividends:

- ✅ **Cleaner architecture**: Separation of state and UI
- ✅ **More flexible**: Works with any state management approach
- ✅ **Better DX**: Explicit, predictable, testable
- ✅ **Future-proof**: Easier to extend and customize

**Migration effort**: ~5 minutes per app (just add `useState` and `isOpen` prop)
**Long-term benefit**: Infinite (better maintainability, flexibility, testability)

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
  defaultOpen?: boolean; // Default: false
  isOpen?: boolean; // External control of modal state (overrides internal state)
  autoShowOnConnecting?: boolean; // Default: true
  showSuccessState?: boolean; // Default: true
  successDuration?: number; // Default: 2000ms
  error?: string; // Custom error message
  onClose?: () => void; // Callback when modal closes
  onConnectSuccess?: () => void; // Callback when connection succeeds
}
```

### Return Value

```typescript
interface UseAbstraxionModalReturn {
  isOpen: boolean; // Current modal state
  openModal: () => void; // Open the modal
  closeModal: () => void; // Close the modal
  toggleModal: () => void; // Toggle modal state
  Modal: React.ComponentType; // Modal component to render
  LoadingOverlay: React.ComponentType; // Loading overlay component
}
```

## Features

### 1. Automatic Modal Management

The hook automatically shows the modal when connecting starts (if `autoShowOnConnecting` is true):

```tsx
const { Modal, LoadingOverlay } = useAbstraxionModal(accountState, {
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
const { Modal } = useAbstraxionModal(accountState, {
  showSuccessState: true,
  successDuration: 2000, // Show success for 2 seconds
});
```

### 4. Error Handling

Display custom error messages:

```tsx
const { Modal } = useAbstraxionModal(accountState, {
  error: "Connection failed. Please try again.",
});
```

## Advanced Examples

### Custom Success Callback

```tsx
const { Modal, LoadingOverlay } = useAbstraxionModal(accountState, {
  onConnectSuccess: () => {
    // Redirect or update UI after successful connection
    router.push("/dashboard");
  },
});
```

### Manual Modal Control

```tsx
const { Modal, openModal, closeModal, isOpen } = useAbstraxionModal(accountState, {
  autoShowOnConnecting: false, // Manual control
});

// Control modal manually
<button onClick={openModal}>Open</button>
<button onClick={closeModal}>Close</button>
{isOpen && <Modal />}
```

### Without Success State

```tsx
const { Modal, LoadingOverlay } = useAbstraxionModal(accountState, {
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
      {isOpen && <Dialog>{/* Manual modal content */}</Dialog>}
      {(accountState.isInitializing || accountState.isConnecting) && (
        <div className="fixed inset-0 z-50">{/* Manual loading overlay */}</div>
      )}
    </>
  );
}
```

### After (Using Hook)

```tsx
function MyComponent() {
  const accountState = useAbstraxionAccount();
  const { Modal, LoadingOverlay, openModal } = useAbstraxionModal(accountState);

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

## Side-by-Side Comparison

### Complete Example: Old vs New

#### ⚠️ OLD API (main branch)

```tsx
import {
  AbstraxionProvider,
  Abstraxion,
  useModal,
} from "@burnt-labs/abstraxion";
import "@burnt-labs/abstraxion/dist/index.css";

function App() {
  // Modal state managed by context
  const [showModal, setShowModal] = useModal();

  return (
    <AbstraxionProvider config={{ chainId: "xion-testnet-1" }}>
      {/* Only onClose prop */}
      <Abstraxion onClose={() => setShowModal(false)} />
      <button onClick={() => setShowModal(true)}>Connect</button>
    </AbstraxionProvider>
  );
}
```

**Limitations:**

- ⚠️ Hidden state in context (hard to debug)
- ⚠️ Tight coupling (can't use different UI)
- ⚠️ Can't integrate with URL/localStorage/routing
- ⚠️ SSR hydration issues
- ⚠️ Hard to test in isolation

#### ✅ NEW API (this PR) - Backward Compatible Component

**Easiest migration** - just change imports, no code changes needed:

```tsx
import { AbstraxionProvider } from "@burnt-labs/abstraxion";
import { Abstraxion } from "@burnt-labs/ui";
import "@burnt-labs/ui/dist/index.css";

function App() {
  // No useModal() needed! Modal auto-manages itself

  return (
    <AbstraxionProvider config={{ chainId: "xion-testnet-1" }}>
      {/* isOpen is optional - auto-shows when connecting */}
      <Abstraxion onClose={() => console.log("closed")} />
    </AbstraxionProvider>
  );
}
```

**Benefits over old API:**

- ✅ No `useModal()` dependency
- ✅ Modal auto-shows when connecting
- ✅ Auto-closes when done
- ✅ Success state display
- ✅ Better loading states
- ✅ Works with both redirect and signer modes

#### ✅ NEW API (this PR) - Controlled Component (Optional)

**More control** - if you need manual modal control:

```tsx
import { useState } from "react";
import { AbstraxionProvider } from "@burnt-labs/abstraxion";
import { Abstraxion } from "@burnt-labs/ui";
import "@burnt-labs/ui/dist/index.css";

function App() {
  // Optional: Control modal state manually
  const [isOpen, setIsOpen] = useState(false);

  return (
    <AbstraxionProvider config={{ chainId: "xion-testnet-1" }}>
      {/* Both isOpen and onClose props */}
      <Abstraxion isOpen={isOpen} onClose={() => setIsOpen(false)} />
      <button onClick={() => setIsOpen(true)}>Connect</button>
    </AbstraxionProvider>
  );
}
```

**Extra benefits:**

- ✅ Full control over modal visibility
- ✅ Can sync with URL, localStorage, routing, etc.
- ✅ Better for complex UX flows

#### ✅ NEW API (this PR) - Hook Approach (RECOMMENDED)

```tsx
import {
  AbstraxionProvider,
  useAbstraxionAccount,
} from "@burnt-labs/abstraxion";
import { useAbstraxionModal } from "@burnt-labs/ui";
import "@burnt-labs/ui/dist/index.css";

function AppContent() {
  const accountState = useAbstraxionAccount();
  const { Modal, LoadingOverlay, openModal } = useAbstraxionModal(
    accountState,
    {
      autoShowOnConnecting: true,
      showSuccessState: true,
    },
  );

  return (
    <>
      <button onClick={openModal}>Connect</button>
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

**Extra Benefits:**

- ✅ All benefits of component approach
- ✅ Full control over modal behavior
- ✅ Access to loading states
- ✅ Success callbacks
- ✅ Auto-show on connecting
- ✅ Customizable success duration

## Support

For issues or questions:

- [Abstraxion Documentation](https://docs.burnt.com/xion/developers)
- [GitHub Issues](https://github.com/burnt-labs/xion.js/issues)
