# GitHub Actions Workflows

Automated CI/CD workflows for the xion.js monorepo.

## Workflows

### 🧪 Unit Tests (`unit-tests.yml`)

**Triggers**: All pushes, PRs, manual
**Purpose**: Fast feedback on code changes

```bash
# What it does
- Install dependencies
- Build packages
- Run unit tests (excludes integration)
- Check formatting
```

---

### 🧪 Integration Tests (`integration-tests.yml`)

**Triggers**: Push to `main`, manual dispatch
**Purpose**: Test against live/local blockchain networks

**Manual Run Options**:

- `test_environment`: `testnet` | `mainnet` (default: `testnet`)
- `aa_api_mode`: `live-url` | `dev-server` (default: `live-url`)
- `aa_api_url`: Custom AA-API URL (optional)

**What it does**:

1. Loads config from [.github/config/test-environments.json](../config/test-environments.json)
2. Optionally starts local AA-API server (`dev-server` mode)
3. Runs integration tests for `@burnt-labs/account-management` and `@burnt-labs/abstraxion`

**Environment Values**: See [test-environments.json](../config/test-environments.json) for all public configuration (RPC URLs, chain IDs, treasury addresses, etc.)

---

### 🏗️ Build (`build.yml`)

**Triggers**: All pushes, PRs, manual
**Purpose**: Verify packages build successfully

---

### 🔍 Dependency Validation (`dependency-validation.yml`)

**Triggers**: PRs/pushes to `main`/`develop` when package files change
**Purpose**: Check CosmJS versions, circular dependencies

---

### 🚀 Release (`release.yml`)

**Triggers**: Push to `main`, manual
**Purpose**: Publish packages to npm using Changesets

---

## Local Testing

### Run Integration Tests Locally

**Option 1: Against deployed testnet AA-API (easiest)**

```bash
cd xion.js
./test-local-ci.sh testnet
```

**Option 2: Against local AA-API server**

```bash
# Terminal 1: Start AA-API
cd account-abstraction-api
npm run dev

# Terminal 2: Run tests
cd xion.js
export TEST_TARGET=local
pnpm --filter @burnt-labs/abstraxion test:integration
```

See [packages/abstraxion/tests/integration/LOCAL_TESTING.md](../../packages/abstraxion/tests/integration/LOCAL_TESTING.md) for detailed local setup.

---

## Configuration

### Public Values (in [test-environments.json](../config/test-environments.json))

All non-sensitive configuration for testnet and mainnet:

- Chain IDs, RPC URLs, REST URLs
- Gas prices, treasury addresses, fee granters
- AA-API URLs (testnet public, mainnet requires secret)

### Required GitHub Secrets

**Testnet (Optional - improves performance)**:

- `XION_TESTNET_INDEXER_URL` - Numia indexer
- `XION_TESTNET_TREASURY_INDEXER_URL` - SubQuery indexer

**Mainnet (Required for mainnet tests)**:

- `XION_MAINNET_AA_API_URL` - Mainnet AA-API endpoint
- `XION_MAINNET_INDEXER_URL` - Mainnet Numia indexer
- `XION_MAINNET_TREASURY_INDEXER_URL` - Mainnet SubQuery indexer

**AA-API Dev Server (Required for `dev-server` mode)**:

- `STYTCH_PROJECT_ID` - Stytch authentication
- `STYTCH_SECRET` - Stytch authentication

---

## Environment Variables

All environments export both specific and generic variables:

**Testnet-specific**: `XION_TESTNET_*`
**Mainnet-specific**: `XION_MAINNET_*`
**Generic (matches selected env)**: `XION_*`

Example:

```bash
# When test_environment=testnet
XION_TESTNET_CHAIN_ID=xion-testnet-2
XION_MAINNET_CHAIN_ID=xion-mainnet-1
XION_CHAIN_ID=xion-testnet-2  # Matches selected environment
```

This ensures:

- ✅ Both environments always have correct, distinct values
- ✅ No accidental mixing of testnet/mainnet configuration
- ✅ Generic variables provide backward compatibility

See [BUGFIX-TREASURY-ADDRESS.md](../BUGFIX-TREASURY-ADDRESS.md) for details on the treasury address fix.

---

## Quick Reference

### Run Specific Workflow Manually

1. Go to **Actions** tab in GitHub
2. Select workflow (e.g., "🧪 Integration Tests")
3. Click **Run workflow**
4. Configure options and run

### Check Workflow Status

```bash
# View recent workflow runs
gh run list --workflow=integration-tests.yml

# View logs for specific run
gh run view <run-id> --log
```

### Local Development Flow

```bash
# 1. Make changes
# 2. Run unit tests
pnpm test

# 3. Run build
pnpm build

# 4. (Optional) Run integration tests locally
./test-local-ci.sh testnet

# 5. Push and let CI validate
git push
```

---

## Troubleshooting

### Integration Tests Fail

**Check**:

1. Environment variables loaded correctly (Step 2 logs)
2. AA-API accessible/started (Step 4-5 logs)
3. Test logs for specific errors

**Common Issues**:

- **"Insufficient funds"**: Fee granter exhausted (testnet only, not a bug)
- **"Account not discoverable"**: Indexer slow, tests retry automatically
- **"AA-API not ready"**: Server startup timeout, check `.dev.vars`

### AA-API Dev Server Won't Start

**Check**:

1. `.dev.vars` exists in `account-abstraction-api/`
2. `STYTCH_PROJECT_ID` and `STYTCH_SECRET` set
3. Logs at `/tmp/aa-api-local-test.log` (local) or workflow logs (CI)

### Unit Tests Not Running

**Check**:

1. Test files match vitest config patterns
2. Dependencies installed: `pnpm install`
3. Not accidentally running integration tests

---

## Files Structure

```
.github/
├── workflows/
│   ├── unit-tests.yml           # Fast unit tests
│   ├── integration-tests.yml    # Blockchain integration tests
│   ├── build.yml                # Build verification
│   ├── dependency-validation.yml
│   └── release.yml
├── config/
│   └── test-environments.json   # Public testnet/mainnet config
└── scripts/
    ├── load-test-config.sh      # Loads config from JSON
    └── run-local-integration-tests.sh  # Local CI simulator
```

---

## Best Practices

1. **Unit tests**: Run on every push for fast feedback
2. **Integration tests**: Run on `main` or manually (expensive)
3. **Local testing**: Use `./test-local-ci.sh` to match CI exactly
4. **Secrets**: Never commit, always use GitHub Secrets
5. **Config changes**: Update `test-environments.json`, not hardcoded values
