#!/usr/bin/env tsx

import { SecurityManager } from "../src/lib/security";

console.log("🔑 Generating encryption key...");

const key = SecurityManager.generateEncryptionKey();

console.log("\n✅ Generated encryption key:");
console.log(key);
console.log("\n📝 Add this to your .env file:");
console.log(`ENCRYPTION_KEY="${key}"`);
console.log(
  "\n⚠️  Keep this key secure and never commit it to version control!",
);
