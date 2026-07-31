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
 *     each local package.json must exist on npm. Catches "release ran
 *     but one package silently failed to publish".
 *
 * Zero runtime dependencies (raw fetch + inline semver) so it can run in
 * CI before/without pnpm install.
 *
 * Usage:
 *   node scripts/verify-npm-dependency-train.mjs
 *   node scripts/verify-npm-dependency-train.mjs --require-local-published
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REGISTRY = "https://registry.npmjs.org";
const SCOPE = "@burnt-labs/";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const requireLocalPublished = process.argv.includes(
  "--require-local-published",
);

/* ---------------- minimal semver (SemVer 2.0.0 precedence) ------------- */

const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/;

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
 * Can `range` be satisfied by at least one of `published`?
 * Internal deps are pinned exactly by changesets, so the common case is an
 * exact match. For `^`/`~` ranges we accept any published version with the
 * same major (for `^`) / same major+minor (for `~`) that is >= the base.
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
  const candidates = published.filter((v) => {
    const mv = v.match(SEMVER_RE);
    if (!mv) return false;
    if (+mv[1] !== +mb[1]) return false;
    if (prefix === "~" && +mv[2] !== +mb[2]) return false;
    return cmpSemver(v, base) >= 0;
  });
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
      failures.push(`${local.name}: package not found on npm at all`);
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
    process.exit(1);
  }

  console.log("\n✅ npm dependency train is consistent — all published");
  console.log("   @burnt-labs/* dependencies resolve to published versions.");
}

main().catch((err) => {
  console.error(`verify-npm-dependency-train: ${err.message}`);
  process.exit(1);
});
