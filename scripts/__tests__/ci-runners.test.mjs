import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

const workflows = new URL("../../.github/workflows/", import.meta.url);
const files = readdirSync(workflows).filter((file) => /\.ya?ml$/.test(file));

for (const file of files) {
  test(`${file}: runner policy preserves the hosted npm exception`, () => {
    const source = readFileSync(new URL(file, workflows), "utf8");
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
