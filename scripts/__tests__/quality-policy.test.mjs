import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const source = readFileSync(join(root, ".github/quality-policy.jsonc"), "utf8");

// Minimal JSONC reader (no dependencies: these tests run before install).
// Drops // and /* */ comments outside strings, then trailing commas.
function parseJsonc(text) {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      let j = i + 1;
      while (text[j] !== '"') j += text[j] === "\\" ? 2 : 1;
      out += text.slice(i, j + 1);
      i = j;
    } else if (c === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i++;
      out += "\n";
    } else if (c === "/" && text[i + 1] === "*") {
      i = text.indexOf("*/", i + 2) + 1;
    } else {
      out += c;
    }
  }
  return JSON.parse(out.replace(/,(\s*[}\]])/g, "$1"));
}

const policy = parseJsonc(source);

test("quality policy parses and declares the schema and working directory", () => {
  assert.equal(policy.schemaVersion, 1);
  assert.equal(typeof policy.workingDirectory, "string");
});

test("quality policy declares every mandatory gate command", () => {
  for (const gate of [
    "install",
    "lint",
    "prettier",
    "typeCheck",
    "test",
    "coverage",
    "build",
  ]) {
    assert.equal(typeof policy.commands[gate], "string", `commands.${gate}`);
    assert.notEqual(policy.commands[gate].trim(), "", `commands.${gate}`);
  }
});

test("quality policy declares numeric coverage thresholds", () => {
  for (const key of ["lines", "functions", "branches"]) {
    assert.equal(typeof policy.coverageThresholds[key], "number", key);
  }
});

test("release builds with regenerated AA API types", () => {
  assert.match(policy.commands.build, /^pnpm generate:types && pnpm build$/);
});
