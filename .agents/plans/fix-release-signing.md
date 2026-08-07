# Fix release commit signing

## Failure

Release run `31218574669` configured Git to sign the Changesets version commit
with `SSH_SIGNING_PK`, but the repository has no Actions secret with that name.
Git therefore attempted to load an empty `/tmp/.git_signing_key` and the release
failed before Changesets could create its pull request.

## Plan

1. Remove the custom SSH signing step and its undeclared secret dependency.
2. Configure `changesets/action` to create commits and tags through the GitHub
   API, which signs them with GitHub's GPG key.
3. Add a workflow regression test that requires API commit mode and rejects the
   removed secret-based signing configuration.
4. Run the script tests, formatting check, and `actionlint` before publishing a
   draft pull request.
