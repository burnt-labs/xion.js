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
 * Note: DaoDAO Indexer response schemas are not typed in the OpenAPI spec (only paths/params).
 * Response body types live in signers/src/types/generated/daodao-indexer.ts as manual interfaces.
 * When the indexer adds response schemas, they will automatically appear in the generated file.
 */

import { execSync } from "child_process";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DAODAO_INDEXER_URLS: Record<string, string> = {
  testnet: "https://daodaoindexer.burnt.com",
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
  const command = `npx --yes openapi-typescript "${schemaPath}" -o "${outputFile}"`;
  execSync(command, {
    stdio: "inherit",
    cwd: path.join(__dirname, ".."),
  });
  console.log(`Types generated: ${outputFile}`);
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
    `\nNote: Response body types are in signers/src/types/generated/daodao-indexer.ts`,
  );
  console.log(
    `   Once the indexer adds response schemas, they will auto-appear in the generated file.`,
  );
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
