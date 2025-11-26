# @burnt-labs/test-utils

Shared test utilities, mock data, and test helpers for xion.js packages.

## Installation

This is an internal workspace package. Add it to your package dependencies:

```json
{
  "devDependencies": {
    "@burnt-labs/test-utils": "workspace:*"
  }
}
```

## Usage

### Mock Data

Import pre-configured mock data for testing:

```typescript
import { mockGrants, mockAddresses } from '@burnt-labs/test-utils/mocks';
```

### Test Fixtures

Import standard test fixtures:

```typescript
import { fixtures } from '@burnt-labs/test-utils/fixtures';
```

### Test Builders

Use fluent builders to create test data:

```typescript
import { GrantBuilder, TreasuryBuilder } from '@burnt-labs/test-utils/builders';

const grant = new GrantBuilder()
  .withGrantee('xion1...')
  .withExpiration(Date.now() + 3600000)
  .build();
```

### Test Helpers

Import testing helper functions:

```typescript
import { getTestConfig, createTestTimeout } from '@burnt-labs/test-utils/helpers';
```

### Vitest Utilities

Import Vitest-specific utilities:

```typescript
import { setupTestEnvironment } from '@burnt-labs/test-utils/vitest';
```

## Package Structure

```
test-utils/
├── src/
│   ├── mocks/        # Mock data (grants, addresses, treasuries)
│   ├── fixtures/     # Standard test fixtures
│   ├── builders/     # Fluent test data builders
│   ├── helpers/      # Testing helper functions
│   └── vitest/       # Vitest-specific utilities
```

## Development

```bash
# Type checking
pnpm check-types

# Linting
pnpm lint
```

## Notes

- This package is private and not published to npm
- All exports use TypeScript source files directly (no compilation)
- Mock data is designed to match real XION blockchain structures
