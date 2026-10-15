import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(
  new URL("../../.github/workflows/integration-tests.yml", import.meta.url),
  "utf8",
);

test("integration result comments are limited to same-repository pull requests", () => {
  assert.match(
    workflow,
    /github\.event\.pull_request\.head\.repo\.full_name == github\.repository/,
  );
  // The results comment targets a pull request, so the suite job needs
  // `pull-requests: write`; `issues: write` alone is refused with a 403.
  const suiteJob = workflow.match(
    /\n  integration-suite:\n[\s\S]*?(?=\n  [a-z][\w-]*:\n|$)/,
  );
  assert.ok(suiteJob, "integration-suite job not found");
  const permissions = suiteJob[0].match(
    /\n    permissions:\n((?:      .*\n|\s*#.*\n)+)/,
  );
  assert.ok(permissions, "integration-suite job declares no permissions");
  assert.match(permissions[1], /^\s+contents: read$/m);
  assert.match(permissions[1], /^\s+pull-requests: write$/m);
  assert.doesNotMatch(permissions[1], /^\s+issues: write$/m);
});

test("integration result comments skip GitHub Actions release pull requests", () => {
  assert.match(
    workflow,
    /github\.event\.pull_request\.user\.login != 'github-actions\[bot\]'/,
  );
});
