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
- `release.yml` retains `ubuntu-latest`, as explained below.

The [official Ubicloud runner table](https://www.ubicloud.com/docs/github-actions-integration/runner-types)
lists these x64 Ubuntu labels. No architecture, runtime, cache key, lockfile,
package-manager pin, action version, trigger, permission, secret, environment,
artifact name/path/retention, job dependency, or advisory/blocking rule changes.
The only workflow edits are runner scalars and explanatory headers.

## npm publishing must stay hosted for now

[npm's supported-provider documentation](https://docs.npmjs.com/trusted-publishers/#supported-cicd-providers)
explicitly supports GitHub-hosted runners and excludes self-hosted runners.
Moving the existing OIDC Changesets publication job to Ubicloud would not
preserve its authentication contract. This migration does not substitute an npm
token or alter trusted-publisher configuration to work around that limitation.

Keep the `release.yml` filename, `id-token: write`, existing provenance behavior,
`pnpm publish:packages`, `pnpm version:packages`, signed
`commitMode: github-api`, and the always-run dependency-train verification after
publication failure or a successful publish. These are unchanged. No publish,
release, or manual workflow dispatch was exercised by this migration.

The released shared `npm-changesets.yml` correctly matches this repository's
multi-package versioning shape; the single-package tag-derived npm flows do
not. However, its release job runs on Ubicloud, and it has no equivalent to
this repository's always-run post-publish dependency-train verification, including
partial failures. Its configurable `publish-command` alone cannot reproduce
`always()` behavior if a command fails partway. Preserve the existing flow until
the runner compatibility and verification hook are resolved; do not trade
publishing correctness for a shared-flow badge.

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
command is a no-op.

## Shared quality adopted

`quality.yml` calls `required-quality.yml` from github-workflows v1.10.0, pinned
to `c7814463307c0e3d8025dca0e028cb3361e26c8e`, with the commands in
`.github/quality-policy.jsonc`:

| Gate       | Command                                |
| ---------- | -------------------------------------- |
| Install    | `pnpm install --frozen-lockfile`       |
| Lint       | `pnpm lint`                            |
| Prettier   | `pnpm format:check`                    |
| Type-check | `pnpm turbo run check-types`           |
| Test       | `pnpm test:scripts && pnpm test:unit`  |
| Coverage   | `pnpm test:coverage` (abstraxion-core) |
| Build      | `pnpm build`                           |

- The declared `coverageThresholds` (50/50/40) are the ones abstraxion-core's
  `vitest.config.ts` enforces. It is the only package that declares
  thresholds, so the coverage gate runs that package. Other packages'
  coverage is not gated; adding thresholds there is separate work.
- `test` and `test:coverage` depend on `^build` in `turbo.json`, like
  `check-types`, so each gate builds what it imports instead of relying on an
  earlier step.
- `format.yml` is removed. Its Prettier check is the shared Prettier gate.
  It also ran on pushes to `main`/`develop`; the shared gate runs on pull
  requests and the merge queue instead, because both branches' rulesets
  require a pull request, so changes reach them only that way.
- No `validate` command is declared. Dependency-train validation has to run
  before install, and the shared `validate` step runs after build (see the
  map below).
- The repository has no required status checks today. Requiring `Quality`
  (or registering the organization ruleset) is a settings change for the
  repository owner, not part of this change.

## Retained bespoke workflow map

Every workflow except the shared `quality.yml` caller carries a
sanctioned-bespoke header and links back here. These are the remaining concrete
differences, not claims of complete adoption:

| Workflow                               | Reason to retain the bespoke portion                                                                                                                                                                                                                  |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `unit-tests.yml`                       | Dispatch-selected AA API generation, build environment, and named build-artifact upload/download across two jobs. Shared quality exposes policy outputs, not build artifacts or these generation inputs.                                              |
| `integration-tests.yml`                | Five-job dependency graph, shared build artifact, live configuration/secrets, Playwright containers, and blocking testnet versus informational mainnet behavior.                                                                                      |
| `schema-validation.yml`                | Live schema generation with a dispatch-selected URL, generated-file diff, named artifact, PR comment, and failure on drift.                                                                                                                           |
| `daodao-indexer-schema-validation.yml` | Live indexer schema generation, dispatch-selected URL, named diff artifact, PR comment, and failure on drift.                                                                                                                                         |
| `dependency-validation.yml`            | Zero-dependency tests before install, live package/chain alignment checks, and PR-advisory versus release-blocking npm dependency-train semantics. The shared optional `validate` command is after install/build and does not preserve that sequence. |
| `dashboard-contract-validation.yml`    | HTTP shell contract checks with blocking testnet and advisory mainnet plus conditional result comments. These are repository-shaped checks, not npm/deployment flows.                                                                                 |
| `claude-code-review.yml`, `claude.yml` | Comment/issue/review event automation and its credential scope; no corresponding released shared entrypoint.                                                                                                                                          |
| `release.yml`                          | Hosted OIDC publishing exception and missing always-run post-publish verification hook, as above.                                                                                                                                                     |

Keep repository-specific contract/schema checks local as the platform guidance
allows. Revisit central Changesets after npm runner support and the
post-publish hook align.
Changes to the shared platform itself are outside this xion.js-only PR.

### Owning follow-ups and adoption conditions

- **Consumer quality owner:** done. `quality.yml` calls `required-quality.yml`
  (see "Shared quality adopted"). The build-artifact and manual URL selection
  behavior is retained in `unit-tests.yml` alongside it.
- **Shared platform owner:** support the hosted npm trusted-publishing boundary
  in the Changesets flow and an always-run post-publish verification command
  that executes on both partial publish failure and reported publication.
  Until both exist, replacing `release.yml` would break its current contract.
- **Shared platform owner:** assess whether at least two consumers need the
  artifact hand-off and dispatch-selected generation interface. If supported
  centrally later, remove those bespoke portions rather than keeping this
  document as an exception in perpetuity. Repository-specific contract and
  schema checks remain consumer checks, not deploy orchestrators.

The repository has **one shared workflow caller**, `quality.yml`. This is not a
completed shared workflow migration: releases and the other workflows above
remain bespoke. It does not claim to address Cloudflare, Phala, or Modal
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
