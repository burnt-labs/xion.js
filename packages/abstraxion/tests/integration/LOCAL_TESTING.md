# Local Integration Testing Guide

This guide explains how to run the integration tests locally, emulating the GitHub Actions environment.

## Quick Start

1. **Create your local environment file**:

   ```bash
   cd packages/abstraxion/tests/integration
   cp .env.test.local .env.test.local.mine
   ```

2. **Edit `.env.test.local.mine`** (or just use `.env.test.local`):
   - The file is pre-configured with public testnet values
   - All public configuration comes from `.github/config/test-environments.json`
   - You only need to add sensitive values if you have them

3. **Run the tests**:

   ```bash
   # From xion.js root
   cd /Users/GijsvanLeeuwen/Documents/projs/xion-core/xion.js

   # Run integration tests
   pnpm --filter @burnt-labs/abstraxion test:integration
   ```

## Configuration Modes

### Mode 1: Deployed AA-API (Default - Recommended)

This mode uses the live deployed AA-API on testnet. No local setup required.

```bash
# In .env.test.local
TEST_TARGET=deployed
XION_DEPLOYED_AA_API_URL=https://aa-api.xion-testnet-2.burnt.com
XION_DEPLOYED_FEE_GRANTER=xion1xrqz2wpt4rw8rtdvrc4n4yn5h54jm0nn4evn2x
```

**Advantages**:

- No local AA-API server needed
- Uses production-like environment
- Faster setup

**Disadvantages**:

- Fee grants might be exhausted (tests may fail with "insufficient funds")
- Cannot debug AA-API internals

### Mode 2: Local AA-API Server

This mode runs a local instance of the AA-API server. Requires additional setup.

```bash
# In .env.test.local
TEST_TARGET=local
XION_LOCAL_AA_API_URL=http://localhost:8787
XION_LOCAL_FEE_GRANTER=xion10y5pzqs0jn89zpm6va625v6xzsqjkm293efwq8
```

**Prerequisites**:

1. Clone the `account-abstraction-api` repository
2. Create a `.dev.vars` file with Stytch credentials:

   ```bash
   cd /Users/GijsvanLeeuwen/Documents/projs/xion-core/account-abstraction-api

   # Create .dev.vars file
   cat > .dev.vars <<EOF
   STYTCH_PROJECT_ID=your-stytch-project-id
   STYTCH_SECRET=your-stytch-secret
   FEE_GRANTER_ADDRESS=xion10y5pzqs0jn89zpm6va625v6xzsqjkm293efwq8
   XION_RPC_URL=https://rpc.xion-testnet-2.burnt.com:443
   EOF
   ```

3. Start the AA-API dev server:

   ```bash
   npm run dev
   ```

4. Wait for the server to be ready (check http://localhost:8787/healthz)

5. Run the tests from xion.js:
   ```bash
   cd /Users/GijsvanLeeuwen/Documents/projs/xion-core/xion.js
   pnpm --filter @burnt-labs/abstraxion test:integration
   ```

**Advantages**:

- Full control over AA-API
- Can debug AA-API issues
- Can modify AA-API behavior

**Disadvantages**:

- Requires Stytch credentials
- More complex setup

## Environment Variables Reference

### Required (Public Values)

These are already set in `.env.test.local`:

| Variable                        | Description               | Default                                    |
| ------------------------------- | ------------------------- | ------------------------------------------ |
| `XION_TESTNET_CHAIN_ID`         | Chain ID for testnet      | `xion-testnet-2`                           |
| `XION_TESTNET_RPC_URL`          | RPC endpoint              | `https://rpc.xion-testnet-2.burnt.com:443` |
| `XION_TESTNET_REST_URL`         | REST API endpoint         | `https://api.xion-testnet-2.burnt.com:443` |
| `XION_TESTNET_GAS_PRICE`        | Gas price                 | `0.001uxion`                               |
| `XION_TESTNET_TREASURY_ADDRESS` | Treasury contract address | `xion1sv6...`                              |
| `XION_DEPLOYED_AA_API_URL`      | Deployed AA-API URL       | `https://aa-api.xion-testnet-2.burnt.com`  |
| `XION_DEPLOYED_FEE_GRANTER`     | Fee granter address       | `xion1xrqz...`                             |

### Optional (Sensitive Values)

These improve test reliability but are not required:

| Variable                            | Description          | How to Get        |
| ----------------------------------- | -------------------- | ----------------- |
| `XION_TESTNET_INDEXER_URL`          | Numia indexer URL    | Request from team |
| `XION_TESTNET_TREASURY_INDEXER_URL` | SubQuery indexer URL | Request from team |

Without these, some tests might be slower (account discovery uses retry logic instead of indexer queries).

### Local AA-API Only

Only needed if `TEST_TARGET=local`:

| Variable            | Description       | How to Get            |
| ------------------- | ----------------- | --------------------- |
| `STYTCH_PROJECT_ID` | Stytch project ID | From Stytch dashboard |
| `STYTCH_SECRET`     | Stytch secret key | From Stytch dashboard |

## Test Structure

```
tests/integration/
├── .env.test.local          # Your local config (gitignored)
├── fixtures.ts              # Test configuration loader
├── helpers.ts               # Test utilities
├── setup.ts                 # Global test setup
├── auth-flows/              # Authentication tests
│   ├── redirect-auth.integration.test.ts
│   └── signer-auth.integration.test.ts
├── transactions/            # Transaction tests
│   ├── fee-granting.integration.test.ts
│   └── transaction-signing.integration.test.ts
└── accounts/                # Account management tests
    ├── account-creation.integration.test.ts
    └── session-management.integration.test.ts
```

## Troubleshooting

### Tests Fail with "Insufficient Funds"

**Problem**: Fee granter account has no balance or grants are exhausted.

**Solution**:

- Switch to local AA-API mode (requires Stytch credentials)
- Or wait for fee granter to be refilled
- Or request team to refill the fee granter

### Tests Fail with "Account not discoverable"

**Problem**: Indexer is slow or unavailable.

**Solution**:

- Tests already use retry logic (5 retries, 2s delay)
- Add indexer URLs if you have them (improves speed)
- Tests should eventually pass, just takes longer

### Tests Timeout

**Problem**: Network or RPC issues.

**Solution**:

- Check RPC endpoint is accessible
- Increase timeout: `INTEGRATION_TEST_TIMEOUT=240000` (4 minutes)

### "Cannot find module" Errors

**Problem**: Packages not built.

**Solution**:

```bash
cd /Users/GijsvanLeeuwen/Documents/projs/xion-core/xion.js
pnpm build
```

## Comparison with GitHub Actions

The GitHub Actions workflow ([.github/workflows/integration-tests.yml](../../.github/workflows/integration-tests.yml)) does the following:

1. Loads configuration from [.github/config/test-environments.json](../../.github/config/test-environments.json)
2. Sets environment variables from GitHub secrets
3. Optionally starts local AA-API server
4. Runs tests with `pnpm --filter @burnt-labs/abstraxion test:integration`

Your local setup does the same, but:

- Configuration comes from `.env.test.local` instead of GitHub secrets
- You manually start AA-API server if using local mode
- You run tests directly via pnpm

## Running Specific Tests

```bash
# Run all integration tests
pnpm --filter @burnt-labs/abstraxion test:integration

# Run specific test file
pnpm --filter @burnt-labs/abstraxion test:integration redirect-auth

# Run specific test suite
pnpm --filter @burnt-labs/abstraxion test:integration -t "Fee Granting"

# Run in watch mode
pnpm --filter @burnt-labs/abstraxion test:integration --watch
```

## CI/CD Parity

To ensure your local tests match CI behavior:

1. **Use same Node version**: Check `.github/workflows/integration-tests.yml` (currently `lts/*`)
2. **Use same pnpm version**: `8.9.0` (specified in workflow)
3. **Build before testing**: `pnpm build`
4. **Set `CI=true`**: `CI=true pnpm --filter @burnt-labs/abstraxion test:integration`

## Next Steps

- If tests pass locally but fail in CI, compare environment variables
- If tests fail locally and in CI, check RPC/AA-API availability
- If you need indexer URLs, request from team (improves test speed)
