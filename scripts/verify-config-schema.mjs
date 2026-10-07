#!/usr/bin/env bun
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const schemasPath = join(rootDir, "schemas", "config-fields.json");

if (!existsSync(schemasPath)) {
  console.error("❌ Schema file missing: schemas/config-fields.json");
  process.exit(1);
}

const schemaData = JSON.parse(readFileSync(schemasPath, "utf-8"));
const validFields = new Set(Object.keys(schemaData.fields));

console.log(
  `🔍 Loaded ${validFields.size} canonical config fields from schema.`,
);

function getMarkdownFiles(dir) {
  let results = [];
  if (!existsSync(dir)) return results;
  const list = readdirSync(dir);
  for (const file of list) {
    const fullPath = join(dir, file);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getMarkdownFiles(fullPath));
    } else if (file.endsWith(".md")) {
      results.push(fullPath);
    }
  }
  return results;
}

const configDocsDir = join(rootDir, "en", "configuration");
const mdFiles = getMarkdownFiles(configDocsDir);

let errors = 0;
let checkedCount = 0;

for (const filePath of mdFiles) {
  const content = readFileSync(filePath, "utf-8");
  // Match configuration keys formatted like: | `foo.bar` | or `CONFIG: foo.bar` or ### `foo.bar`
  const fieldMatches = content.matchAll(
    /(?:\||\#\#\#|\`)\s*\`([a-z0-9_]+(?:\.[a-z0-9_]+)+)\`/g,
  );

  for (const match of fieldMatches) {
    const fieldName = match[1];
    checkedCount++;
    if (!validFields.has(fieldName)) {
      console.error(
        `❌ [Anti-Drift Error] Unknown or stale configuration field '${fieldName}' in ${filePath}`,
      );
      errors++;
    }
  }
}

if (errors > 0) {
  console.error(
    `\n💥 Verification failed with ${errors} error(s). Documented configuration fields must exist in schema.`,
  );
  process.exit(1);
}

console.log(
  `✅ Verified ${checkedCount} configuration field occurrences across ${mdFiles.length} file(s). All fields exist in canonical schema.`,
);
