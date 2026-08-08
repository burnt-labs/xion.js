# Fix PR #381 integration CI

## Goal

Make PR #381's integration checks reflect test outcomes for fork pull requests and remove the live-test race between account creation and grant creation.

## Plan

1. Restrict the integration-results comment step to pull requests whose head repository is `burnt-labs/xion.js`.
2. Add workflow regression coverage proving fork PRs skip comment writes while same-repository PRs retain them.
3. Identify the account-creation boundary before grant creation and wait for the new account to become queryable there, with a bounded, narrowly classified readiness check.
4. Add focused tests for delayed account visibility and terminal non-readiness.
5. Run the focused unit/integration support tests plus workflow validation, commit the changes, and push them to PR #381's existing head branch.
