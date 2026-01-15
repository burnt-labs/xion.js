# @burnt-labs/account-management

Smart account management utilities for XION blockchain.

## Overview

This package provides comprehensive account and grant management for XION's smart accounts, supporting multiple discovery strategies and treasury integrations.

## Features

- **Account Discovery**: Multiple strategies for finding smart accounts
  - Numia indexer integration
  - Subquery indexer integration
  - Direct RPC queries
  - Composite fallback chains

- **Treasury Management**: Flexible treasury configuration retrieval
  - Direct contract queries
  - DAO DAO indexer integration
  - Composite strategy support

- **Connection Orchestration**: High-level API for managing account connections, grants, and redirects

## Testing

### Test Structure

The package uses a comprehensive unit testing approach with Vitest:

- **Unit Tests**: Located in `src/**/__tests__/` directories alongside source code
- **Integration Tests**: Located in `tests/integration/` (requires live RPC endpoints)

### Running Tests

```bash
# Run all tests in watch mode
pnpm test

# Run unit tests once
pnpm test:unit

# Run unit tests with coverage report
pnpm test:coverage

# Run integration tests (requires .env.test configuration)
pnpm test:integration

# Run integration tests in watch mode
pnpm test:integration:watch
```

### Coverage Requirements

The unit tests target 70%+ coverage for core modules:

- **Account Strategies**: 86.56% coverage
  - EmptyAccountStrategy: 100%
  - CompositeAccountStrategy: 100%
  - NumiaAccountStrategy: 100%
  - RpcAccountStrategy: 93.75%
  - SubqueryAccountStrategy: 96.58%
  - Factory: 100%

- **Treasury Strategies**: 93% coverage
  - CompositeTreasuryStrategy: 100%
  - DirectQueryTreasuryStrategy: 100%
  - DaoDaoTreasuryStrategy: 91.32%
  - createCompositeTreasuryStrategy: 100%

- **Orchestrator**: 66.17% coverage
  - orchestrator.ts: 100%
  - redirectFlow.ts: 100%

### Test Organization

Tests are organized by module:

```
src/
├── accounts/
│   └── strategies/
│       └── __tests__/
│           ├── account-empty-strategy.test.ts
│           ├── account-composite-strategy.test.ts
│           ├── account-numia-strategy.test.ts
│           ├── account-rpc-strategy.test.ts
│           ├── account-subquery-strategy.test.ts
│           └── factory.test.ts
├── grants/
│   └── strategies/
│       └── __tests__/
│           ├── treasury-composite-strategy.test.ts
│           ├── treasury-daodao-strategy.test.ts
│           ├── treasury-direct-query-strategy.test.ts
│           └── createCompositeTreasuryStrategy.test.ts
└── orchestrator/
    ├── __tests__/
    │   └── orchestrator.test.ts
    └── flow/
        └── __tests__/
            └── redirectFlow.test.ts
```

### Integration Testing

Integration tests require a live XION RPC endpoint. Configure by creating [.env.test](.env.test):

```env
XION_RPC_URL=https://rpc.xion-testnet-1.burnt.com:443
XION_CHAIN_ID=xion-testnet-1
```

See [vitest.config.integration.ts](vitest.config.integration.ts) for integration test configuration.

### Mocking Strategy

The tests use Vitest's mocking capabilities:

- **External APIs**: Mocked with `vi.fn()` and `global.fetch`
- **CosmJS**: Mocked CosmWasmClient for RPC interactions
- **WebAuthn**: Globally mocked in the signers package to avoid Node.js compatibility issues

## Development

```bash
# Build the package
pnpm build

# Run in development mode (watch)
pnpm dev

# Type checking
pnpm check-types

# Linting
pnpm lint
```
