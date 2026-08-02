/**
 * Unit tests for the npm dependency-train verifier's semver core.
 *
 * Run with node:test rather than vitest deliberately: the script under test
 * is zero-dependency so it can run in CI *before* `pnpm install`, and a test
 * that needed the workspace installed to run would quietly undo that.
 *
 *   node --test scripts/__tests__/
 *
 * The cases here are the ones that matter for this repo: everything internal
 * is on 0.x or 1.0.0-alpha.N, which is exactly where naive caret matching is
 * wrong in the dangerous direction — it reports a train as resolvable when
 * npm would refuse to install it.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  cmpSemver,
  rangeSatisfiable,
} from "../verify-npm-dependency-train.mjs";

/** `rangeSatisfiable(...).ok` — the only bit most cases care about. */
function satisfied(range, published) {
  return rangeSatisfiable(range, published).ok;
}

test("cmpSemver: orders by major, minor, patch", () => {
  assert.ok(cmpSemver("1.0.0", "0.9.9") > 0);
  assert.ok(cmpSemver("0.2.0", "0.10.0") < 0);
  assert.ok(cmpSemver("1.0.1", "1.0.0") > 0);
  assert.equal(cmpSemver("1.2.3", "1.2.3"), 0);
});

test("cmpSemver: a release outranks its own prereleases", () => {
  assert.ok(cmpSemver("1.0.0", "1.0.0-alpha.1") > 0);
  assert.ok(cmpSemver("1.0.0-alpha.1", "1.0.0") < 0);
});

test("cmpSemver: prerelease identifiers compare numerically, not as strings", () => {
  // The bug this guards: "alpha.10" < "alpha.9" under string comparison.
  assert.ok(cmpSemver("1.0.0-alpha.10", "1.0.0-alpha.9") > 0);
  assert.ok(cmpSemver("1.0.0-alpha.2", "1.0.0-alpha.21") < 0);
});

test("cmpSemver: numeric identifiers sort below alphanumeric ones", () => {
  assert.ok(cmpSemver("1.0.0-1", "1.0.0-alpha") < 0);
  assert.ok(cmpSemver("1.0.0-alpha", "1.0.0-beta") < 0);
});

test("cmpSemver: a shorter prerelease chain sorts first", () => {
  assert.ok(cmpSemver("1.0.0-alpha", "1.0.0-alpha.1") < 0);
});

test("exact pins match only themselves", () => {
  assert.ok(satisfied("1.0.0-alpha.2", ["1.0.0-alpha.1", "1.0.0-alpha.2"]));
  assert.ok(!satisfied("1.0.0-alpha.3", ["1.0.0-alpha.1", "1.0.0-alpha.2"]));
  assert.equal(
    rangeSatisfiable("1.0.0-alpha.3", ["1.0.0-alpha.2"]).reason,
    "version 1.0.0-alpha.3 not on npm",
  );
});

test("caret on 0.x is minor-locked", () => {
  // The headline regression: 0.2.0 is a breaking release relative to ^0.1.0.
  assert.ok(!satisfied("^0.1.0-alpha.24", ["0.2.0"]));
  assert.ok(!satisfied("^0.1.0", ["0.2.0", "0.3.1"]));
  assert.ok(satisfied("^0.1.0", ["0.1.5"]));
  assert.ok(!satisfied("^0.1.5", ["0.1.2"]), "must still respect >= base");
});

test("caret on 0.0.x is patch-locked", () => {
  assert.ok(!satisfied("^0.0.1", ["0.0.2"]));
  assert.ok(satisfied("^0.0.1", ["0.0.1"]));
});

test("caret on >=1.x allows the rest of the major", () => {
  assert.ok(satisfied("^1.2.0", ["1.5.0"]));
  assert.ok(!satisfied("^1.2.0", ["2.0.0"]));
  assert.ok(!satisfied("^1.2.0", ["1.1.9"]));
});

test("a prerelease range never reaches past its own release tuple", () => {
  // npm will not install 1.5.0 for ^1.0.0-alpha.2, so neither may we claim it.
  assert.ok(!satisfied("^1.0.0-alpha.2", ["1.5.0"]));
  assert.ok(!satisfied("^1.0.0-alpha.2", ["1.0.1"]));
  // ...but later prereleases of the same tuple, and the tuple's own release, do.
  assert.ok(satisfied("^1.0.0-alpha.2", ["1.0.0-alpha.30"]));
  assert.ok(satisfied("^1.0.0-alpha.2", ["1.0.0"]));
  assert.ok(!satisfied("^1.0.0-alpha.30", ["1.0.0-alpha.2"]));
});

test("a prerelease never satisfies a release range", () => {
  // 1.1.0-alpha.1 is NOT a valid install for ^1.0.0 under npm's rules.
  assert.ok(!satisfied("^1.0.0", ["1.1.0-alpha.1"]));
  assert.ok(satisfied("^1.0.0", ["1.1.0-alpha.1", "1.1.0"]));
});

test("tilde is minor-locked on every major", () => {
  assert.ok(satisfied("~1.2.0", ["1.2.9"]));
  assert.ok(!satisfied("~1.2.0", ["1.3.0"]));
  assert.ok(!satisfied("~0.1.0", ["0.2.0"]));
});

test("an unrewritten workspace: protocol is always a failure", () => {
  const verdict = rangeSatisfiable("workspace:*", ["1.0.0"]);
  assert.equal(verdict.ok, false);
  assert.match(verdict.reason, /unrewritten workspace/);
});

test("exotic range syntax fails loudly rather than guessing", () => {
  for (const range of [">=1.0.0", "1.x", "*", "1.0.0 || 2.0.0"]) {
    const verdict = rangeSatisfiable(range, ["1.0.0", "2.0.0"]);
    assert.equal(verdict.ok, false, `${range} should not be accepted`);
    assert.match(verdict.reason, /unsupported range syntax/);
  }
});

test("range matches are reported as range matches, exact pins are not", () => {
  assert.equal(rangeSatisfiable("^1.0.0", ["1.0.0"]).viaRange, undefined);
  assert.equal(rangeSatisfiable("^1.0.0", ["1.2.0"]).viaRange, true);
});
