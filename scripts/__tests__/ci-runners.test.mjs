import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

const workflows = new URL("../../.github/workflows/", import.meta.url);
const files = readdirSync(workflows).filter((file) => /\.ya?ml$/.test(file));

for (const file of files) {
  test(`${file}: runs on Ubicloud or the shared workflows`, () => {
    const source = readFileSync(new URL(file, workflows), "utf8");
    const labels = [...source.matchAll(/^\s*runs-on:\s*(\S[^\n]*)$/gm)];
    assert.equal(labels.length, (source.match(/^\s*runs-on:/gm) || []).length);
    if (file === "release.yml") {
      // A thin caller of the shared Changesets flow, which picks its own
      // runners; it must not declare any.
      assert.equal(labels.length, 0);
      return;
    }
    assert.match(source, /^# Sanctioned bespoke:/);
    for (const [, label] of labels) {
      assert.match(
        label,
        /^ubicloud-standard-(2|4|8)$/,
        `${file}: unexpected runner ${label}; preserve architecture when extending CI`,
      );
    }
  });
}
