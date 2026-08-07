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

test("release commits and tags use GitHub's signed API mode", () => {
  assert.match(workflow, /^\s+commitMode: github-api$/m);
});

test("release workflow has no private signing key dependency", () => {
  assert.doesNotMatch(workflow, /SSH_SIGNING_PK/);
  assert.doesNotMatch(workflow, /commit\.gpgsign/);
  assert.doesNotMatch(workflow, /user\.signingkey/);
});
