# demos/node

Placeholder Node.js demo for `@burnt-labs/abstraxion-js`. No browser runtime, no React, no Expo.

## Status

Placeholder. Scope is deferred per [`abstraxion_package_restructure.md`](../../../.docs/tasks/abstraxion_package_restructure.md).

The current entrypoint imports `@burnt-labs/abstraxion-js`, prints the testnet chain info, and exits — enough to prove the package resolves and runs in plain Node without a DOM.

## Run

```bash
pnpm install                  # from xion.js/ workspace root
pnpm --filter demos-node start
```

## Planned scenarios (TBD)

- Signer-mode account creation with a CLI-supplied mnemonic
- Programmatic transaction signing (no dashboard, no redirect)
- Authenticator management against a known account
