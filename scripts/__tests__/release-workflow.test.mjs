import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const workflow = readFileSync(
  join(root, ".github/workflows/release.yml"),
  "utf8",
);

test("release calls the shared Changesets flow pinned to a commit", () => {
  assert.match(
    workflow,
    /^\s+uses: burnt-labs\/github-workflows\/\.github\/workflows\/npm-changesets\.yml@[0-9a-f]{40} # v\d+\.\d+\.\d+$/m,
  );
});

test("release grants what the shared flow needs to publish via OIDC", () => {
  assert.match(workflow, /^\s+id-token: write$/m);
  assert.match(workflow, /^\s+contents: write$/m);
  assert.match(workflow, /^\s+pull-requests: write$/m);
});

test("release keeps the package scripts and dependency-train check", () => {
  assert.match(workflow, /^\s+version-command: pnpm version:packages$/m);
  assert.match(workflow, /^\s+publish-command: pnpm publish:packages$/m);
  assert.match(
    workflow,
    /^\s+post-publish-command: node scripts\/verify-npm-dependency-train\.mjs --require-local-published$/m,
  );
});

test("release carries no npm token or private signing key", () => {
  assert.doesNotMatch(workflow, /NPM_TOKEN|NODE_AUTH_TOKEN/);
  assert.doesNotMatch(workflow, /SSH_SIGNING_PK/);
  assert.doesNotMatch(workflow, /commit\.gpgsign/);
  assert.doesNotMatch(workflow, /user\.signingkey/);
});
