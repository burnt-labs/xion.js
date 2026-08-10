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
  assert.match(workflow, /permissions:\n\s+contents: read\n\s+issues: write/);
});

test("integration result comments skip GitHub Actions release pull requests", () => {
  assert.match(
    workflow,
    /github\.event\.pull_request\.user\.login != 'github-actions\[bot\]'/,
  );
});
