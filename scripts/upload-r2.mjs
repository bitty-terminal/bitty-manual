#!/usr/bin/env bun
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, dirname, relative } from "path";
import { fileURLToPath } from "url";
import { execFile, execFileSync } from "child_process";
import { promisify } from "util";

import { createHash } from "crypto";

import {
  decideVersionedWrite,
  isMissingKeyError,
  isVersionedKey,
} from "./version-guard.mjs";

const execFileAsync = promisify(execFile);

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const distDir = join(rootDir, "dist");
const distManualDir = join(distDir, "manual");

const isDryRun = process.argv.includes("--dry-run");
const bucketName = process.env.R2_BUCKET || "bitty";
const r2Prefix = process.env.R2_PREFIX || "manual";
const CONCURRENCY = parseInt(process.env.UPLOAD_CONCURRENCY || "4", 10);

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
const locales = manifest.locales || ["en"];
const packageName =
  (manifest.distribution && manifest.distribution.package) || "bitty-manual";

console.log(
  `🚀 [bitty-manual R2 Upload] Target bucket: '${bucketName}', Prefix: '${r2Prefix}/', Mode: ${isDryRun ? "DRY-RUN" : "LIVE (REMOTE)"}, Concurrency: ${CONCURRENCY}`,
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

// 1. Files inside dist/manual/ -> canonical manual/<package>/<relPath> plus
// legacy compat manual/<relPath> and manual/latest/<relPath> (dual-publish;
// legacy sunset is documented in README.md).
const manualFiles = collectFiles(distManualDir, distManualDir);

// 2. Root archive bundles in dist/ -> manual/<filename> (legacy compat only;
// the canonical bundles are the per-locale sets in section 3).
const rootArchives = [
  "bitty-manual-latest.tar.gz",
  `bitty-manual-${version}.tar.gz`,
  "bitty-manual-latest.zip",
  `bitty-manual-${version}.zip`,
  "SHA256SUMS.txt",
];
for (const locale of manifest.locales || ["en"]) {
  rootArchives.push(
    `bitty-manual-${locale}-latest.tar.gz`,
    `bitty-manual-${version}-${locale}.tar.gz`,
    `bitty-manual-${locale}-latest.zip`,
    `bitty-manual-${version}-${locale}.zip`,
  );
}
const rootArchiveQueue = rootArchives
  .filter((f) => existsSync(join(distDir, f)))
  .map((f) => ({
    localPath: join(distDir, f),
    relPath: f,
  }));

// 3. Per-locale bundles in dist/ -> canonical per-package keys with
// immutable versioned copies (manual/<package>/v<version>/ is long-cached).
const packageArchives = [];
for (const locale of locales) {
  const pairs = [
    [`bitty-manual-${locale}-latest.tar.gz`, `${locale}.tar.gz`],
    [`bitty-manual-${locale}-latest.zip`, `${locale}.zip`],
    [
      `bitty-manual-${locale}-${version}.tar.gz`,
      `v${version}/${locale}.tar.gz`,
    ],
    [`bitty-manual-${locale}-${version}.zip`, `v${version}/${locale}.zip`],
  ];
  for (const [filename, keySuffix] of pairs) {
    if (existsSync(join(distDir, filename))) {
      packageArchives.push({
        localPath: join(distDir, filename),
        relPath: keySuffix,
      });
    }
  }
}

// 4. Immutable versioned index copies alongside the per-locale bundles.
const versionedIndexes = ["manifest.json", "search-index.json", "toc.json"]
  .filter((f) => existsSync(join(distManualDir, f)))
  .map((f) => ({
    localPath: join(distManualDir, f),
    relPath: `v${version}/${f}`,
  }));

const uploadQueue = [];

// Enqueue canonical per-package manual content (markdown, JSON, etc.)
for (const item of manualFiles) {
  const ct = getContentType(item.localPath);
  uploadQueue.push({
    localPath: item.localPath,
    r2Key: `${r2Prefix}/${packageName}/${item.relPath}`,
    contentType: ct,
  });
  // Legacy compat copies (dual-publish until the documented sunset).
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

// Enqueue legacy root archives (compat only).
for (const item of rootArchiveQueue) {
  const ct = getContentType(item.localPath);
  uploadQueue.push({
    localPath: item.localPath,
    r2Key: `${r2Prefix}/${item.relPath}`,
    contentType: ct,
  });
}

// Enqueue canonical per-locale bundles + versioned index copies.
for (const item of packageArchives.concat(versionedIndexes)) {
  const ct = getContentType(item.localPath);
  uploadQueue.push({
    localPath: item.localPath,
    r2Key: `${r2Prefix}/${packageName}/${item.relPath}`,
    contentType: ct,
  });
}

console.log(`📋 Total objects to upload: ${uploadQueue.length}`);

let uploadedCount = 0;
let failedCount = 0;

const WRANGLER_VERSION = process.env.WRANGLER_VERSION || "4.135.0";
if (!/^\d+\.\d+\.\d+$/.test(WRANGLER_VERSION)) {
  console.error(
    `❌ WRANGLER_VERSION must be a pinned x.y.z version (got ${JSON.stringify(process.env.WRANGLER_VERSION)}).`,
  );
  process.exit(1);
}

// Bounded retry budget; a bad value must fail loudly, never silently retry 0 times.
const UPLOAD_ATTEMPTS = (() => {
  const raw = process.env.UPLOAD_ATTEMPTS;
  if (raw === undefined || raw === "") return 3;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 10) {
    console.error(
      `❌ UPLOAD_ATTEMPTS must be an integer in 1..10 (got ${JSON.stringify(raw)}).`,
    );
    process.exit(1);
  }
  return n;
})();

// Resolve the wrangler CLI once, before any concurrent work starts.
// Spawning `bunx --bun wrangler@<version>` per object raced while linking the
// dependency tree in the shared bun cache and failed random uploads with
// `EEXIST` (bitty-manual#34), so install it once and call the resolved binary.
function resolveWranglerBin() {
  try {
    execFileSync("wrangler", ["--version"], { stdio: "ignore" });
    return "wrangler";
  } catch {
    execFileSync(
      "bun",
      ["install", "--global", `wrangler@${WRANGLER_VERSION}`],
      { stdio: "inherit" },
    );
    const binDir = execFileSync("bun", ["pm", "bin", "-g"], {
      encoding: "utf-8",
    }).trim();
    return join(binDir, "wrangler");
  }
}

const wranglerBin = isDryRun ? "wrangler" : resolveWranglerBin();

async function uploadTask(task) {
  const destination = `${bucketName}/${task.r2Key}`;
  const cacheControl = getCacheControl(task.r2Key);
  const args = [
    "r2",
    "object",
    "put",
    destination,
    "--file",
    task.localPath,
    "--content-type",
    task.contentType,
    "--cache-control",
    cacheControl,
    "--remote",
    "-y",
  ];

  if (isDryRun) {
    console.log(`[DRY-RUN] Would upload: ${task.r2Key} (${task.contentType})`);
    uploadedCount++;
    return;
  }

  let lastError = null;
  for (let attempt = 1; attempt <= UPLOAD_ATTEMPTS; attempt++) {
    try {
      const label =
        attempt > 1 ? ` (attempt ${attempt}/${UPLOAD_ATTEMPTS})` : "";
      console.log(`Uploading: ${task.r2Key}${label}...`);
      await execFileAsync(wranglerBin, args);
      uploadedCount++;
      return;
    } catch (err) {
      lastError = err;
      if (attempt < UPLOAD_ATTEMPTS) {
        // Bounded backoff for transient CLI or network failures.
        await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
      }
    }
  }
  console.error(
    `❌ Failed to upload ${task.r2Key}:`,
    lastError && lastError.message ? lastError.message : lastError,
  );
  failedCount++;
}

async function runPool(items, limit) {
  let idx = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (idx < items.length) {
        const item = items[idx++];
        await uploadTask(item);
      }
    },
  );
  await Promise.all(workers);
}

// ---------------------------------------------------------------------------
// Retired-key prune (CTX-1580)
//
// Uploading is add-only: when a published raw key is renamed or removed from
// the source tree, the pipeline stops writing it but the previously uploaded
// object stays in the bucket and keeps serving a stale copy to the CDN. The
// list below deletes those retired keys deterministically after every
// successful upload so the bucket reflects the current manual tree.
//
// Every entry is verifiable against git history: the catalog split
// (#28, commit 06a7014) moved the source files, so the pre-split raw keys no
// longer exist in the source tree:
//   en/extensions/activity.md          -> en/plugins/catalog/activity.md
//   en/plugins/upstream-components.md  -> en/extensions/upstream-components.md
//   en/extensions/statusline.md        -> en/plugins/catalog/statusline.md
//
// Retired raw keys; the deploy-time R2 key becomes `${r2Prefix}/<relPath>`.
const RETIRED_RAW_KEYS = [
  "en/extensions/activity.md",
  "en/plugins/upstream-components.md",
  "en/extensions/statusline.md",
];

// Refuse to prune a key whose source path exists again: such a key would be
// re-uploaded by this very run, so removing it is never safe.
function collectRetiredKeys() {
  const live = RETIRED_RAW_KEYS.filter((relPath) =>
    existsSync(join(rootDir, relPath)),
  );
  if (live.length > 0) {
    console.error(
      `❌ Retired-key list is stale: these source paths exist again and must be removed from RETIRED_RAW_KEYS before pruning: ${live.join(", ")}.`,
    );
    process.exit(1);
  }
  return RETIRED_RAW_KEYS.map((relPath) => `${r2Prefix}/${relPath}`);
}

// A delete must not resurrect the failedCount > 0 path when the object is
// already gone: the required end state is absence, so "not found" is success.
// execFileAsync puts only the command line in the error message; the actual
// error output (e.g. "404 NoSuchKey") lands in `stderr`/`stdout`.
function isAlreadyMissing(err) {
  const text = [err.message, err.stderr, err.stdout].filter(Boolean).join("\n");
  return /(404|no\s*such\s*key|nosuchkey|key\s+not\s+found|object\s+not\s+found|1004|11000)/i.test(
    text,
  );
}

async function pruneTask(r2Key) {
  const destination = `${bucketName}/${r2Key}`;
  let lastError = null;
  for (let attempt = 1; attempt <= UPLOAD_ATTEMPTS; attempt++) {
    try {
      const label =
        attempt > 1 ? ` (attempt ${attempt}/${UPLOAD_ATTEMPTS})` : "";
      console.log(`Pruning retired key: ${r2Key}${label}...`);
      await execFileAsync(wranglerBin, [
        "r2",
        "object",
        "delete",
        destination,
        "--remote",
        "-y",
      ]);
      console.log(`Pruned retired key: ${r2Key}`);
      return true;
    } catch (err) {
      if (isAlreadyMissing(err)) {
        console.log(`Retired key already absent: ${r2Key}`);
        return true;
      }
      lastError = err;
      if (attempt < UPLOAD_ATTEMPTS) {
        // Bounded backoff for transient CLI or network failures.
        await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
      }
    }
  }
  console.error(
    `❌ Failed to prune retired key ${r2Key}:`,
    lastError && lastError.message ? lastError.message : lastError,
  );
  return false;
}

const retiredKeys = collectRetiredKeys();

// ---------------------------------------------------------------------------
// Immutable version guard (bitty-manual#109)
//
// `v<version>/` keys are served `immutable` for a year and are pinned by
// downstream lock files, so a content change under an existing version leaves
// CDN edges disagreeing with each other. Refuse to replace a versioned object
// whose bytes differ; the fix is a `manifest.version` bump.
const versionedTargets = [
  ...new Map(
    uploadQueue
      .filter((task) => isVersionedKey(task.r2Key, version))
      .map((task) => [task.r2Key, task]),
  ).values(),
];

async function remoteSha256(r2Key) {
  try {
    const { stdout } = await execFileAsync(
      wranglerBin,
      ["r2", "object", "get", `${bucketName}/${r2Key}`, "--pipe", "--remote"],
      { encoding: "buffer", maxBuffer: 64 * 1024 * 1024 },
    );
    return createHash("sha256").update(stdout).digest("hex");
  } catch (err) {
    const message = `${err?.stderr ?? ""} ${err?.message ?? ""}`;
    if (isMissingKeyError(message)) {
      return null;
    }
    throw err;
  }
}

if (isDryRun) {
  console.log(
    `[DRY-RUN] Would verify ${versionedTargets.length} immutable versioned key(s)`,
  );
} else {
  for (const task of versionedTargets) {
    const localSha = createHash("sha256")
      .update(readFileSync(task.localPath))
      .digest("hex");
    const remoteSha = await remoteSha256(task.r2Key);
    const decision = decideVersionedWrite({ remoteSha, localSha });
    if (decision === "reject") {
      console.error(
        `\u274c ${task.r2Key} already exists with different bytes ` +
          `(remote ${remoteSha.slice(0, 12)}\u2026, local ${localSha.slice(0, 12)}\u2026). ` +
          "Versioned keys are immutable: bump manifest.version and re-run.",
      );
      process.exit(1);
    }
    console.log(
      `${decision === "idempotent" ? "=" : "+"} ${task.r2Key} (${decision})`,
    );
  }
}

await runPool(uploadQueue, isDryRun ? 1 : CONCURRENCY);

console.log(
  `\n🏁 Upload summary: ${uploadedCount} succeeded, ${failedCount} failed.`,
);
if (failedCount > 0) {
  console.error(
    "❌ Skipping the retired-key prune because the upload had failures.",
  );
  process.exit(1);
}

if (isDryRun) {
  console.log(
    `[DRY-RUN] Would prune ${retiredKeys.length} retired key(s) with ` +
      `'wrangler r2 object delete': ${retiredKeys.join(", ")}`,
  );
} else {
  let pruningFailed = 0;
  for (const retiredKey of retiredKeys) {
    const ok = await pruneTask(retiredKey);
    if (!ok) pruningFailed++;
  }
  if (pruningFailed > 0) {
    console.error(
      `❌ Retired-key prune failed for ${pruningFailed} of ${retiredKeys.length} key(s).`,
    );
    process.exit(1);
  }
  console.log(
    `🏁 Retired-key prune complete: ${retiredKeys.length} key(s) pruned.`,
  );
}
