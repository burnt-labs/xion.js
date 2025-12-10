#!/usr/bin/env tsx
/**
 * Generate TypeScript types from AA API OpenAPI schema
 * 
 * Usage: 
 *   pnpm tsx scripts/generate-aa-api-types.ts [testnet|mainnet|custom-url]
 * 
 * This script:
 * 1. Fetches OpenAPI schema from AA API endpoint
 * 2. Generates TypeScript types using openapi-typescript
 * 3. Writes types to packages/signers/src/types/generated/api.ts
 */

import { execSync } from "child_process";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const AA_API_URLS = {
  testnet: "https://aa-api.xion-testnet-2.burnt.com",
  mainnet: "https://aa-api.xion-mainnet-1.burnt.com",
  local: "http://localhost:8787",
};

const OUTPUT_DIR = path.join(__dirname, "../packages/signers/src/types/generated");
const TYPES_FILE = path.join(OUTPUT_DIR, "api.generated.ts");
const METADATA_FILE = path.join(OUTPUT_DIR, "metadata.json");

interface SchemaInfo {
  version?: string;
  openapi?: string;
  info?: {
    version?: string;
    title?: string;
  };
}

/**
 * Fetch OpenAPI schema from AA API endpoint
 */
async function fetchSchema(baseUrl: string): Promise<any> {
  const schemaUrl = `${baseUrl}/openapi.json`;
  console.log(`📡 Fetching OpenAPI schema from ${schemaUrl}...`);
  
  const response = await fetch(schemaUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch schema: ${response.status} ${response.statusText}`);
  }
  
  const schema = await response.json();
  console.log(`✅ Schema fetched successfully`);
  console.log(`   Version: ${schema.info?.version || "unknown"}`);
  console.log(`   Title: ${schema.info?.title || "unknown"}`);
  
  return schema;
}

/**
 * Generate TypeScript types from OpenAPI schema using openapi-typescript
 */
async function generateTypes(schema: any, outputFile: string): Promise<void> {
  console.log(`🔨 Generating TypeScript types...`);
  
  // Write schema to temp file
  const tempSchemaFile = path.join(__dirname, "../temp-openapi-schema.json");
  await writeFile(tempSchemaFile, JSON.stringify(schema, null, 2), "utf-8");
  
  try {
    // Use openapi-typescript to generate types
    // Note: This requires openapi-typescript to be installed
    const command = `npx --yes openapi-typescript "${tempSchemaFile}" -o "${outputFile}"`;
    
    execSync(command, {
      stdio: "inherit",
      cwd: path.join(__dirname, ".."),
    });
    
    console.log(`✅ Types generated: ${outputFile}`);
  } catch (error) {
    // Fallback: Generate types manually from schema paths
    console.warn("⚠️  openapi-typescript not available, generating types manually...");
    await generateTypesManually(schema, outputFile);
  } finally {
    // Clean up temp file
    if (existsSync(tempSchemaFile)) {
      const { unlinkSync } = await import("fs");
      unlinkSync(tempSchemaFile);
    }
  }
}

/**
 * Manually generate types from OpenAPI schema paths
 * This is a fallback if openapi-typescript is not available
 */
async function generateTypesManually(schema: any, outputFile: string): Promise<void> {
  const types: string[] = [];
  types.push(`/**
 * AUTO-GENERATED TYPES FROM OPENAPI SCHEMA
 * 
 * DO NOT EDIT MANUALLY - Run 'pnpm generate:types' to regenerate
 * 
 * Generated from: ${schema.info?.title || "AA API"} v${schema.info?.version || "unknown"}
 * Generated at: ${new Date().toISOString()}
 */\n`);

  // Extract types from schema paths
  const paths = schema.paths || {};
  
  // Helper to convert OpenAPI schema to TypeScript type
  const schemaToType = (schemaObj: any, name: string): string => {
    if (!schemaObj) return "any";
    
    if (schemaObj.type === "string") return "string";
    if (schemaObj.type === "number") return "number";
    if (schemaObj.type === "integer") return "number";
    if (schemaObj.type === "boolean") return "boolean";
    if (schemaObj.type === "array") {
      const itemsType = schemaToType(schemaObj.items, `${name}Item`);
      return `${itemsType}[]`;
    }
    if (schemaObj.type === "object" || schemaObj.properties) {
      const props = schemaObj.properties || {};
      const required = schemaObj.required || [];
      const propTypes = Object.entries(props).map(([key, value]: [string, any]) => {
        const isOptional = !required.includes(key);
        const type = schemaToType(value, `${name}${key.charAt(0).toUpperCase() + key.slice(1)}`);
        return `  ${key}${isOptional ? "?" : ""}: ${type};`;
      });
      return `{\n${propTypes.join("\n")}\n}`;
    }
    
    return "any";
  };

  // Extract response types from paths
  const responseTypes = new Map<string, any>();
  
  for (const [pathKey, pathValue] of Object.entries(paths)) {
    const path = pathValue as any;
    for (const [method, operation] of Object.entries(path)) {
      if (method === "get" || method === "post") {
        const op = operation as any;
        
        // Extract response types
        if (op.responses?.["200"]?.content?.["application/json"]?.schema) {
          const schema = op.responses["200"].content["application/json"].schema;
          const typeName = pathKey.split("/").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "Response";
          const responseTypeName = `${typeName.charAt(0).toUpperCase() + typeName.slice(1)}Response`;
          
          if (!responseTypes.has(responseTypeName)) {
            responseTypes.set(responseTypeName, schema);
          }
        }
        
        // Extract request types
        if (op.requestBody?.content?.["application/json"]?.schema) {
          const schema = op.requestBody.content["application/json"].schema;
          const typeName = pathKey.split("/").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "Request";
          const requestTypeName = `${typeName.charAt(0).toUpperCase() + typeName.slice(1)}Request`;
          
          if (!responseTypes.has(requestTypeName)) {
            responseTypes.set(requestTypeName, schema);
          }
        }
      }
    }
  }

  // Generate type definitions
  for (const [typeName, schema] of responseTypes.entries()) {
    const typeDef = schemaToType(schema, typeName);
    types.push(`export type ${typeName} = ${typeDef};\n`);
  }

  // Add common types that we know exist
  types.push(`
// Common response types
export type AddressResponse = {
  address: string;
  authenticator_type?: string;
};

export type CheckResponse = {
  address: string;
  codeId: number;
  authenticatorType: string;
};

export type CreateAccountResponseV2 = {
  account_address: string;
  code_id: number;
  transaction_hash: string;
};

// Request types
export type CreateEthWalletRequest = {
  address: string;
  signature: string;
};

export type CreateSecp256k1Request = {
  pubkey: string;
  signature: string;
};

export type CreateJWTRequest = {
  jwt: string;
  auth_payload: string;
};

// Account type
export type AccountType = "ethwallet" | "secp256k1" | "jwt";

// Error response
export type ErrorResponse = {
  error: {
    message: string;
    errors?: Array<{ message: string }>;
  };
};
`);

  await writeFile(outputFile, types.join("\n"), "utf-8");
  console.log(`✅ Types generated manually: ${outputFile}`);
}

/**
 * Write metadata file
 */
async function writeMetadata(schema: any, baseUrl: string, targetEnv: string): Promise<void> {
  const metadata = {
    generated_at: new Date().toISOString(),
    schema_version: schema.info?.version || "unknown",
    schema_title: schema.info?.title || "AA API",
    schema_url: `${baseUrl}/openapi.json`,
    source_env: targetEnv,
  };

  await writeFile(METADATA_FILE, JSON.stringify(metadata, null, 2), "utf-8");
  console.log(`✅ Metadata written: ${METADATA_FILE}`);
}

async function main() {
  const targetEnv = process.argv[2] || "testnet";
  const baseUrl = AA_API_URLS[targetEnv as keyof typeof AA_API_URLS] || targetEnv;

  console.log(`🚀 Generating AA API types for: ${targetEnv}`);
  console.log(`📍 Base URL: ${baseUrl}\n`);

  try {
    // Create output directory
    if (!existsSync(OUTPUT_DIR)) {
      await mkdir(OUTPUT_DIR, { recursive: true });
      console.log(`📁 Created output directory: ${OUTPUT_DIR}`);
    }

    // Fetch schema
    const schema = await fetchSchema(baseUrl);
    console.log();

    // Generate types
    await generateTypes(schema, TYPES_FILE);
    console.log();

    // Write metadata
    await writeMetadata(schema, baseUrl, targetEnv);
    console.log();

    console.log(`✨ Type generation complete!`);
    console.log(`📦 Files generated:`);
    console.log(`   - ${TYPES_FILE}`);
    console.log(`   - ${METADATA_FILE}`);
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Review generated types`);
    console.log(`   2. Update signers/src/types/api.ts to import from ./generated/api`);
    console.log(`   3. Run 'pnpm build' to verify types compile correctly`);

  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();

