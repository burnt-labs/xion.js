# @burnt-labs/test-utils

Shared testing utilities for xion.js monorepo.

## Overview

This package provides **shared testing utilities** that are used across multiple packages:

- Mock strategy implementations (storage, redirect)
- Shared vitest setup (webauthn mocking)
- Generic test helpers and builders
- Common test addresses

## What's Included

### ✅ Shared Testing Utilities

#### Vitest Setup

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["../test-utils/src/vitest/setup.ts"],
  },
});
```

Provides:

- Global webauthn mock for Node.js environments
- TextEncoder/TextDecoder polyfills

#### Mock Strategies

```typescript
import {
  MockStorageStrategy,
  MockRedirectStrategy,
} from "@burnt-labs/test-utils/mocks";

const storage = new MockStorageStrategy();
const redirect = new MockRedirectStrategy();
```

Provides:

- `MockStorageStrategy` - In-memory storage for testing
- `MockRedirectStrategy` - Mock URL navigation for testing

#### Test Addresses

```typescript
import {
  TEST_ADDRESSES,
  ETH_WALLET_TEST_DATA,
} from "@burnt-labs/test-utils/mocks";

const validatorAddr = TEST_ADDRESSES.validator;
const ethWallet = ETH_WALLET_TEST_DATA.address;
```

### ✅ Mock Fixtures Removed (Breaking Change)

**The `/fixtures` subpath has been removed.** Mock data is now colocated with the packages that define the types:

- **Account/Authenticator fixtures** → [`@burnt-labs/signers/testing`](../signers/src/testing/)
- **Treasury/Grant fixtures** → [`@burnt-labs/account-management/testing`](../account-management/src/testing/)

**Migration:** If you were using `@burnt-labs/test-utils/fixtures`, update your imports to the new package-specific locations.

See [/TESTING-ARCHITECTURE.md](../../TESTING-ARCHITECTURE.md) for the full migration guide.

## Usage

### Importing Shared Utilities

```typescript
// ✅ Use mocks (shared utilities)
import {
  MockStorageStrategy,
  MockRedirectStrategy,
  TEST_ADDRESSES,
} from "@burnt-labs/test-utils/mocks";

// ✅ Use vitest setup
// In vitest.config.ts:
setupFiles: ["../test-utils/src/vitest/setup.ts"];
```

### Importing Mock Data (New Pattern)

```typescript
// ✅ Import from package-specific /testing
import {
  mockAuthenticators,
  mockSmartAccounts,
} from "@burnt-labs/signers/testing";
import {
  mockTreasuryConfigs,
  mockGrantConfigs,
} from "@burnt-labs/account-management/testing";

// ❌ Old (no longer works)
import { mockAuthenticators } from "@burnt-labs/test-utils/fixtures";
```

## Architecture

### Why Split Mock Data from Utilities?

**Problem:** Centralized fixtures in test-utils created circular dependencies:

```
test-utils (fixtures) → signers (types)
signers → test-utils (devDependency)
🔄 CIRCULAR!
```

**Solution:** Colocate mock data with the types they mock:

```
signers/testing → signers/types ✅
account-management/testing → account-management/types ✅
test files → package/testing ✅
```

### What Stays in test-utils?

Only **shared utilities** that don't create circular dependencies:

- Mock strategy implementations (no package-specific types)
- Vitest setup (global mocks)
- Generic test helpers
- Common test addresses

## Documentation

- [TESTING.md](./TESTING.md) - WebAuthn setup and troubleshooting
- [/TESTING-ARCHITECTURE.md](../../TESTING-ARCHITECTURE.md) - Colocated mock data architecture
- [Vitest Setup](./src/vitest/setup.ts) - Global mock configuration

## Migration Guide

If you're using deprecated fixtures:

1. **Find your imports:**

   ```typescript
   // Old (deprecated)
   import { mockAuthenticators } from "@burnt-labs/test-utils/fixtures";
   import { mockTreasuryConfigs } from "@burnt-labs/test-utils/fixtures";
   ```

2. **Replace with package-specific imports:**

   ```typescript
   // New (recommended)
   import { mockAuthenticators } from "@burnt-labs/signers/testing";
   import { mockTreasuryConfigs } from "@burnt-labs/account-management/testing";
   ```

3. **Build the source packages:**
   ```bash
   cd packages/signers && pnpm build
   cd packages/account-management && pnpm build
   ```

## Development

```bash
# Type checking
pnpm check-types

# Linting
pnpm lint
```

## Contributing

When adding new testing utilities:

### ✅ Add to test-utils if:

- It's a shared utility used across multiple packages
- It doesn't import types from other xion.js packages
- It's a mock strategy/helper (not mock data)

### ❌ Don't add to test-utils if:

- It's mock data that matches package-specific types
- It would create circular dependencies
- It's only used in one package

Instead, create a `/testing` subpath in the relevant package.

See [TESTING-ARCHITECTURE.md](../../TESTING-ARCHITECTURE.md) for detailed guidelines.
