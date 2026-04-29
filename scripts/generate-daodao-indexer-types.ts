#!/usr/bin/env tsx
/**
 * Generate TypeScript path types from DaoDAO Indexer OpenAPI schema
 *
 * Usage:
 *   pnpm tsx scripts/generate-daodao-indexer-types.ts [testnet|local|custom-url]
 *
 * This script:
 * 1. Fetches OpenAPI schema from DaoDAO Indexer endpoint (or uses local build)
 * 2. Generates TypeScript path types using openapi-typescript
 * 3. Writes to packages/signers/src/types/generated/
 * Response body types are derived from the generated operations in daodao-indexer-api.ts.
 */

import { execSync } from "child_process";
import { writeFile, readFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chain ID prefix is required by the Cloudflare routing layer in front of Argus.
// The static /openapi.json file is served after the chain prefix is stripped.
const DAODAO_INDEXER_URLS: Record<string, string> = {
  testnet: "https://daodaoindexer.burnt.com/xion-testnet-2",
  local: "http://localhost:3420",
};

const OUTPUT_DIR = path.join(
  __dirname,
  "../packages/signers/src/types/generated",
);
const GENERATED_FILE = path.join(OUTPUT_DIR, "daodao-indexer-api.generated.ts");
const METADATA_FILE = path.join(OUTPUT_DIR, "daodao-indexer-metadata.json");

async function fetchSchema(baseUrl: string): Promise<unknown> {
  const schemaUrl = `${baseUrl}/openapi.json`;
  console.log(`Fetching DaoDAO Indexer OpenAPI schema from ${schemaUrl}...`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(schemaUrl, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Failed: ${response.status} ${response.statusText}`);
    }
    const schema = await response.json();
    console.log(`Schema fetched (${JSON.stringify(schema).length} bytes)`);
    console.log(`   Title: ${(schema as any).info?.title || "unknown"}`);
    console.log(`   Paths: ${Object.keys((schema as any).paths || {}).length}`);
    return schema;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function generateTypes(
  schemaPath: string,
  outputFile: string,
): Promise<void> {
  console.log(`Generating TypeScript path types with openapi-typescript...`);
  const command = `pnpm exec openapi-typescript "${schemaPath}" -o "${outputFile}"`;
  execSync(command, {
    stdio: "inherit",
    cwd: path.join(__dirname, ".."),
  });
  console.log(`Types generated: ${outputFile}`);
}

/**
 * Post-process a generated TypeScript file to rename duplicate property keys.
 *
 * openapi-typescript hashes operation keys from the path, which can produce
 * collisions when two operations share a path but differ only in query params
 * (e.g. startAfter vs startBefore variants).  TypeScript rejects duplicate keys
 * in an interface/object type, so we rename later occurrences by appending a
 * numeric suffix (_2, _3, …) to make them unique.
 */
async function deduplicateOperationKeys(outputFile: string): Promise<void> {
  const src = await readFile(outputFile, "utf-8");
  const lines = src.split("\n");

  // Pre-scan: identify which operation keys appear more than once so we know
  // which paths references need updating.
  const definitionCount = new Map<string, number>();
  for (const line of lines) {
    const match = line.match(/^    ([A-Za-z_][A-Za-z0-9_]*): \{/);
    if (match) {
      const key = match[1];
      definitionCount.set(key, (definitionCount.get(key) ?? 0) + 1);
    }
  }
  const duplicateKeys = new Set(
    [...definitionCount.entries()]
      .filter(([, count]) => count > 1)
      .map(([key]) => key),
  );

  if (duplicateKeys.size === 0) return;

  // Main pass: rename duplicate operation key definitions AND update the
  // corresponding operations["key"] references in the paths interface so they
  // point at the correctly-suffixed variant.
  const defSeen = new Map<string, number>();
  const refSeen = new Map<string, number>();
  const out: string[] = [];

  for (const line of lines) {
    // Match a top-level property key definition: "    someKey: {"
    const defMatch = line.match(/^    ([A-Za-z_][A-Za-z0-9_]*): \{/);
    if (defMatch && duplicateKeys.has(defMatch[1])) {
      const key = defMatch[1];
      const count = (defSeen.get(key) ?? 0) + 1;
      defSeen.set(key, count);
      if (count > 1) {
        out.push(line.replace(`    ${key}: {`, `    ${key}_${count}: {`));
      } else {
        out.push(line);
      }
      continue;
    }

    // Update operations["key"] references for duplicate keys.
    let updatedLine = line;
    for (const key of duplicateKeys) {
      if (updatedLine.includes(`operations["${key}"]`)) {
        const count = (refSeen.get(key) ?? 0) + 1;
        refSeen.set(key, count);
        if (count > 1) {
          updatedLine = updatedLine.replace(
            `operations["${key}"]`,
            `operations["${key}_${count}"]`,
          );
        }
        break;
      }
    }
    out.push(updatedLine);
  }

  const deduped = out.join("\n");
  if (deduped !== src) {
    await writeFile(outputFile, deduped, "utf-8");
    console.log(`Deduplicated operation keys in: ${outputFile}`);
  }
}

async function main() {
  const targetEnv = process.argv[2] || "testnet";
  const baseUrl = DAODAO_INDEXER_URLS[targetEnv] ?? targetEnv;

  console.log(`Generating DaoDAO Indexer types for: ${targetEnv}`);
  console.log(`Base URL: ${baseUrl}\n`);

  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true });
  }

  const schema = await fetchSchema(baseUrl);

  // Write temp schema file for openapi-typescript
  const tempFile = path.join(__dirname, "../temp-daodao-indexer-schema.json");
  await writeFile(tempFile, JSON.stringify(schema, null, 2), "utf-8");

  try {
    await generateTypes(tempFile, GENERATED_FILE);
    await deduplicateOperationKeys(GENERATED_FILE);
  } finally {
    if (existsSync(tempFile)) {
      const { unlinkSync } = await import("fs");
      unlinkSync(tempFile);
    }
  }

  // Write metadata
  const meta = {
    generated_at: new Date().toISOString(),
    schema_title: (schema as any).info?.title || "DAO DAO API",
    schema_version: (schema as any).info?.version || "unknown",
    schema_url: `${baseUrl}/openapi.json`,
    path_count: Object.keys((schema as any).paths || {}).length,
    source_env: targetEnv,
  };
  await writeFile(METADATA_FILE, JSON.stringify(meta, null, 2), "utf-8");
  console.log(`Metadata written`);

  console.log(`\nDone! Files updated:`);
  console.log(`   - ${GENERATED_FILE}`);
  console.log(`   - ${METADATA_FILE}`);
  console.log(
    `\nNote: Response type aliases are derived from operations in daodao-indexer-api.ts`,
  );
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
