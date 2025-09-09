---
"@burnt-labs/abstraxion-react-native": major
"@burnt-labs/abstraxion-core": major
"@burnt-labs/abstraxion": minor
"@burnt-labs/constants": minor
"demo-app": minor
---

# Breaking Changes

## React Native Crypto Setup Required

### What Changed

- Added React Native support with `quickCrypto` fallback for KDF operations
- Made `executeKdf` method static in `SignArbSecp256k1HdWallet`
- Made `createWithSigner` method synchronous (removed async/await)

### Migration Guide

#### For React Native Apps

You must now install and configure crypto dependencies:

```bash
npm install react-native-get-random-values react-native-quick-crypto
```

Add this to your app's entry point (before any Abstraxion imports):

```typescript
import "react-native-get-random-values";
import crypto from "react-native-quick-crypto";

// Set up global crypto for React Native
if (
  typeof global !== "undefined" &&
  global.navigator?.product === "ReactNative"
) {
  global.quickCrypto = crypto;
}
```

#### For Web Apps

No changes required - existing functionality remains the same.
