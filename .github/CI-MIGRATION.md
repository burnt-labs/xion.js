# Linux CI runner migration and shared-workflow exceptions

Part of [DO-557](https://linear.app/burnt/issue/DO-557).

## Scope and observed baseline

Audited on October 27, 2026, against default branch `main` at
`28424172001e8294f796e5a9df82f35587cbd5d9` and the latest published
[github-workflows v1.8.0](https://github.com/burnt-labs/github-workflows/releases/tag/v1.8.0),
resolved to `abce8f6f2861dd0f42ba1c1337e46eccca33cd24`.

The actual default branch has 10 workflow files and 18 direct Linux jobs:
13 select `ubuntu-latest`, and 5 already select Ubicloud. There are no Depot
labels, matrix jobs, macOS jobs, Windows jobs, or reusable-workflow calls on
this branch. Older organization-wide counts are not this branch's inventory.

This change moves 12 of the 13 hosted jobs to Ubicloud. The result is 17
Ubicloud jobs and one explicit hosted npm-publishing exception. It is **not**
full shared-workflow adoption or complete removal of GitHub-hosted runners.
The documented exceptions are an interim migration boundary, not the target
architecture. Centralization remains required wherever the released platform
can preserve the consumer's behavior; there is no permanent bespoke exemption.

## Runner selection

- Package installation, builds, tests, schema validation, and review actions:
  `ubicloud-standard-4`.
- Dashboard HTTP shell checks and their comment-only jobs:
  `ubicloud-standard-2`.
- Existing integration jobs retain their four `ubicloud-standard-8` runners
  and one `ubicloud-standard-2` gate.
- `release.yml` originally retained `ubuntu-latest`. It now calls the shared
  Changesets flow, which publishes on Ubicloud; see below.

The [official Ubicloud runner table](https://www.ubicloud.com/docs/github-actions-integration/runner-types)
lists these x64 Ubuntu labels. No architecture, runtime, cache key, lockfile,
package-manager pin, action version, trigger, permission, secret, environment,
artifact name/path/retention, job dependency, or advisory/blocking rule changes.
The only workflow edits are runner scalars and explanatory headers.

## npm publishing: now on the shared Changesets flow

This section originally kept `release.yml` bespoke and on GitHub-hosted
`ubuntu-latest` for two reasons. Both are resolved:

- **Runner.** npm OIDC trusted publishing was believed to exclude Ubicloud.
  It does not: `@burnt-labs/provider-registry-types` (provider-devtool, via the
  shared Changesets flow) and `@burnt-labs/expo-satya-attest` (tls-app-attest
  #213, snapshot `3.13.2-snapshot.169.1.sha-7821d6e`) both publish via OIDC
  from `ubicloud-standard-4`, with no npm token.
- **Post-publish verification.** github-workflows
  [v1.10.0](https://github.com/burnt-labs/github-workflows/releases/tag/v1.10.0)
  adds `post-publish-command`, which runs after any publish attempt, a failed
  one included, and fails the job on its own exit status. That matches the
  former `if: always() && (failure || published)` dependency-train step.

`release.yml` is now a thin caller of `npm-changesets.yml` pinned to v1.10.0.
It keeps the `release.yml` filename (the packages' npm trusted publisher),
`id-token: write`, `pnpm version:packages`, `pnpm publish:packages`, the version
pull request title and commit message, signed `commitMode: github-api` (set by
the shared flow), and the dependency-train check as `post-publish-command`.
The shared flow runs the gates in `.github/quality-policy.jsonc` before it
versions or publishes, and requests provenance only for a public repository,
which this one is.

Behaviour that changed:

- The quality gates (lint, format, type-check, unit tests, core coverage) now
  block a release; previously only the build did.
- Runs are serialized per repository without cancellation. The old caller
  cancelled in-progress runs, which could interrupt a publish before tagging.
- A run whose commit is no longer the head of `main` stands down in favour of
  the newer run.
- npm 12 is pinned for the publish, and `changesets/action` moves from v1 to
  v2.1.2.

## Shared quality: consumer prerequisites, not unsupported Node

The released `required-quality.yml` supports this Node/pnpm monorepo. It requires
independent real lint, formatting, type-check, test, coverage, and build gates;
it does not offer a format-only entrypoint. Adoption was blocked by existing
consumer failures, not a claim that the platform cannot run pnpm. Those
failures are now fixed. Re-run on November 3, 2026, from a clean checkout
(no `node_modules` or `dist`):

| Baseline command (pnpm 8.9.0, frozen lockfile)                         | Observed result                                                                                        |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `pnpm install --frozen-lockfile`                                       | Passed; no lockfile changes                                                                            |
| `pnpm lint`                                                            | Passed, 19 tasks                                                                                       |
| `pnpm format:check`                                                    | Passed                                                                                                 |
| `pnpm turbo run check-types`                                           | Passed, 15 tasks (`check-types` now depends on `^build`)                                               |
| `pnpm --filter @burnt-labs/abstraxion-core exec vitest run --coverage` | Passed, 398 tests; lines 59.26%, functions 65.56%, branches 51.9%, statements 58.74% (`vitest` 4.1.11) |
| `pnpm test:scripts`                                                    | Passed, 30 tests                                                                                       |

What changed to get there:

- `@vitest/coverage-v8` (and core's `@vitest/ui`) are pinned to exactly
  4.1.11 to match the locked `vitest`. The 1.6.1 provider failed with
  `TypeError: this.resolveReporters is not a function`, and a `^4.1.11` range
  resolves to 4.1.12, which is a peer mismatch.
- `test-utils` references the vitest globals types its `vi`/`expect` guards use.
- Turbo had stopped at the first `check-types` failure (`test-utils`), which
  hid 49 more pre-existing type errors in `abstraxion-core`, `abstraxion-js`,
  `signers`, and `account-management`. Those are fixed by tsconfig/typing
  changes and by updating tests that had drifted from the generated AA API and
  xion-types definitions. The SDK runtime already matched those types.
- `check-types` depends on `^build` because workspace packages resolve each
  other through `dist` types, and the shared workflow runs Type-check before
  Build.

The core package's coverage thresholds (50% lines/functions, 40% branches) are
unchanged and met; the coverage provider type is unchanged, and no mandatory
command is a no-op. The remaining step is to migrate compatible quality gates
to the SHA-pinned released workflow.

## Retained bespoke workflow map

Every workflow carries a sanctioned-bespoke header and links back here. These
are the remaining concrete differences, not claims of complete adoption:

| Workflow                               | Reason to retain the bespoke portion                                                                                                                                                                                                                  |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `format.yml`                           | Standalone formatting check with its current identity/triggers; full shared quality needs the real consumer fixes above.                                                                                                                              |
| `unit-tests.yml`                       | Dispatch-selected AA API generation, build environment, and named build-artifact upload/download across two jobs. Shared quality exposes policy outputs, not build artifacts or these generation inputs.                                              |
| `integration-tests.yml`                | Five-job dependency graph, shared build artifact, live configuration/secrets, Playwright containers, and blocking testnet versus informational mainnet behavior.                                                                                      |
| `schema-validation.yml`                | Live schema generation with a dispatch-selected URL, generated-file diff, named artifact, PR comment, and failure on drift.                                                                                                                           |
| `daodao-indexer-schema-validation.yml` | Live indexer schema generation, dispatch-selected URL, named diff artifact, PR comment, and failure on drift.                                                                                                                                         |
| `dependency-validation.yml`            | Zero-dependency tests before install, live package/chain alignment checks, and PR-advisory versus release-blocking npm dependency-train semantics. The shared optional `validate` command is after install/build and does not preserve that sequence. |
| `dashboard-contract-validation.yml`    | HTTP shell contract checks with blocking testnet and advisory mainnet plus conditional result comments. These are repository-shaped checks, not npm/deployment flows.                                                                                 |
| `claude-code-review.yml`, `claude.yml` | Comment/issue/review event automation and its credential scope; no corresponding released shared entrypoint.                                                                                                                                          |

Keep repository-specific contract/schema checks local as the platform guidance
allows. `release.yml` is no longer bespoke: it calls the shared Changesets flow
(see "npm publishing" above).

### Owning follow-ups and adoption conditions

- **Consumer quality owner:** the test-utils type-check and the Vitest
  coverage provider are fixed, and the enforced coverage gates pass without
  lowering thresholds (see above). Next, replace the compatible quality surface with `required-quality.yml`
  pinned to the latest released SHA. Existing build-artifact and manual URL
  selection behavior still needs to be retained alongside that caller.
- **Shared platform owner:** done. Changesets publishing via OIDC works on
  Ubicloud, and v1.10.0 provides `post-publish-command`; `release.yml` uses
  both.
- **Shared platform owner:** assess whether at least two consumers need the
  artifact hand-off and dispatch-selected generation interface. If supported
  centrally later, remove those bespoke portions rather than keeping this
  document as an exception in perpetuity. Repository-specific contract and
  schema checks remain consumer checks, not deploy orchestrators.

When this document was written, no released entrypoint could be adopted
without either adding already-failing mandatory gates or losing
publishing/artifact semantics. The quality gates now pass locally. The
repository still has **zero shared workflow callers**; this is not a completed
shared workflow migration. It does not claim to address Cloudflare, Phala, or Modal
platform coverage; those belong to their owning central-platform workstream.

The existing default-branch Release run already fails its post-publish verifier:
[Release on October 23, 2026](https://github.com/burnt-labs/xion.js/actions/runs/39986801030)
reports seven local package versions absent from npm. This migration neither
retries publishing nor removes that blocking verifier.

## Retained branch follow-ups

A fresh complete branch-name listing has no `release/*` branches. Two older
release-related refs remain and were inspected without modification:

- `mainnet` at `d89f3ab64a76dd3d8cf930ea5d12bce776fe3cc8`
  (last commit July 9, 2024).
- `changeset-release/twice/release_as_burnt_user` at
  `eb0e027409f42044907b58db0acbed7368e38dda`
  (last commit June 25, 2024).

Each contains `ci.yml` and `release.yml` using `${{ matrix.os }}` with a
single `ubuntu-latest` OS, Node `lts/*`, and its existing pnpm-version matrix.
Neither contains Depot labels. They are not called by default-branch workflows.
The owner should decide whether these old release paths are still supported
before a separate backport or retirement; keep their matrices and publication
semantics intact if backported. No edits or direct pushes to those branches
are included here. Feature branches remain outside this migration's scope.

## Verification boundary

The runner regression tests reject non-Ubicloud direct jobs except the precise
hosted release exception. A baseline/head YAML structural comparison verifies
all other workflow semantics, including triggers and publication, unchanged;
a byte comparison permits only the recorded headers and runner scalars.
Actionlint is compared against the original branch, with custom Ubicloud labels
recognized. Existing diagnostics are not disguised as newly introduced failures.

Static checks and local package commands do not prove provisioning or successful
CI on the provider. Normal PR-triggered checks are reported separately. There
are no approval bypasses, settings changes, plan upgrades, merges, deploys, or
manual release tests in this migration.
