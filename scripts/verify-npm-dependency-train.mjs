#!/usr/bin/env node
/**
 * Verify the published "@burnt-labs dependency train" on npm.
 *
 * Guards against the failure mode of 2026-06-11 (release run for #384):
 * changesets published @burnt-labs/abstraxion-react-native@1.0.0-alpha.21
 * (which pins @burnt-labs/abstraxion-js@1.0.0-alpha.2) but the publish of
 * abstraxion-js itself failed with ENEEDAUTH — leaving the package at
 * dist-tag `latest` uninstallable because its dependency does not exist
 * on the registry. npm publishes are not transactional, so a partial
 * publish cannot be prevented — but it CAN be detected loudly.
 *
 * Checks performed:
 *  1. Registry consistency ("the train"): for every public workspace
 *     package, for each of its dist-tags on npm, every `@burnt-labs/*`
 *     dependency (deps + peerDeps) of that published version must
 *     resolve to a version that actually exists on the registry.
 *  2. With --require-local-published (post-release gate): the version in
 *     each local package.json must exist on npm, and a package that has
 *     never been published at all is a failure rather than a note.
 *     Catches "release ran but one package silently failed to publish".
 *
 * Check 1 reads immutable npm history, so a partial publish that is still
 * live makes it fail for reasons no individual PR can fix. It is therefore a
 * hard gate only on release; on PRs it reports without blocking (see
 * .github/workflows/dependency-validation.yml).
 *
 * Zero runtime dependencies (raw fetch + inline semver) so it can run in
 * CI before/without pnpm install — which is also why its unit tests run on
 * node:test rather than vitest (see scripts/__tests__).
 *
 * Usage:
 *   node scripts/verify-npm-dependency-train.mjs
 *   node scripts/verify-npm-dependency-train.mjs --require-local-published
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REGISTRY = "https://registry.npmjs.org";
const SCOPE = "@burnt-labs/";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const requireLocalPublished = process.argv.includes(
  "--require-local-published",
);

/* ---------------- minimal semver (SemVer 2.0.0 precedence) ------------- */

const SEMVER_RE =
  /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

function cmpSemver(a, b) {
  const ma = a.match(SEMVER_RE);
  const mb = b.match(SEMVER_RE);
  if (!ma || !mb) return a < b ? -1 : a > b ? 1 : 0;
  for (let i = 1; i <= 3; i++) {
    const d = +ma[i] - +mb[i];
    if (d !== 0) return d;
  }
  const pa = ma[4];
  const pb = mb[4];
  if (!pa && !pb) return 0;
  if (!pa) return 1; // release > prerelease
  if (!pb) return -1;
  const ia = pa.split(".");
  const ib = pb.split(".");
  for (let i = 0; i < Math.max(ia.length, ib.length); i++) {
    const x = ia[i];
    const y = ib[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const xn = /^\d+$/.test(x);
    const yn = /^\d+$/.test(y);
    if (xn && yn) {
      const d = +x - +y;
      if (d !== 0) return d;
    } else if (xn) return -1;
    else if (yn) return 1;
    else if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

/**
 * Does version `v` fall inside the `^`/`~` range anchored at `base`?
 *
 * Real npm semantics, not "same major and >=". Three rules the naive version
 * got wrong, each of which silently passes a broken train:
 *
 *  - `^` on a 0.x base is minor-locked: `^0.1.0` allows `0.1.9` but NOT
 *    `0.2.0`. Below 1.0.0 the minor is the breaking-change axis.
 *  - `^0.0.x` is patch-locked — the whole version is the breaking axis.
 *  - A prerelease base only admits prereleases of the *same* `[maj,min,pat]`
 *    tuple. `^1.0.0-alpha.2` must not be satisfied by `1.5.0`: npm will not
 *    install it, so accepting it here reports a train that does not resolve.
 *    (It IS satisfied by `1.0.0` itself and by later `1.0.0-*` prereleases.)
 *
 * @param v - a concrete published version
 * @param base - the range's anchor version
 * @param mb - `base` pre-matched against SEMVER_RE
 * @param prefix - "^" or "~"
 */
function inRange(v, base, mb, prefix) {
  const mv = v.match(SEMVER_RE);
  if (!mv) return false;

  const [major, minor, patch] = [+mb[1], +mb[2], +mb[3]];
  const basePre = mb[4];
  const versionPre = mv[4];

  // A prerelease anchor never reaches past its own release tuple.
  if (basePre) {
    if (+mv[1] !== major || +mv[2] !== minor || +mv[3] !== patch) return false;
    return cmpSemver(v, base) >= 0;
  }

  // A prerelease version never satisfies a non-prerelease anchor: npm only
  // matches prereleases when the range itself names that same tuple.
  if (versionPre) return false;

  if (+mv[1] !== major) return false;

  if (prefix === "~") {
    // ~x.y.z → >=x.y.z <x.(y+1).0
    if (+mv[2] !== minor) return false;
  } else if (major === 0) {
    // ^0.y.z → >=0.y.z <0.(y+1).0 ; ^0.0.z → exactly 0.0.z
    if (+mv[2] !== minor) return false;
    if (minor === 0 && +mv[3] !== patch) return false;
  }

  return cmpSemver(v, base) >= 0;
}

/**
 * Can `range` be satisfied by at least one of `published`?
 * Internal deps are pinned exactly by changesets, so the common case is an
 * exact match. `^`/`~` ranges are resolved with {@link inRange}.
 * Anything more exotic (workspace:, ||, >=) fails loudly so a human looks.
 */
function rangeSatisfiable(range, published) {
  const r = range.trim();
  if (r.startsWith("workspace:")) {
    // A workspace: protocol range in a PUBLISHED manifest is always a bug —
    // it means the publish tooling did not rewrite it.
    return { ok: false, reason: "unrewritten workspace: protocol" };
  }
  const prefix = r[0] === "^" || r[0] === "~" ? r[0] : "";
  const base = prefix ? r.slice(1) : r;
  const mb = base.match(SEMVER_RE);
  if (!mb || /[\s|<>=*x]/.test(base)) {
    return { ok: false, reason: `unsupported range syntax "${r}"` };
  }
  if (published.includes(base)) return { ok: true };
  if (!prefix) return { ok: false, reason: `version ${base} not on npm` };
  const candidates = published.filter((v) => inRange(v, base, mb, prefix));
  if (candidates.length > 0) return { ok: true, viaRange: true };
  return { ok: false, reason: `no published version satisfies ${r}` };
}

/* ---------------------------- registry I/O ----------------------------- */

const packumentCache = new Map();

async function fetchPackument(name) {
  if (packumentCache.has(name)) return packumentCache.get(name);
  const res = await fetch(`${REGISTRY}/${name.replace("/", "%2F")}`, {
    headers: { accept: "application/json" },
  });
  if (res.status === 404) {
    packumentCache.set(name, null);
    return null;
  }
  if (!res.ok) {
    throw new Error(`registry returned ${res.status} for ${name}`);
  }
  const doc = await res.json();
  packumentCache.set(name, doc);
  return doc;
}

/* ------------------------------- main ---------------------------------- */

function loadWorkspacePackages() {
  const pkgsDir = join(ROOT, "packages");
  return readdirSync(pkgsDir)
    .map((d) => join(pkgsDir, d, "package.json"))
    .filter((f) => existsSync(f))
    .map((f) => JSON.parse(readFileSync(f, "utf8")))
    .filter((p) => !p.private && p.name?.startsWith(SCOPE));
}

async function main() {
  const failures = [];
  const notes = [];
  const workspacePkgs = loadWorkspacePackages();

  console.log(
    `Checking npm dependency train for ${workspacePkgs.length} public packages…\n`,
  );

  for (const local of workspacePkgs) {
    const doc = await fetchPackument(local.name);
    if (!doc) {
      // A package that has never been published is the normal state of a
      // newly added workspace package, and there is nothing a PR can do about
      // it — failing here would make every unrelated PR red until the first
      // release, which is a chicken-and-egg the author cannot break. It only
      // becomes a failure on the post-release gate, where "never published"
      // really does mean the release did not do its job.
      const message = `${local.name}: package not found on npm at all`;
      if (requireLocalPublished) failures.push(message);
      else notes.push(`${message} (new package — expected before first release)`);
      continue;
    }
    const publishedVersions = Object.keys(doc.versions ?? {});

    // Check 2: post-release gate — local version must be on npm.
    if (requireLocalPublished && !publishedVersions.includes(local.version)) {
      failures.push(
        `${local.name}: local version ${local.version} is NOT published on npm ` +
          `(highest published: ${publishedVersions.sort(cmpSemver).at(-1) ?? "none"})`,
      );
    }

    // Check 1: every dist-tagged version must have a resolvable internal train.
    for (const [tag, version] of Object.entries(doc["dist-tags"] ?? {})) {
      const manifest = doc.versions?.[version];
      if (!manifest) {
        failures.push(
          `${local.name}: dist-tag "${tag}" points at ${version}, which has no manifest`,
        );
        continue;
      }
      const internalDeps = Object.entries({
        ...(manifest.dependencies ?? {}),
        ...(manifest.peerDependencies ?? {}),
      }).filter(([dep]) => dep.startsWith(SCOPE));

      for (const [dep, range] of internalDeps) {
        const depDoc = await fetchPackument(dep);
        if (!depDoc) {
          failures.push(
            `${local.name}@${version} (tag: ${tag}) depends on ${dep}@${range}, ` +
              `but ${dep} does not exist on npm`,
          );
          continue;
        }
        const verdict = rangeSatisfiable(
          range,
          Object.keys(depDoc.versions ?? {}),
        );
        if (!verdict.ok) {
          failures.push(
            `${local.name}@${version} (tag: ${tag}) depends on ${dep}@${range} — ${verdict.reason}. ` +
              `Installing ${local.name}@${tag} will FAIL.`,
          );
        } else if (verdict.viaRange) {
          notes.push(
            `${local.name}@${version} (tag: ${tag}): ${dep}@${range} satisfiable only via range, not exact pin`,
          );
        }
      }
      console.log(
        `  ${local.name}@${version} [${tag}]: ${internalDeps.length} internal dep(s) checked`,
      );
    }
  }

  if (notes.length) {
    console.log("\nNotes:");
    for (const n of notes) console.log(`  ℹ️  ${n}`);
  }

  if (failures.length) {
    console.error("\n❌ npm dependency train is BROKEN:\n");
    for (const f of failures) console.error(`  • ${f}`);
    console.error(
      "\nA published package references a version that was never published " +
        "(usually a partial changesets publish — check the Release workflow " +
        "logs for per-package publish errors such as ENEEDAUTH). " +
        "Fix npm auth/trusted-publishing for the failing package(s) and " +
        "re-run the Release workflow; changesets will publish only the " +
        "missing versions.",
    );
    // Not process.exit(1): that tears the process down before piped stdout has
    // necessarily flushed, and in CI the log is piped — the run would go red
    // with a truncated explanation of why.
    process.exitCode = 1;
    return;
  }

  console.log("\n✅ npm dependency train is consistent — all published");
  console.log("   @burnt-labs/* dependencies resolve to published versions.");
}

/**
 * Only run when executed directly — importing this module (from its tests)
 * must not fire off a full registry sweep.
 */
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((err) => {
    console.error(`verify-npm-dependency-train: ${err.message}`);
    process.exitCode = 1;
  });
}

export { cmpSemver, inRange, rangeSatisfiable };
