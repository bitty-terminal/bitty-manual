#!/usr/bin/env bun
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, dirname, relative } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const distDir = join(rootDir, "dist");
const distManualDir = join(distDir, "manual");

const isDryRun = process.argv.includes("--dry-run");
const bucketName = process.env.R2_BUCKET || "bitty";
const r2Prefix = process.env.R2_PREFIX || "manual";

if (!existsSync(distManualDir)) {
  console.error(
    "❌ dist/manual directory does not exist. Run 'bun scripts/package-manual.mjs' first.",
  );
  process.exit(1);
}

const manifest = JSON.parse(
  readFileSync(join(distManualDir, "manifest.json"), "utf-8"),
);
const version = manifest.version || "0.1.0";

console.log(
  `🚀 [bitty-manual R2 Upload] Target bucket: '${bucketName}', Prefix: '${r2Prefix}/', Mode: ${isDryRun ? "DRY-RUN" : "LIVE"}`,
);

function getContentType(filePath) {
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".md")) return "text/markdown; charset=utf-8";
  if (filePath.endsWith(".tar.gz")) return "application/gzip";
  if (filePath.endsWith(".zip")) return "application/zip";
  if (filePath.endsWith(".txt")) return "text/plain; charset=utf-8";
  return "application/octet-stream";
}

function getCacheControl(r2Key) {
  // Versioned artifacts are immutable
  if (r2Key.includes(`-${version}.`) || r2Key.includes(`/v${version}/`)) {
    return "public, max-age=31536000, immutable";
  }
  // Latest pointers and content can be updated
  return "public, max-age=300, s-maxage=3600";
}

function collectFiles(dir, baseDir) {
  let results = [];
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(collectFiles(fullPath, baseDir));
    } else {
      results.push({
        localPath: fullPath,
        relPath: relative(baseDir, fullPath).replace(/\\/g, "/"),
      });
    }
  }
  return results;
}

// 1. Files inside dist/manual/ -> manual/<relPath> and manual/latest/<relPath>
const manualFiles = collectFiles(distManualDir, distManualDir);

// 2. Root archive bundles in dist/ -> manual/<filename>
const rootArchives = [
  "bitty-manual-latest.tar.gz",
  `bitty-manual-${version}.tar.gz`,
  "bitty-manual-latest.zip",
  `bitty-manual-${version}.zip`,
  "SHA256SUMS.txt",
]
  .filter((f) => existsSync(join(distDir, f)))
  .map((f) => ({
    localPath: join(distDir, f),
    relPath: f,
  }));

const uploadQueue = [];

// Enqueue individual manual content (markdown, JSON, etc.)
for (const item of manualFiles) {
  const ct = getContentType(item.localPath);
  uploadQueue.push({
    localPath: item.localPath,
    r2Key: `${r2Prefix}/${item.relPath}`,
    contentType: ct,
  });
  uploadQueue.push({
    localPath: item.localPath,
    r2Key: `${r2Prefix}/latest/${item.relPath}`,
    contentType: ct,
  });
}

// Enqueue root archives
for (const item of rootArchives) {
  const ct = getContentType(item.localPath);
  uploadQueue.push({
    localPath: item.localPath,
    r2Key: `${r2Prefix}/${item.relPath}`,
    contentType: ct,
  });
}

console.log(`📋 Total objects to upload: ${uploadQueue.length}`);

let uploadedCount = 0;
let failedCount = 0;

let wranglerBin = "wrangler";
try {
  execSync("wrangler --version", { stdio: "ignore" });
} catch {
  wranglerBin = "bunx --bun wrangler@4.135.0";
}

for (const task of uploadQueue) {
  const destination = `${bucketName}/${task.r2Key}`;
  const cacheControl = getCacheControl(task.r2Key);
  const cmd = `${wranglerBin} r2 object put "${destination}" --file "${task.localPath}" --content-type "${task.contentType}" --cache-control "${cacheControl}" -y`;

  if (isDryRun) {
    console.log(`[DRY-RUN] Would upload: ${task.r2Key} (${task.contentType})`);
    uploadedCount++;
  } else {
    try {
      console.log(`Uploading: ${task.r2Key}...`);
      execSync(cmd, { stdio: "inherit" });
      uploadedCount++;
    } catch (err) {
      console.error(`❌ Failed to upload ${task.r2Key}:`, err);
      failedCount++;
    }
  }
}

console.log(
  `\n🏁 Upload summary: ${uploadedCount} succeeded, ${failedCount} failed.`,
);
if (failedCount > 0) {
  process.exit(1);
}
