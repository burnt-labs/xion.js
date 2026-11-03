import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

const workflows = new URL("../../.github/workflows/", import.meta.url);
const files = readdirSync(workflows).filter((file) => /\.ya?ml$/.test(file));

for (const file of files) {
  test(`${file}: runner policy preserves the hosted npm exception`, () => {
    const source = readFileSync(new URL(file, workflows), "utf8");
    if (/^# Shared workflow caller:/.test(source)) {
      // Shared callers run no job of their own; the called workflow picks
      // its Ubicloud runners. Every call must be pinned to a full commit SHA
      // with a release comment so Dependabot can advance it.
      assert.equal((source.match(/^\s*runs-on:/gm) || []).length, 0);
      const calls = [...source.matchAll(/^\s*uses:\s*(\S+)(.*)$/gm)];
      assert.ok(calls.length > 0, `${file}: shared caller calls nothing`);
      for (const [, ref, comment] of calls) {
        assert.match(
          ref,
          /^burnt-labs\/github-workflows\/\.github\/workflows\/[\w-]+\.yml@[0-9a-f]{40}$/,
        );
        assert.match(comment, /^ # v\d+\.\d+\.\d+$/);
      }
      return;
    }
    assert.match(source, /^# Sanctioned bespoke:/);
    const labels = [...source.matchAll(/^\s*runs-on:\s*(\S[^\n]*)$/gm)];
    assert.equal(labels.length, (source.match(/^\s*runs-on:/gm) || []).length);
    if (file === "release.yml") {
      // npm trusted publishing does not support self-hosted runners.
      assert.deepEqual(
        labels.map(([, label]) => label),
        ["ubuntu-latest"],
      );
      return;
    }
    for (const [, label] of labels) {
      assert.match(
        label,
        /^ubicloud-standard-(2|4|8)$/,
        `${file}: unexpected runner ${label}; preserve architecture when extending CI`,
      );
    }
  });
}
