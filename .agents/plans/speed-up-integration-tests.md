# Speed Up Integration Tests

Baseline from PR #389: 8m54s end-to-end, including a 2m32s build and a
5m11s Vitest run. Four test files account for most of the 703s aggregate test
time: fee granting (203s), signer auth (155s), account creation (121s), and
transaction signing (90s).

1. Run the integration build and test jobs on 8-vCPU Ubicloud runners; keep the
   aggregate status-only gate on the smaller Ubicloud runner.
2. Remove blanket Vitest retries so failures are immediate and visible.
3. Split the four slow files into independently schedulable suite entrypoints.
4. Allocate deterministic account-index ranges per CI run, shard, worker, and test invocation so added concurrency remains isolated and reproducible. Remap the fixed test mnemonic's index zero per test so repeated setup inside a test reuses its signer while concurrent tests never share one.
5. Run the live RPC, treasury, and balance preflight once through Vitest global setup while retaining per-test storage cleanup.
6. Restrict the build job to the dependency closure required by the SDK integration and contract tests.
7. Run the blocking testnet dashboard contract in parallel with the SDK suite, then preserve the existing integration check name with an aggregate gating job.
8. Move deterministic non-network diagnostics into the unit-test workflow while
   retaining the treasury decoder's live-chain coverage.
9. Remove the empty account-management integration invocation and validate formatting, types, focused unit tests, local integration collection, workflow syntax, and the final diff.
10. Sync the live testnet abstract-account code ID and checksum through the
    checked-in environment config so concurrent account creation signs against
    the currently deployed contract.
11. Regenerate the AA API types and allow the dependency validator's documented
    chain-release gap when matching generated types have not been published.
12. Push signed fixes, require all GitHub checks to pass, mark the PR ready, and
    merge it into `main`.
